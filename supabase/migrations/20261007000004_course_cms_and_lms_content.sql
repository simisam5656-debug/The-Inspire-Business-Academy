-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 004: Online Course CMS + LMS Content Foundation (Phase 6)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Custom Types for Course CMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_status') THEN
        CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
        CREATE TYPE resource_type AS ENUM ('note', 'prompt', 'tool', 'document', 'link');
    END IF;
END $$;

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    short_description TEXT NOT NULL,
    short_description_roman_urdu TEXT,
    full_description TEXT,
    full_description_roman_urdu TEXT,
    thumbnail_url TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    duration_value INT NOT NULL DEFAULT 6 CHECK (duration_value > 0),
    duration_unit TEXT NOT NULL DEFAULT 'months' CHECK (duration_unit IN ('weeks', 'months', 'hours')),
    category TEXT NOT NULL DEFAULT 'business',
    category_label TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    status course_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_featured_order ON public.courses(is_featured, display_order);

-- 3. Course Modules Table
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT,
    description_roman_urdu TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_modules_course_order ON public.course_modules(course_id, display_order);

-- 4. Course Lessons Table
-- Uses YouTube Unlisted Embed IDs by default (canonical 11-char ID or sanitized embed reference)
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT,
    youtube_video_id TEXT, -- validated 11-char YouTube ID (e.g., dQw4w9WgXcQ)
    duration_minutes INT DEFAULT 0 CHECK (duration_minutes >= 0),
    display_order INT NOT NULL DEFAULT 1,
    is_free_preview BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON public.course_lessons(module_id, display_order);

-- 5. Lesson Resources Table
-- Structured resources: notes, prompt examples, tools, links, documents
CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_type resource_type NOT NULL DEFAULT 'note',
    description TEXT,
    content_text TEXT, -- For notes, full prompt texts, instructions
    external_url TEXT, -- Validated tools or links
    storage_path TEXT, -- If private Supabase Storage document attached
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resources_lesson_order ON public.lesson_resources(lesson_id, display_order);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - PRD SECTION 8 & PHASE 6 ENFORCEMENT
-- ==============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Helper to check manager permission for 'courses'
CREATE OR REPLACE FUNCTION public.can_manage_courses()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND (
            p.role = 'super_admin'
            OR (
                p.role = 'manager'
                AND EXISTS (
                    SELECT 1 FROM public.manager_permissions mp
                    WHERE mp.profile_id = p.id AND mp.permission_key = 'courses'
                )
            )
          )
    );
$$;

-- ------------------------------------------------------------------------------
-- 1. Courses Policies
-- ------------------------------------------------------------------------------

-- Public (anonymous or authenticated) can view ONLY published non-archived courses
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses"
    ON public.courses
    FOR SELECT
    USING (status = 'published');

-- Authorized staff (Super Admin or Manager with 'courses' permission) can view all courses (including draft/archived)
DROP POLICY IF EXISTS "Staff can view all courses" ON public.courses;
CREATE POLICY "Staff can view all courses"
    ON public.courses
    FOR SELECT
    USING (public.can_manage_courses());

-- Authorized staff can insert courses
DROP POLICY IF EXISTS "Staff can insert courses" ON public.courses;
CREATE POLICY "Staff can insert courses"
    ON public.courses
    FOR INSERT
    WITH CHECK (public.can_manage_courses());

-- Authorized staff can update courses
DROP POLICY IF EXISTS "Staff can update courses" ON public.courses;
CREATE POLICY "Staff can update courses"
    ON public.courses
    FOR UPDATE
    USING (public.can_manage_courses())
    WITH CHECK (public.can_manage_courses());

-- Super Admin can delete courses (soft-archive preferred in application UI)
DROP POLICY IF EXISTS "Super admin can delete courses" ON public.courses;
CREATE POLICY "Super admin can delete courses"
    ON public.courses
    FOR DELETE
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 2. Course Modules Policies
-- ------------------------------------------------------------------------------

-- Authorized staff can read, insert, update, delete course modules
DROP POLICY IF EXISTS "Staff can manage course modules" ON public.course_modules;
CREATE POLICY "Staff can manage course modules"
    ON public.course_modules
    FOR ALL
    USING (public.can_manage_courses())
    WITH CHECK (public.can_manage_courses());

-- Public / Students can view published modules ONLY if parent course is published
DROP POLICY IF EXISTS "Users can view published modules of published courses" ON public.course_modules;
CREATE POLICY "Users can view published modules of published courses"
    ON public.course_modules
    FOR SELECT
    USING (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_modules.course_id AND c.status = 'published'
        )
    );

-- ------------------------------------------------------------------------------
-- 3. Course Lessons Policies
-- ------------------------------------------------------------------------------

-- Authorized staff can view, insert, update, delete course lessons
DROP POLICY IF EXISTS "Staff can manage course lessons" ON public.course_lessons;
CREATE POLICY "Staff can manage course lessons"
    ON public.course_lessons
    FOR ALL
    USING (public.can_manage_courses())
    WITH CHECK (public.can_manage_courses());

-- Future Phase 7 will add student active enrollment access to lessons.
-- For Phase 6: Public/Students can only view free preview lessons of published courses.
DROP POLICY IF EXISTS "Public can view free preview lessons of published courses" ON public.course_lessons;
CREATE POLICY "Public can view free preview lessons of published courses"
    ON public.course_lessons
    FOR SELECT
    USING (
        is_published = true AND
        is_free_preview = true AND
        EXISTS (
            SELECT 1 FROM public.course_modules m
            JOIN public.courses c ON c.id = m.course_id
            WHERE m.id = course_lessons.module_id AND c.status = 'published'
        )
    );

-- ------------------------------------------------------------------------------
-- 4. Lesson Resources Policies
-- ------------------------------------------------------------------------------

-- Authorized staff can manage all lesson resources
DROP POLICY IF EXISTS "Staff can manage lesson resources" ON public.lesson_resources;
CREATE POLICY "Staff can manage lesson resources"
    ON public.lesson_resources
    FOR ALL
    USING (public.can_manage_courses())
    WITH CHECK (public.can_manage_courses());

-- Free preview resources viewable only if parent lesson is free preview
DROP POLICY IF EXISTS "Public can view preview lesson resources" ON public.lesson_resources;
CREATE POLICY "Public can view preview lesson resources"
    ON public.lesson_resources
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_lessons l
            WHERE l.id = lesson_resources.lesson_id AND l.is_free_preview = true AND l.is_published = true
        )
    );
