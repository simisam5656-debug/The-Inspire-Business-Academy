-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 005: Student LMS Portal + Learning Experience (Phase 7)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Student Enrollments Table
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

-- 2. Student Lesson Progress Table
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

-- 3. Student Personal Lesson Notes Table
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

-- 4. Student Quiz Attempts Table
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Enrollments Policies
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.student_enrollments;
CREATE POLICY "Students can view their own enrollments"
    ON public.student_enrollments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all student enrollments" ON public.student_enrollments;
CREATE POLICY "Staff can view all student enrollments"
    ON public.student_enrollments
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage student enrollments" ON public.student_enrollments;
CREATE POLICY "Staff can manage student enrollments"
    ON public.student_enrollments
    FOR ALL
    TO authenticated
    USING (public.is_staff());

-- Lesson Progress Policies
DROP POLICY IF EXISTS "Students can view their own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Students can view their own lesson progress"
    ON public.student_lesson_progress
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert or update own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Students can insert or update own lesson progress"
    ON public.student_lesson_progress
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all student lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Staff can view all student lesson progress"
    ON public.student_lesson_progress
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

-- Student Notes Policies
DROP POLICY IF EXISTS "Students can manage own personal notes" ON public.student_notes;
CREATE POLICY "Students can manage own personal notes"
    ON public.student_notes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Quiz Attempts Policies
DROP POLICY IF EXISTS "Students can view and submit own quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can view and submit own quiz attempts"
    ON public.student_quiz_attempts
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Staff can view all quiz attempts"
    ON public.student_quiz_attempts
    FOR SELECT
    TO authenticated
    USING (public.is_staff());
