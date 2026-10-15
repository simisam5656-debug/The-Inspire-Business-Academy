-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY — COMPLETE DATABASE SETUP (ALL-IN-ONE)
-- Target: Supabase PostgreSQL
-- Description: Run this file in Supabase Dashboard > SQL Editor to setup all tables,
--              security policies (RLS), storage buckets, triggers, and seed data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CUSTOM TYPES & ENUMS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'manager', 'online_student');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_status') THEN
        CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
        CREATE TYPE resource_type AS ENUM ('note', 'prompt', 'tool', 'document', 'link');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. FOUNDATION: PROFILES, PERMISSIONS, AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'online_student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TABLE IF NOT EXISTS public.manager_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    granted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(profile_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_manager_permissions_profile ON public.manager_permissions(profile_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    actor_role user_role NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Security helpers
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'manager') AND is_active = true
    );
$$;

-- RLS: Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Super admin can manage profiles" ON public.profiles;
CREATE POLICY "Super admin can manage profiles" ON public.profiles FOR ALL USING (public.is_super_admin());

-- RLS: Manager Permissions
ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin can manage manager permissions" ON public.manager_permissions;
CREATE POLICY "Super admin can manage manager permissions" ON public.manager_permissions FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Managers can read own permissions" ON public.manager_permissions;
CREATE POLICY "Managers can read own permissions" ON public.manager_permissions FOR SELECT USING (auth.uid() = profile_id);

-- RLS: Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can read audit logs" ON public.audit_logs FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Automatic Profile Creation Trigger from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        is_active
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
        NULLIF(TRIM(new.raw_user_meta_data->>'phone'), ''),
        'online_student'::public.user_role,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = timezone('utc'::text, now());

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. STORAGE BUCKETS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('payment-proofs', 'payment-proofs', false, 524288, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('assignment-submissions', 'assignment-submissions', false, 15728640, ARRAY['application/pdf', 'application/zip', 'image/jpeg', 'image/png', 'text/plain']),
    ('certificate-files', 'certificate-files', false, 5242880, ARRAY['application/pdf', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their own payment proof" ON storage.objects;
CREATE POLICY "Users can upload their own payment proof" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view their own payment proof" ON storage.objects;
CREATE POLICY "Users can view their own payment proof" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Staff can view all payment proofs" ON storage.objects;
CREATE POLICY "Staff can view all payment proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_staff());

DROP POLICY IF EXISTS "Students can upload assignment submissions" ON storage.objects;
CREATE POLICY "Students can upload assignment submissions" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Students can read their own assignment submissions" ON storage.objects;
CREATE POLICY "Students can read their own assignment submissions" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Staff can view all assignment submissions" ON storage.objects;
CREATE POLICY "Staff can view all assignment submissions" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-submissions' AND public.is_staff());

-- ------------------------------------------------------------------------------
-- 4. ADMISSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    admission_type TEXT NOT NULL CHECK (admission_type IN ('physical', 'online')),
    full_name TEXT NOT NULL,
    guardian_name TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    city TEXT NOT NULL DEFAULT 'Sadiqabad',
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    batch_preference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admissions_ref ON public.admissions(reference_number);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions(phone);
CREATE INDEX IF NOT EXISTS idx_admissions_email ON public.admissions(email);
CREATE INDEX IF NOT EXISTS idx_admissions_user_id ON public.admissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admissions_type ON public.admissions(admission_type);
CREATE INDEX IF NOT EXISTS idx_admissions_created_at ON public.admissions(created_at DESC);

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view all admissions" ON public.admissions;
CREATE POLICY "Staff can view all admissions" ON public.admissions FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can update admissions" ON public.admissions;
CREATE POLICY "Staff can update admissions" ON public.admissions FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can delete admissions" ON public.admissions;
CREATE POLICY "Super admin can delete admissions" ON public.admissions FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Students can view own admissions" ON public.admissions;
CREATE POLICY "Students can view own admissions" ON public.admissions FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Public and users can submit pending admission" ON public.admissions;
CREATE POLICY "Public and users can submit pending admission" ON public.admissions FOR INSERT WITH CHECK (
    status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND admin_notes IS NULL
);

-- ------------------------------------------------------------------------------
-- 5. PHYSICAL ACADEMY OPERATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.physical_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    batch_title TEXT DEFAULT 'Regular Batch',
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_fee >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'left')),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_physical_students_code ON public.physical_students(student_id_code);
CREATE INDEX IF NOT EXISTS idx_physical_students_course ON public.physical_students(course_slug);
CREATE INDEX IF NOT EXISTS idx_physical_students_status ON public.physical_students(status);
CREATE INDEX IF NOT EXISTS idx_physical_students_phone ON public.physical_students(phone);
CREATE INDEX IF NOT EXISTS idx_physical_students_admission ON public.physical_students(admission_id);

CREATE TABLE IF NOT EXISTS public.physical_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.physical_students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
    notes TEXT,
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_physical_attendance_student_date UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_physical_attendance_date ON public.physical_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_student ON public.physical_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_status ON public.physical_attendance(status);

CREATE TABLE IF NOT EXISTS public.physical_fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.physical_students(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
    reference_note TEXT,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.physical_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON public.physical_fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON public.physical_fee_payments(receipt_number);

CREATE TABLE IF NOT EXISTS public.academy_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'lab_equipment', 'stationery', 'refreshment', 'marketing', 'salary', 'maintenance', 'other')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    receipt_reference TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_academy_expenses_date ON public.academy_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_academy_expenses_category ON public.academy_expenses(category);

-- RLS: Physical Academy
ALTER TABLE public.physical_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view physical students" ON public.physical_students;
CREATE POLICY "Staff can view physical students" ON public.physical_students FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert physical students" ON public.physical_students;
CREATE POLICY "Staff can insert physical students" ON public.physical_students FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update physical students" ON public.physical_students;
CREATE POLICY "Staff can update physical students" ON public.physical_students FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can delete physical students" ON public.physical_students;
CREATE POLICY "Super admin can delete physical students" ON public.physical_students FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can view physical attendance" ON public.physical_attendance FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can mark physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can mark physical attendance" ON public.physical_attendance FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can update physical attendance" ON public.physical_attendance FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can delete physical attendance" ON public.physical_attendance;
CREATE POLICY "Super admin can delete physical attendance" ON public.physical_attendance FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Staff can view physical fee payments" ON public.physical_fee_payments FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can record physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Staff can record physical fee payments" ON public.physical_fee_payments FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can update physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Super admin can update physical fee payments" ON public.physical_fee_payments FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Super admin can delete physical fee payments" ON public.physical_fee_payments FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can view expenses" ON public.academy_expenses;
CREATE POLICY "Staff can view expenses" ON public.academy_expenses FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can record expenses" ON public.academy_expenses;
CREATE POLICY "Staff can record expenses" ON public.academy_expenses FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can update expenses" ON public.academy_expenses;
CREATE POLICY "Super admin can update expenses" ON public.academy_expenses FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete expenses" ON public.academy_expenses;
CREATE POLICY "Super admin can delete expenses" ON public.academy_expenses FOR DELETE USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 6. ONLINE COURSE CMS & LMS CONTENT
-- ------------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT,
    youtube_video_id TEXT,
    duration_minutes INT DEFAULT 0 CHECK (duration_minutes >= 0),
    display_order INT NOT NULL DEFAULT 1,
    is_free_preview BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON public.course_lessons(module_id, display_order);

CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_type resource_type NOT NULL DEFAULT 'note',
    description TEXT,
    content_text TEXT,
    external_url TEXT,
    storage_path TEXT,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resources_lesson_order ON public.lesson_resources(lesson_id, display_order);

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

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses" ON public.courses FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Staff can view all courses" ON public.courses;
CREATE POLICY "Staff can view all courses" ON public.courses FOR SELECT USING (public.can_manage_courses());

DROP POLICY IF EXISTS "Staff can insert courses" ON public.courses;
CREATE POLICY "Staff can insert courses" ON public.courses FOR INSERT WITH CHECK (public.can_manage_courses());

DROP POLICY IF EXISTS "Staff can update courses" ON public.courses;
CREATE POLICY "Staff can update courses" ON public.courses FOR UPDATE USING (public.can_manage_courses()) WITH CHECK (public.can_manage_courses());

DROP POLICY IF EXISTS "Super admin can delete courses" ON public.courses;
CREATE POLICY "Super admin can delete courses" ON public.courses FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can manage course modules" ON public.course_modules;
CREATE POLICY "Staff can manage course modules" ON public.course_modules FOR ALL USING (public.can_manage_courses()) WITH CHECK (public.can_manage_courses());

DROP POLICY IF EXISTS "Users can view published modules of published courses" ON public.course_modules;
CREATE POLICY "Users can view published modules of published courses" ON public.course_modules FOR SELECT USING (
    is_published = true AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id AND c.status = 'published')
);

DROP POLICY IF EXISTS "Staff can manage course lessons" ON public.course_lessons;
CREATE POLICY "Staff can manage course lessons" ON public.course_lessons FOR ALL USING (public.can_manage_courses()) WITH CHECK (public.can_manage_courses());

DROP POLICY IF EXISTS "Public can view free preview lessons of published courses" ON public.course_lessons;
CREATE POLICY "Public can view free preview lessons of published courses" ON public.course_lessons FOR SELECT USING (
    is_published = true AND is_free_preview = true AND EXISTS (
        SELECT 1 FROM public.course_modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = course_lessons.module_id AND c.status = 'published'
    )
);

DROP POLICY IF EXISTS "Staff can manage lesson resources" ON public.lesson_resources;
CREATE POLICY "Staff can manage lesson resources" ON public.lesson_resources FOR ALL USING (public.can_manage_courses()) WITH CHECK (public.can_manage_courses());

DROP POLICY IF EXISTS "Public can view preview lesson resources" ON public.lesson_resources;
CREATE POLICY "Public can view preview lesson resources" ON public.lesson_resources FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.course_lessons l
        WHERE l.id = lesson_resources.lesson_id AND l.is_free_preview = true AND l.is_published = true
    )
);

-- ------------------------------------------------------------------------------
-- 7. STUDENT LMS PORTAL (PHASE 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
    last_accessed_at TIMESTAMPTZ,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.student_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.student_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.student_enrollments(status);

CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    last_played_seconds INT NOT NULL DEFAULT 0 CHECK (last_played_seconds >= 0),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.student_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON public.student_lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.student_lesson_progress(lesson_id);

CREATE TABLE IF NOT EXISTS public.student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_student_notes_user_lesson ON public.student_notes(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS public.student_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0),
    max_score INT NOT NULL CHECK (max_score > 0),
    passed BOOLEAN NOT NULL DEFAULT false,
    user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.student_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON public.student_quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON public.student_quiz_attempts(course_id);

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.student_enrollments;
CREATE POLICY "Students can view their own enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all student enrollments" ON public.student_enrollments;
CREATE POLICY "Staff can view all student enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage student enrollments" ON public.student_enrollments;
CREATE POLICY "Staff can manage student enrollments" ON public.student_enrollments FOR ALL TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Students can view their own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Students can view their own lesson progress" ON public.student_lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert or update own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Students can insert or update own lesson progress" ON public.student_lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all student lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Staff can view all student lesson progress" ON public.student_lesson_progress FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Students can manage own personal notes" ON public.student_notes;
CREATE POLICY "Students can manage own personal notes" ON public.student_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can view and submit own quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can view and submit own quiz attempts" ON public.student_quiz_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Staff can view all quiz attempts" ON public.student_quiz_attempts FOR SELECT TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 8. SEED DATA: OFFICIAL IBA COURSES CATALOG
-- ------------------------------------------------------------------------------
INSERT INTO public.courses (
    slug, title, title_roman_urdu, short_description, short_description_roman_urdu,
    full_description, price, duration_value, duration_unit, category, category_label, is_featured, display_order, status
)
VALUES
    (
        'youtube-monetization',
        'YouTube Monetization',
        'YouTube Monetization',
        'Master channel creation, niche selection, content strategy, video optimization, and revenue generation.',
        'Channel banayein, content strategy, video SEO, aur YouTube se halal aur mustaqil kamai ke usool seekhein.',
        'Comprehensive training on launching and monetizing successful YouTube channels. Covers niche validation, scriptwriting, editing workflows, thumbnail psychology, copyright safety, analytics, and multiple income streams (AdSense, sponsorships, affiliate).',
        5000.00, 6, 'months', 'business', 'Digital Business', true, 1, 'published'
    ),
    (
        'shopify-dropshipping',
        'Shopify Dropshipping & E-Commerce',
        'Shopify Dropshipping aur E-Commerce',
        'Build profitable e-commerce stores, find winning products, manage suppliers, and scale online sales.',
        'Shopify store banayein, winning products talash karein, suppliers se rabta karein aur online business barhayein.',
        'End-to-end e-commerce masterclass focusing on high-converting Shopify store development, supplier sourcing, local & international dropshipping logistics, conversion rate optimization, and order fulfillment systems.',
        5000.00, 6, 'months', 'business', 'E-Commerce', true, 2, 'published'
    ),
    (
        'digital-marketing-meta-ads',
        'Digital Marketing & Meta Ads',
        'Digital Marketing aur Meta Ads',
        'Master Facebook, Instagram, Google Ads, funnel marketing, audience targeting, and campaign analytics.',
        'Facebook, Instagram aur Google Ads ke zariye clients ke liye profitable marketing campaigns chalana seekhein.',
        'Practical performance marketing program. Learn to build high-converting sales funnels, design scroll-stopping creatives, target profitable audiences on Meta Ads Manager, manage budgets, analyze ROAS, and run client campaigns.',
        5000.00, 6, 'months', 'business', 'Marketing', true, 3, 'published'
    ),
    (
        'graphic-designing',
        'Graphic Designing & Brand Identity',
        'Graphic Designing aur Brand Identity',
        'Professional visual design using Adobe Photoshop, Illustrator, and Canva. Logo design, branding, and social media kits.',
        'Photoshop, Illustrator aur Canva ke zariye professional logos, banners aur branding materials design karein.',
        'From design fundamentals and color theory to client-ready branding deliverables. Master typography, social media design packs, print materials, UI assets, and freelancing portfolio presentation.',
        5000.00, 6, 'months', 'design', 'Creative Design', false, 4, 'published'
    ),
    (
        'video-editing-capcut-premiere',
        'Video Editing with Premiere Pro & CapCut',
        'Video Editing (Premiere Pro aur CapCut)',
        'Create cinematic Reels, TikToks, YouTube long-form videos, sound design, color grading, and viral hooks.',
        'YouTube videos, Instagram Reels aur TikToks ke liye professional video editing, sound effects aur color grading seekhein.',
        'Master the full video editing pipeline. From mobile-first viral CapCut editing to industry-standard Adobe Premiere Pro timeline workflows, keyframing, b-roll pacing, sound design, and subtitle automation.',
        5000.00, 6, 'months', 'design', 'Video Production', false, 5, 'published'
    ),
    (
        'web-development-mern',
        'Full Stack Web Development (MERN)',
        'Full Stack Web Development (MERN)',
        'Build modern dynamic web applications using MongoDB, Express, React, and Node.js with database integration.',
        'HTML, CSS, JavaScript, React aur Node.js ke zariye complete functional websites aur web apps banayein.',
        'Comprehensive software engineering track covering modern HTML5/CSS3, JavaScript (ES6+), React SPA development, REST APIs with Node.js/Express, MongoDB/PostgreSQL database models, and deployment.',
        5000.00, 6, 'months', 'development', 'Web & Software', false, 6, 'published'
    ),
    (
        'freelancing-upwork-fiverr',
        'Freelancing Mastery (Upwork & Fiverr)',
        'Freelancing Mastery (Fiverr aur Upwork)',
        'Convert your digital skills into international client contracts. Profile optimization, proposals, and pricing.',
        'Fiverr gig ranking, Upwork proposal writing aur international clients se direct deals close karne ke methods.',
        'Complete roadmap to freelancing success. Profile setup, gig SEO, winning proposal templates, client negotiation, project delivery workflows, feedback management, and withdrawal methods for Pakistani freelancers.',
        5000.00, 6, 'months', 'business', 'Freelancing', false, 7, 'published'
    ),
    (
        'ai-tools-chatgpt-mastery',
        'AI Tools & Automation for Business',
        'AI Tools aur Business Automation',
        'Supercharge productivity with ChatGPT, Midjourney, Claude, prompt engineering, and workflow automation.',
        'AI tools aur prompt engineering ke zariye apna rozmarra ka kaam aur business 10 guna taiz karein.',
        'Learn how to leverage generative AI models for real-world business tasks. Prompt engineering, content creation, automated customer responses, marketing copy, and AI-assisted coding/design workflows.',
        5000.00, 6, 'months', 'business', 'Artificial Intelligence', false, 8, 'published'
    ),
    (
        'cit-computer-information-technology',
        'CIT (Computer Information Technology)',
        'CIT (Computer Information Technology)',
        'Foundational IT skills: Windows, MS Office (Word, Excel, PowerPoint), InPage Urdu, internet, and typing mastery.',
        'Windows, MS Word, Excel, PowerPoint, InPage Urdu aur computer ke bunyadi tools ki mukammal training.',
        'Essential diploma curriculum covering office productivity tools, spreadsheet financial modeling, Urdu/English typing speed, internet research, email etiquette, hardware troubleshooting, and office computer operations.',
        5000.00, 6, 'months', 'office', 'Office & IT Skills', false, 9, 'published'
    ),
    (
        'spoken-english-communication',
        'Spoken English & Business Communication',
        'Spoken English aur Communication Skills',
        'Overcome hesitation, master conversational English, professional interview readiness, and international client calls.',
        'English bolne ki jhijhak door karein, professional conversations aur international client interviews ke liye tayyar hon.',
        'Practical speaking and listening immersion designed for students and freelancers. Covers phonetics, sentence building, everyday vocabulary, professional workplace dialogues, email correspondence, and client call confidence.',
        5000.00, 6, 'months', 'office', 'Language & Soft Skills', false, 10, 'published'
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    title_roman_urdu = EXCLUDED.title_roman_urdu,
    short_description = EXCLUDED.short_description,
    short_description_roman_urdu = EXCLUDED.short_description_roman_urdu,
    full_description = EXCLUDED.full_description,
    price = EXCLUDED.price,
    duration_value = EXCLUDED.duration_value,
    duration_unit = EXCLUDED.duration_unit,
    category = EXCLUDED.category,
    category_label = EXCLUDED.category_label,
    is_featured = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status;

-- ------------------------------------------------------------------------------
-- 9. PHASE 8: PACKAGES, COUPONS, OFFERS & ONLINE PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_months INT NOT NULL DEFAULT 6 CHECK (duration_months > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_packages_slug ON public.packages(slug);
CREATE INDEX IF NOT EXISTS idx_packages_active ON public.packages(is_active);

CREATE TABLE IF NOT EXISTS public.package_courses (
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    usage_limit INT DEFAULT 100,
    times_used INT NOT NULL DEFAULT 0,
    per_user_limit INT NOT NULL DEFAULT 1,
    min_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applicable_course_slugs TEXT[] DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_reference TEXT,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(coupon_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    banner_message TEXT,
    applicable_course_slugs TEXT[] DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_offers_active_dates ON public.offers(is_active, start_date, end_date);

CREATE TABLE IF NOT EXISTS public.online_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa', 'bank_transfer', 'other')),
    transaction_id TEXT NOT NULL UNIQUE,
    account_sender_name TEXT,
    account_sender_number TEXT,
    screenshot_path TEXT,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
    offer_title TEXT,
    final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_online_payments_ref ON public.online_payments(reference_number);
CREATE INDEX IF NOT EXISTS idx_online_payments_tx ON public.online_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON public.online_payments(payment_status);

-- Extend profiles & student_enrollments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'student_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN student_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'student_code'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN student_code TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN payment_id UUID REFERENCES public.online_payments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'extended_count'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN extended_count INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'extension_history'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN extension_history JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Security helpers for Phase 8
CREATE OR REPLACE FUNCTION public.can_manage_payments()
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
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('payments', 'fees')
                )
            )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_enrollments()
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
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('enrollments', 'students', 'registrations')
                )
            )
          )
    );
$$;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
CREATE POLICY "Public can view active packages" ON public.packages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can manage packages" ON public.packages;
CREATE POLICY "Staff can manage packages" ON public.packages FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;
CREATE POLICY "Staff can manage coupons" ON public.coupons FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Staff can view all redemptions" ON public.coupon_redemptions FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can manage offers" ON public.offers;
CREATE POLICY "Staff can manage offers" ON public.offers FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Students can view own online payments" ON public.online_payments;
CREATE POLICY "Students can view own online payments" ON public.online_payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all online payments" ON public.online_payments;
CREATE POLICY "Staff can view all online payments" ON public.online_payments FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Staff can update online payments" ON public.online_payments;
CREATE POLICY "Staff can update online payments" ON public.online_payments FOR UPDATE USING (public.can_manage_payments()) WITH CHECK (public.can_manage_payments());
DROP POLICY IF EXISTS "Public and users can submit pending payment" ON public.online_payments;
CREATE POLICY "Public and users can submit pending payment" ON public.online_payments FOR INSERT WITH CHECK (
    payment_status = 'pending' AND verified_by IS NULL AND verified_at IS NULL
);

-- Seed Packages & Coupons
INSERT INTO public.packages (slug, title, title_roman_urdu, description, description_roman_urdu, price, duration_months, is_active, display_order)
VALUES
    ('digital-business-bundle', 'Digital Business Master Bundle', 'Digital Karobar Master Bundle', 'YouTube + Shopify + Meta Ads complete suite.', 'YouTube, Shopify aur Meta Ads ka mukammal package.', 12000.00, 6, true, 1),
    ('freelancing-creative-suite', 'Creative Freelancing Suite', 'Creative Freelancing Suite', 'Graphic Design + Video Editing + Upwork/Fiverr.', 'Design, Video Editing aur Freelancing training.', 11000.00, 6, true, 2)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

INSERT INTO public.coupons (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, per_user_limit, min_amount, is_active)
VALUES
    ('WELCOME2026', 'percentage', 15.00, CURRENT_DATE, (CURRENT_DATE + INTERVAL '1 year')::date, 200, 0, 1, 5000.00, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.offers (title, title_roman_urdu, description, description_roman_urdu, discount_percentage, start_date, end_date, is_active, banner_message)
VALUES
    (
        'Special Hunarmand Pakistan Scholarship Offer',
        'Hunarmand Pakistan Khas Discount Offer',
        'Flat 10% discount on all online courses for Pakistani youth and freelancers.',
        'Pakistani nojawano ke liye tamam online recorded programs par 10% ki khas riayat.',
        10.00,
        CURRENT_DATE,
        (CURRENT_DATE + INTERVAL '60 days')::date,
        true,
        'Hunarmand Pakistan Special: 10% OFF on all online certified courses!'
    )
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 10. PHASE 9: QUIZZES, FINAL EXAMS, AND CERTIFICATES FOUNDATION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.can_manage_quizzes()
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
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('quizzes', 'courses')
                )
            )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_certificates()
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
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('certificates', 'students')
                )
            )
          )
    );
$$;

CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT,
    description_roman_urdu TEXT,
    instructions TEXT,
    instructions_roman_urdu TEXT,
    duration_minutes INT NOT NULL DEFAULT 15 CHECK (duration_minutes >= 0),
    passing_score_percentage NUMERIC(5, 2) NOT NULL DEFAULT 70.00 CHECK (passing_score_percentage >= 0 AND passing_score_percentage <= 100),
    max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON public.quizzes(is_published, is_archived);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    question_text_en TEXT NOT NULL,
    question_text_roman TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option_id TEXT NOT NULL,
    explanation_en TEXT,
    explanation_roman TEXT,
    marks INT NOT NULL DEFAULT 1 CHECK (marks > 0),
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'quiz_id') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'attempt_number') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN attempt_number INT DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'started_at') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'percentage') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN percentage NUMERIC(5, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'status') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN status TEXT DEFAULT 'completed';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.final_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT,
    description_roman_urdu TEXT,
    instructions TEXT,
    instructions_roman_urdu TEXT,
    duration_minutes INT NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    passing_percentage NUMERIC(5, 2) NOT NULL DEFAULT 70.00 CHECK (passing_percentage >= 30 AND passing_percentage <= 100),
    attempt_limit INT NOT NULL DEFAULT 2 CHECK (attempt_limit > 0),
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_final_exams_course ON public.final_exams(course_id);

CREATE TABLE IF NOT EXISTS public.final_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    question_text_en TEXT NOT NULL,
    question_text_roman TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_option_id TEXT NOT NULL,
    explanation_en TEXT,
    explanation_roman TEXT,
    marks INT NOT NULL DEFAULT 1 CHECK (marks > 0),
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_final_exam_questions_exam ON public.final_exam_questions(exam_id, display_order);

CREATE TABLE IF NOT EXISTS public.final_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    score INT NOT NULL DEFAULT 0 CHECK (score >= 0),
    max_score INT NOT NULL DEFAULT 0 CHECK (max_score >= 0),
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (percentage >= 0 AND percentage <= 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    passing_threshold NUMERIC(5, 2) NOT NULL DEFAULT 70.00,
    user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_final_exam_attempts_user_exam ON public.final_exam_attempts(user_id, exam_id);

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_code TEXT NOT NULL UNIQUE,
    verification_token TEXT NOT NULL UNIQUE,
    student_type TEXT NOT NULL CHECK (student_type IN ('online', 'physical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    physical_student_id UUID REFERENCES public.physical_students(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    course_title TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    score_percentage NUMERIC(5, 2),
    final_grade TEXT,
    exam_attempt_id UUID REFERENCES public.final_exam_attempts(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    issued_by UUID REFERENCES public.profiles(id),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    revoked_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON public.certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

CREATE SEQUENCE IF NOT EXISTS public.certificate_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_next_certificate_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    curr_year TEXT;
    seq_val INT;
    cert_code TEXT;
BEGIN
    curr_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    seq_val := nextval('public.certificate_code_seq');
    cert_code := 'INSPIRE-CERT-' || curr_year || '-' || LPAD(seq_val::text, 4, '0');
    
    WHILE EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = cert_code) LOOP
        seq_val := nextval('public.certificate_code_seq');
        cert_code := 'INSPIRE-CERT-' || curr_year || '-' || LPAD(seq_val::text, 4, '0');
    END LOOP;
    
    RETURN cert_code;
END;
$$;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view published quizzes" ON public.quizzes;
CREATE POLICY "Students can view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true AND is_archived = false);
DROP POLICY IF EXISTS "Staff can manage all quizzes" ON public.quizzes;
CREATE POLICY "Staff can manage all quizzes" ON public.quizzes FOR ALL USING (public.can_manage_quizzes());

DROP POLICY IF EXISTS "Students can view active questions" ON public.quiz_questions;
CREATE POLICY "Students can view active questions" ON public.quiz_questions FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Staff can manage quiz questions" ON public.quiz_questions FOR ALL USING (public.can_manage_quizzes());

DROP POLICY IF EXISTS "Students can view published final exams" ON public.final_exams;
CREATE POLICY "Students can view published final exams" ON public.final_exams FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage final exams" ON public.final_exams;
CREATE POLICY "Staff can manage final exams" ON public.final_exams FOR ALL USING (public.can_manage_quizzes());

DROP POLICY IF EXISTS "Students can view active final exam questions" ON public.final_exam_questions;
CREATE POLICY "Students can view active final exam questions" ON public.final_exam_questions FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can manage final exam questions" ON public.final_exam_questions;
CREATE POLICY "Staff can manage final exam questions" ON public.final_exam_questions FOR ALL USING (public.can_manage_quizzes());

DROP POLICY IF EXISTS "Students can view own final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Students can view own final exam attempts" ON public.final_exam_attempts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Students can submit own final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Students can submit own final exam attempts" ON public.final_exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Staff can view all final exam attempts" ON public.final_exam_attempts FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Staff can manage all final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Staff can manage all final exam attempts" ON public.final_exam_attempts FOR ALL USING (public.can_manage_quizzes());

DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
CREATE POLICY "Students can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Staff can view all certificates" ON public.certificates;
CREATE POLICY "Staff can view all certificates" ON public.certificates FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Staff can manage certificates" ON public.certificates;
CREATE POLICY "Staff can manage certificates" ON public.certificates FOR ALL USING (public.can_manage_certificates());
DROP POLICY IF EXISTS "Public can verify certificate by code or token" ON public.certificates;
CREATE POLICY "Public can verify certificate by code or token" ON public.certificates FOR SELECT TO anon, authenticated USING (status IN ('valid', 'revoked'));

-- ------------------------------------------------------------------------------
-- 11. PHASE 10: CMS, REPORTS, SETTINGS & GOVERNANCE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings_public (
    id TEXT PRIMARY KEY DEFAULT 'default',
    academy_name TEXT NOT NULL DEFAULT 'The Inspire Business Academy',
    tagline TEXT NOT NULL DEFAULT 'Hunarmand Pakistan mission ke tehat physical lab training aur online recorded courses',
    campus_address TEXT NOT NULL DEFAULT 'Main Campus, Sadiqabad, Punjab, Pakistan',
    phone TEXT NOT NULL DEFAULT '0300-1234567',
    whatsapp TEXT NOT NULL DEFAULT '0300-1234567',
    contact_email TEXT NOT NULL DEFAULT 'info@theinspireacademy.com',
    default_language TEXT NOT NULL DEFAULT 'roman-urdu' CHECK (default_language IN ('roman-urdu', 'english')),
    notice_ticker_enabled BOOLEAN NOT NULL DEFAULT true,
    public_site_url TEXT NOT NULL DEFAULT 'https://theinspireacademy.com',
    social_youtube TEXT DEFAULT 'https://youtube.com/@adeelbhattiofficial',
    social_facebook TEXT DEFAULT 'https://facebook.com/theinspireacademy',
    social_instagram TEXT DEFAULT 'https://instagram.com/theinspireacademy',
    payment_jazzcash_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_jazzcash_number TEXT DEFAULT '03001234567',
    payment_easypaisa_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_easypaisa_number TEXT DEFAULT '03001234567',
    payment_bank_name TEXT DEFAULT 'Meezan Bank Limited',
    payment_bank_account_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_bank_account_number TEXT DEFAULT '0102030405060708',
    payment_bank_iban TEXT DEFAULT 'PK00MEZN0001020304050607',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.site_settings_public (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    content TEXT NOT NULL,
    content_roman_urdu TEXT,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'admission', 'exam', 'holiday', 'workshop', 'urgent')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'physical_only', 'online_only')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_roman_urdu TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_roman_urdu TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'physical', 'online', 'admissions', 'fees', 'certificates')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_city TEXT DEFAULT 'Sadiqabad',
    course_title TEXT,
    testimonial_text TEXT NOT NULL,
    testimonial_text_roman_urdu TEXT,
    rating INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    avatar_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    message_roman_urdu TEXT,
    link_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    category TEXT NOT NULL DEFAULT 'campus' CHECK (category IN ('campus', 'lab', 'workshops', 'testing')),
    description TEXT,
    description_roman_urdu TEXT,
    location TEXT DEFAULT 'Sadiqabad Campus',
    image_url TEXT,
    alt_text TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.short_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    skill_topic TEXT NOT NULL,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    duration_days INT NOT NULL DEFAULT 7 CHECK (duration_days > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0),
    free_for_enrolled_students BOOLEAN NOT NULL DEFAULT true,
    includes_certificate BOOLEAN NOT NULL DEFAULT false,
    eligibility_notes TEXT DEFAULT 'Physical lab or online enrolled students eligible',
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.site_settings_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings_public;
CREATE POLICY "Public can view site settings" ON public.site_settings_public FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can update site settings" ON public.site_settings_public;
CREATE POLICY "Staff can update site settings" ON public.site_settings_public FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view published announcements" ON public.announcements;
CREATE POLICY "Public can view published announcements" ON public.announcements FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage all announcements" ON public.announcements;
CREATE POLICY "Staff can manage all announcements" ON public.announcements FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view published faqs" ON public.faqs;
CREATE POLICY "Public can view published faqs" ON public.faqs FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage all faqs" ON public.faqs;
CREATE POLICY "Staff can manage all faqs" ON public.faqs FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials" ON public.testimonials FOR SELECT USING (is_approved = true);
DROP POLICY IF EXISTS "Staff can manage all testimonials" ON public.testimonials;
CREATE POLICY "Staff can manage all testimonials" ON public.testimonials FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view published notices" ON public.notices;
CREATE POLICY "Public can view published notices" ON public.notices FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage all notices" ON public.notices;
CREATE POLICY "Staff can manage all notices" ON public.notices FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view published gallery items" ON public.gallery_items;
CREATE POLICY "Public can view published gallery items" ON public.gallery_items FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage all gallery items" ON public.gallery_items;
CREATE POLICY "Staff can manage all gallery items" ON public.gallery_items FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Public can view published short sessions" ON public.short_sessions;
CREATE POLICY "Public can view published short sessions" ON public.short_sessions FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Staff can manage all short sessions" ON public.short_sessions;
CREATE POLICY "Staff can manage all short sessions" ON public.short_sessions FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 12. PHASE 11: SECURITY HARDENING & PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can verify certificate by code or token" ON public.certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_identifier TEXT)
RETURNS TABLE (
    certificate_code TEXT,
    recipient_name TEXT,
    course_title TEXT,
    student_type TEXT,
    issue_date DATE,
    score_percentage NUMERIC,
    final_grade TEXT,
    status TEXT,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        c.certificate_code,
        c.recipient_name,
        c.course_title,
        c.student_type,
        c.issue_date,
        c.score_percentage,
        c.final_grade,
        c.status,
        c.revoked_at,
        c.revocation_reason
    FROM public.certificates c
    WHERE (c.certificate_code = trim(p_identifier) OR c.verification_token = trim(p_identifier))
      AND c.status IN ('valid', 'revoked')
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT) TO anon, authenticated;

-- Hardening audit logs & exam attempts
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_online_payments_tx_id ON public.online_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_user_id ON public.online_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON public.online_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_online_payments_created ON public.online_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_user_id ON public.student_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id ON public.student_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON public.student_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_expiry ON public.student_enrollments(expiry_date);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON public.certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

CREATE INDEX IF NOT EXISTS idx_physical_students_code ON public.physical_students(student_id_code);
CREATE INDEX IF NOT EXISTS idx_physical_students_status ON public.physical_students(status);
CREATE INDEX IF NOT EXISTS idx_physical_students_course ON public.physical_students(course_slug);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_date ON public.physical_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_student ON public.physical_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_fee_payments_student ON public.physical_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_fee_payments_date ON public.physical_fee_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_admissions_ref ON public.admissions(reference_number);
CREATE INDEX IF NOT EXISTS idx_admissions_type_status ON public.admissions(admission_type, status);
CREATE INDEX IF NOT EXISTS idx_admissions_email ON public.admissions(email);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions(phone);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, start_date);
CREATE INDEX IF NOT EXISTS idx_site_notices_active ON public.notices(is_published, priority);
CREATE INDEX IF NOT EXISTS idx_site_faqs_published ON public.faqs(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(is_approved, display_order);
CREATE INDEX IF NOT EXISTS idx_short_sessions_published ON public.short_sessions(is_published, start_date);

-- ------------------------------------------------------------------------------
-- 13. VERIFICATION QUERY
-- ------------------------------------------------------------------------------
SELECT 
    'The Inspire Business Academy Database Setup Complete!' AS status,
    (SELECT count(*) FROM public.courses) AS total_courses,
    (SELECT count(*) FROM public.packages) AS total_packages,
    (SELECT count(*) FROM public.coupons) AS total_coupons,
    (SELECT count(*) FROM public.final_exams) AS total_final_exams,
    (SELECT count(*) FROM storage.buckets) AS total_storage_buckets;



-- ==============================================================================
-- Migration 20261012000000: Live database sync (hardening + PRD v2.1 additions)
-- ALREADY APPLIED to the live Supabase project through the Supabase connector.
-- This file exists so the repo matches the live database. Safe to re-run (idempotent).
-- ==============================================================================

-- 1. SECURITY HARDENING ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
        NULLIF(TRIM(new.raw_user_meta_data->>'phone'), ''),
        'online_student'::public.user_role,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Coupons: no public listing of codes (discounts are validated server-side).
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;
CREATE POLICY "Staff can manage coupons" ON public.coupons FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Quiz / exam answers must never be readable by students directly.
DROP POLICY IF EXISTS "Students can view active questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view active final exam questions" ON public.final_exam_questions;

-- Students must not write their own exam results (server-side grading only).
DROP POLICY IF EXISTS "Students can submit own final exam attempts" ON public.final_exam_attempts;
DROP POLICY IF EXISTS "Students can update own final exam attempts" ON public.final_exam_attempts;

-- Certificates table is never public; verification only through the RPC below.
DROP POLICY IF EXISTS "Public can verify certificate by code or token" ON public.certificates;

DROP FUNCTION IF EXISTS public.verify_certificate_public(TEXT);
CREATE FUNCTION public.verify_certificate_public(p_identifier TEXT)
RETURNS TABLE (certificate_code TEXT, recipient_name TEXT, course_title TEXT, student_type TEXT, issue_date DATE, score_percentage NUMERIC, final_grade TEXT, status TEXT, revoked_at TIMESTAMPTZ, revocation_reason TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT c.certificate_code, c.recipient_name, c.course_title, c.student_type, c.issue_date, c.score_percentage, c.final_grade, c.status, c.revoked_at, c.revocation_reason
    FROM public.certificates c
    WHERE (c.certificate_code = trim(p_identifier) OR c.verification_token = trim(p_identifier))
      AND c.status IN ('valid', 'revoked')
    LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT) TO anon, authenticated;

-- Audit log: only staff can insert, only super admin can read, nobody can edit/delete.
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
DROP POLICY IF EXISTS "Super admin can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin());
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- Trigger functions must not be callable through the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_max_managers_limit() FROM PUBLIC, anon, authenticated;

-- 2. PRD v2.1 ADDITIONS ---------------------------------------------------------
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS is_most_popular BOOLEAN NOT NULL DEFAULT false;
UPDATE public.courses SET image_url = thumbnail_url WHERE image_url IS NULL AND thumbnail_url IS NOT NULL;

ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
UPDATE public.testimonials SET status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END;
ALTER TABLE public.testimonials ALTER COLUMN is_approved SET DEFAULT false;
CREATE OR REPLACE FUNCTION public.sync_testimonial_approval() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = OLD.status AND NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
        NEW.status := CASE WHEN NEW.is_approved THEN 'approved' ELSE 'pending' END;
    END IF;
    NEW.is_approved := (NEW.status = 'approved');
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_testimonial_approval ON public.testimonials;
CREATE TRIGGER trg_sync_testimonial_approval BEFORE INSERT OR UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.sync_testimonial_approval();
DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials" ON public.testimonials FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Public can submit pending testimonial" ON public.testimonials;
CREATE POLICY "Public can submit pending testimonial" ON public.testimonials FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'pending' AND is_featured = false AND char_length(testimonial_text) BETWEEN 10 AND 1000 AND char_length(student_name) BETWEEN 2 AND 100);

ALTER TABLE public.gallery_items DROP CONSTRAINT IF EXISTS gallery_items_category_check;
ALTER TABLE public.gallery_items
    ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE public.site_settings_public
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_1 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_2 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_3 TEXT,
    ADD COLUMN IF NOT EXISTS home_class_image_url TEXT,
    ADD COLUMN IF NOT EXISTS home_teacher_image_url TEXT,
    ADD COLUMN IF NOT EXISTS founder_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
    ADD COLUMN IF NOT EXISTS why_choose_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS operating_hours_open TEXT NOT NULL DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS operating_hours_close TEXT NOT NULL DEFAULT '19:00',
    ADD COLUMN IF NOT EXISTS maps_embed_url TEXT,
    ADD COLUMN IF NOT EXISTS physical_monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 5040,
    ADD COLUMN IF NOT EXISTS physical_package_months INT NOT NULL DEFAULT 6,
    ADD COLUMN IF NOT EXISTS physical_package_total NUMERIC(10,2) NOT NULL DEFAULT 30240,
    ADD COLUMN IF NOT EXISTS online_course_price NUMERIC(10,2) NOT NULL DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS online_course_duration_months INT NOT NULL DEFAULT 6,
    ADD COLUMN IF NOT EXISTS certificate_pass_percentage NUMERIC(5,2) NOT NULL DEFAULT 70;
ALTER TABLE public.site_settings_public ALTER COLUMN campus_address SET DEFAULT 'Near Shimla Point And NGS School Nehr Kinara, Mehrabad Street #1, Sadiqabad';
UPDATE public.site_settings_public SET campus_address = 'Near Shimla Point And NGS School Nehr Kinara, Mehrabad Street #1, Sadiqabad' WHERE id = 'default';

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    email TEXT CHECK (email IS NULL OR char_length(email) <= 200),
    phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
    subject TEXT CHECK (subject IS NULL OR char_length(subject) <= 200),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 3000),
    is_read BOOLEAN NOT NULL DEFAULT false,
    reply_note TEXT,
    replied_at TIMESTAMPTZ,
    handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages(is_read, created_at DESC);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can send contact message" ON public.contact_messages;
CREATE POLICY "Anyone can send contact message" ON public.contact_messages FOR INSERT TO anon, authenticated
    WITH CHECK (is_read = false AND reply_note IS NULL AND replied_at IS NULL AND handled_by IS NULL);
DROP POLICY IF EXISTS "Staff can read contact messages" ON public.contact_messages;
CREATE POLICY "Staff can read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "Staff can update contact messages" ON public.contact_messages;
CREATE POLICY "Staff can update contact messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "Super admin can delete contact messages" ON public.contact_messages;
CREATE POLICY "Super admin can delete contact messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.physical_fee_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.physical_students(id) ON DELETE CASCADE,
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due > 0),
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (student_id, installment_number)
);
CREATE INDEX IF NOT EXISTS idx_fee_installments_due ON public.physical_fee_installments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_fee_installments_student ON public.physical_fee_installments(student_id);
ALTER TABLE public.physical_fee_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view fee installments" ON public.physical_fee_installments;
CREATE POLICY "Staff can view fee installments" ON public.physical_fee_installments FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "Staff can insert fee installments" ON public.physical_fee_installments;
CREATE POLICY "Staff can insert fee installments" ON public.physical_fee_installments FOR INSERT TO authenticated WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "Staff can update fee installments" ON public.physical_fee_installments;
CREATE POLICY "Staff can update fee installments" ON public.physical_fee_installments FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "Super admin can delete fee installments" ON public.physical_fee_installments;
CREATE POLICY "Super admin can delete fee installments" ON public.physical_fee_installments FOR DELETE TO authenticated USING (public.is_super_admin());

ALTER TABLE public.physical_attendance DROP CONSTRAINT IF EXISTS physical_attendance_status_check;
ALTER TABLE public.physical_attendance ADD CONSTRAINT physical_attendance_status_check CHECK (status IN ('present', 'absent', 'late', 'leave', 'excused'));

ALTER TABLE public.short_sessions
    ADD COLUMN IF NOT EXISTS session_link TEXT,
    ADD COLUMN IF NOT EXISTS session_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS capacity INT CHECK (capacity IS NULL OR capacity > 0);
CREATE TABLE IF NOT EXISTS public.short_session_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.short_sessions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    phone TEXT NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
    email TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'attended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_short_session_regs_session ON public.short_session_registrations(session_id);
ALTER TABLE public.short_session_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can register for published session" ON public.short_session_registrations;
CREATE POLICY "Anyone can register for published session" ON public.short_session_registrations FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'registered' AND EXISTS (SELECT 1 FROM public.short_sessions s WHERE s.id = session_id AND s.is_published = true));
DROP POLICY IF EXISTS "Staff can manage session registrations" ON public.short_session_registrations;
CREATE POLICY "Staff can manage session registrations" ON public.short_session_registrations FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    greeting TEXT,
    greeting_roman_urdu TEXT,
    extra_knowledge TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
INSERT INTO public.chatbot_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage chatbot settings" ON public.chatbot_settings;
CREATE POLICY "Staff can manage chatbot settings" ON public.chatbot_settings FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());


-- ==============================================================================
-- Migration 20261013000000: Align schema with code
-- ALREADY APPLIED to the live Supabase project through the Supabase connector.
-- This file exists so the repo matches the live database. Safe to re-run (idempotent).
-- ==============================================================================

-- 1. CHATBOT KNOWLEDGE BASE ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_active ON public.chatbot_knowledge(is_active, display_order);
ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active chatbot knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Public can view active chatbot knowledge" ON public.chatbot_knowledge FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage chatbot knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Staff can manage chatbot knowledge" ON public.chatbot_knowledge FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 2. OFFERS & PROMO CODES ------------------------------------------------------
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS requires_promo_code BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.offer_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_offer_promo_codes_lookup ON public.offer_promo_codes(code, is_active);
CREATE INDEX IF NOT EXISTS idx_offer_promo_codes_offer ON public.offer_promo_codes(offer_id);
ALTER TABLE public.offer_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage offer promo codes" ON public.offer_promo_codes;
CREATE POLICY "Staff can manage offer promo codes" ON public.offer_promo_codes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 3. COUPON USAGE HELPER FUNCTION ----------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(cp_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.coupons
    SET times_used = times_used + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = cp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_usage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO anon, authenticated;


-- ==============================================================================
-- Migration 20261013100000: Online payments access columns and proof size limit
-- ==============================================================================
ALTER TABLE public.online_payments 
    ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'registration',
    ADD COLUMN IF NOT EXISTS selected_course_ids UUID[],
    ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS access_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS access_reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'online_payments_request_type_check'
    ) THEN
        ALTER TABLE public.online_payments 
            ADD CONSTRAINT online_payments_request_type_check 
            CHECK (request_type IN ('registration', 'additional_course', 'package'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'online_payments_access_status_check'
    ) THEN
        ALTER TABLE public.online_payments 
            ADD CONSTRAINT online_payments_access_status_check 
            CHECK (access_status IN ('pending', 'granted', 'denied'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_online_payments_access_status ON public.online_payments(access_status);
CREATE INDEX IF NOT EXISTS idx_online_payments_access_reviewed_by ON public.online_payments(access_reviewed_by);

UPDATE storage.buckets 
SET file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] 
WHERE id = 'payment-proofs';

-- ==============================================================================
-- Migration 20261013100100: Super admin insert policy for site settings public
-- ==============================================================================
DROP POLICY IF EXISTS "Super admin can insert site settings" ON public.site_settings_public;
CREATE POLICY "Super admin can insert site settings" 
ON public.site_settings_public 
FOR INSERT TO authenticated 
WITH CHECK ((select public.is_super_admin()));

-- ==============================================================================
-- Migration 20261013100200: PRD v2 Website additions
-- ==============================================================================
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS is_most_popular BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS online_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS online_duration_months INT DEFAULT 6,
    ADD COLUMN IF NOT EXISTS available_for_physical BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS available_for_online BOOLEAN NOT NULL DEFAULT true;

UPDATE public.courses SET image_url = thumbnail_url WHERE image_url IS NULL AND thumbnail_url IS NOT NULL;

ALTER TABLE public.gallery_items
    ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
    ADD COLUMN IF NOT EXISTS video_url TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_media_type_check'
    ) THEN
        ALTER TABLE public.gallery_items 
            ADD CONSTRAINT gallery_items_media_type_check 
            CHECK (media_type IN ('image', 'video'));
    END IF;
END $$;

ALTER TABLE public.site_settings_public
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_1 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_2 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_3 TEXT,
    ADD COLUMN IF NOT EXISTS home_class_image_url TEXT,
    ADD COLUMN IF NOT EXISTS home_teacher_image_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_package_image_url TEXT,
    ADD COLUMN IF NOT EXISTS founder_image_url TEXT,
    ADD COLUMN IF NOT EXISTS founder_name TEXT DEFAULT 'Adeel Bhatti',
    ADD COLUMN IF NOT EXISTS why_choose_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS courses_hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS about_left_image_url TEXT,
    ADD COLUMN IF NOT EXISTS about_right_image_url TEXT,
    ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
    ADD COLUMN IF NOT EXISTS maps_embed_url TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS social_youtube TEXT,
    ADD COLUMN IF NOT EXISTS social_facebook TEXT,
    ADD COLUMN IF NOT EXISTS social_instagram TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS payment_bank_name TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_account_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_account_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_iban TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS opening_time TEXT DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '19:00',
    ADD COLUMN IF NOT EXISTS working_days_text TEXT DEFAULT 'Monday - Friday',
    ADD COLUMN IF NOT EXISTS physical_monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 5040,
    ADD COLUMN IF NOT EXISTS physical_total_fee NUMERIC(10,2) NOT NULL DEFAULT 30240,
    ADD COLUMN IF NOT EXISTS physical_course_count INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS physical_admission_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS online_course_price NUMERIC(10,2) NOT NULL DEFAULT 5000;

-- ==============================================================================
-- Migration 20261013100300: Revoke execute on internal trigger functions
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_max_managers_limit') THEN
        REVOKE EXECUTE ON FUNCTION public.check_max_managers_limit() FROM PUBLIC, anon, authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_testimonial_approval') THEN
        REVOKE EXECUTE ON FUNCTION public.sync_testimonial_approval() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- ==============================================================================
-- Migration 20261013100400: Final hardening for quiz attempts and contact messages
-- ==============================================================================
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
CREATE POLICY "Public can submit contact messages" 
ON public.contact_messages 
FOR INSERT TO anon, authenticated
WITH CHECK (
    is_read = false 
    AND reply_note IS NULL 
    AND replied_at IS NULL 
    AND handled_by IS NULL
    AND char_length(message) <= 3000
    AND char_length(full_name) <= 100
);

DROP POLICY IF EXISTS "Staff can read and manage contact messages" ON public.contact_messages;
CREATE POLICY "Staff can read and manage contact messages" 
ON public.contact_messages 
FOR ALL TO authenticated 
USING (public.is_staff()) 
WITH CHECK (public.is_staff());
-- Assessment support (additive). Lesson/resource RLS for enrolled students is already
-- live (migration enrolled_students_can_view_lessons). Quiz/exam questions stay hidden
-- from students; they are served and graded by /api/student/assessments (service role).
ALTER TABLE public.student_quiz_attempts ALTER COLUMN lesson_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.student_quiz_attempts (quiz_id);
-- Round 3 fixes (additive; RLS stays enabled, nothing is weakened).
-- 1) Public certificate verification without opening the certificates table to anon.
-- 2) Student certificate claim (server-side eligibility check) -> fixes RLS error on insert.
-- 3) Student course progress update (students have no UPDATE on student_enrollments).
-- 4) Audit log: actor id/role are stamped by the database, never trusted from the client.

-- 1) verify_certificate -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(p_identifier text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT to_jsonb(t) FROM (
    SELECT c.certificate_code, c.recipient_name, c.course_title, c.course_titles, c.duration_text,
           c.completion_date, c.student_type, c.issue_date, c.score_percentage, c.final_grade,
           c.status, c.revoked_at, c.revocation_reason
      FROM public.certificates c
     WHERE upper(c.certificate_code) = upper(trim(p_identifier))
        OR c.verification_token = trim(p_identifier)
     LIMIT 1
  ) t;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2) claim_online_certificate -------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_online_certificate(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_enr public.student_enrollments%ROWTYPE;
  v_att public.final_exam_attempts%ROWTYPE;
  v_name text; v_email text; v_course text; v_code text; v_grade text;
  v_row public.certificates%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Login required.'; END IF;

  SELECT * INTO v_enr FROM public.student_enrollments WHERE user_id = v_uid AND course_id = p_course_id;
  IF NOT FOUND OR v_enr.status = 'suspended' OR v_enr.expiry_date < current_date THEN
    RAISE EXCEPTION 'Course enrollment is not active.';
  END IF;

  SELECT * INTO v_att FROM public.final_exam_attempts
   WHERE user_id = v_uid AND course_id = p_course_id AND passed = true
   ORDER BY percentage DESC, completed_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Final exam has not been passed yet.'; END IF;

  IF EXISTS (SELECT 1 FROM public.certificates WHERE user_id = v_uid AND course_id = p_course_id AND status = 'valid') THEN
    RAISE EXCEPTION 'Certificate already issued for this course.';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_uid;
  SELECT title INTO v_course FROM public.courses WHERE id = p_course_id;
  v_code := public.generate_next_certificate_code();
  v_grade := CASE WHEN v_att.percentage >= 90 THEN 'Distinction (A+)'
                  WHEN v_att.percentage >= 80 THEN 'Excellence (A)'
                  WHEN v_att.percentage >= 70 THEN 'Certified Pass (B)'
                  ELSE 'Passing (C)' END;

  INSERT INTO public.certificates (certificate_code, verification_token, student_type, user_id, course_id,
      course_title, recipient_name, recipient_email, score_percentage, final_grade, exam_attempt_id,
      issue_date, completion_date, status, issued_by)
  VALUES (v_code, replace(gen_random_uuid()::text, '-', ''), 'online', v_uid, p_course_id,
      coalesce(v_course, 'Certified Program'), coalesce(v_name, 'Student'), v_email, v_att.percentage, v_grade,
      v_att.id, current_date, current_date, 'valid', NULL)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END; $$;
REVOKE ALL ON FUNCTION public.claim_online_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_online_certificate(uuid) TO authenticated;

-- 3) update_my_course_progress ------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_course_progress(p_course_id uuid, p_lesson_id uuid DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int; v_done int; v_pct numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Login required.'; END IF;

  SELECT count(*) INTO v_total
    FROM public.course_lessons l JOIN public.course_modules m ON m.id = l.module_id
   WHERE m.course_id = p_course_id AND m.is_published AND l.is_published;

  SELECT count(*) INTO v_done
    FROM public.student_lesson_progress p
    JOIN public.course_lessons l ON l.id = p.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
   WHERE p.user_id = v_uid AND p.course_id = p_course_id AND p.is_completed
     AND m.course_id = p_course_id AND m.is_published AND l.is_published;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE round(v_done::numeric * 100 / v_total, 2) END;

  UPDATE public.student_enrollments
     SET progress_percentage = v_pct,
         last_accessed_lesson_id = coalesce(p_lesson_id, last_accessed_lesson_id),
         last_accessed_at = now(),
         status = CASE WHEN v_pct >= 100 THEN 'completed' ELSE 'active' END,
         completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
   WHERE user_id = v_uid AND course_id = p_course_id AND status IN ('active', 'completed');

  RETURN v_pct;
END; $$;
REVOKE ALL ON FUNCTION public.update_my_course_progress(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_course_progress(uuid, uuid) TO authenticated;

-- 4) audit_logs: database stamps the real actor ------------------------------
CREATE OR REPLACE FUNCTION public.audit_logs_stamp_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    NEW.actor_id := auth.uid();
    IF v_role IS NOT NULL THEN NEW.actor_role := v_role; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.audit_logs_stamp_actor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_logs_stamp_actor ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_stamp_actor BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_stamp_actor();

-- Backfill: fix wrongly labelled historical rows using the real profile role.
UPDATE public.audit_logs a SET actor_role = p.role
  FROM public.profiles p
 WHERE p.id = a.actor_id AND a.actor_role IS DISTINCT FROM p.role;
-- Phase 1: DB-level spam throttle for public admissions (protects both the API path and direct inserts).
-- Additive; RLS unchanged.
CREATE OR REPLACE FUNCTION public.admissions_throttle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_phone_cnt int; v_global_cnt int;
BEGIN
  SELECT count(*) INTO v_phone_cnt FROM public.admissions
   WHERE phone = NEW.phone AND created_at > now() - interval '1 hour';
  IF v_phone_cnt >= 3 THEN
    RAISE EXCEPTION 'Too many admission requests for this phone number. Please try again later.' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_global_cnt FROM public.admissions
   WHERE created_at > now() - interval '1 hour';
  IF v_global_cnt >= 300 THEN
    RAISE EXCEPTION 'Admissions are temporarily busy. Please try again later.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.admissions_throttle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_admissions_throttle ON public.admissions;
CREATE TRIGGER trg_admissions_throttle BEFORE INSERT ON public.admissions
  FOR EACH ROW EXECUTE FUNCTION public.admissions_throttle();

CREATE INDEX IF NOT EXISTS idx_admissions_phone_created ON public.admissions (phone, created_at DESC);


-- Phase 2: promo once per student

CREATE TABLE IF NOT EXISTS public.offer_promo_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES public.offer_promo_codes(id) ON DELETE CASCADE,
    user_id UUID,
    email TEXT,
    phone TEXT,
    payment_reference TEXT,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_user
    ON public.offer_promo_redemptions(promo_code_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_email
    ON public.offer_promo_redemptions(promo_code_id, lower(email)) WHERE email IS NOT NULL AND email <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_phone
    ON public.offer_promo_redemptions(promo_code_id, phone) WHERE phone IS NOT NULL AND phone <> '';

ALTER TABLE public.offer_promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view promo redemptions" ON public.offer_promo_redemptions;
CREATE POLICY "Staff can view promo redemptions" ON public.offer_promo_redemptions
    FOR SELECT TO authenticated USING (public.is_staff());

-- Atomic claim: locks the promo row, enforces usage_limit and once-per-student, counts usage.
CREATE OR REPLACE FUNCTION public.claim_offer_promo(
    p_promo_code_id UUID,
    p_user_id UUID,
    p_email TEXT,
    p_phone TEXT,
    p_payment_reference TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_promo public.offer_promo_codes%ROWTYPE;
BEGIN
    SELECT * INTO v_promo FROM public.offer_promo_codes WHERE id = p_promo_code_id FOR UPDATE;
    IF NOT FOUND OR NOT v_promo.is_active THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
    END IF;
    IF v_promo.usage_limit IS NOT NULL AND v_promo.times_used >= v_promo.usage_limit THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'limit_reached');
    END IF;

    BEGIN
        INSERT INTO public.offer_promo_redemptions(promo_code_id, user_id, email, phone, payment_reference)
        VALUES (p_promo_code_id, p_user_id, NULLIF(trim(p_email), ''), NULLIF(trim(p_phone), ''), p_payment_reference);
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
    END;

    UPDATE public.offer_promo_codes SET times_used = times_used + 1, updated_at = now() WHERE id = p_promo_code_id;
    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_offer_promo(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer_promo(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
