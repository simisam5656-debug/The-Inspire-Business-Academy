-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 007: Quizzes + Final Exams + Certificates System (Phase 9)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY HELPER FUNCTIONS FOR ASSESSMENTS & CERTIFICATES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. QUIZZES TABLE (QUIZ MANAGER)
-- ------------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON public.quizzes(is_published, is_archived);

-- ------------------------------------------------------------------------------
-- 3. QUESTION BANK / QUIZ QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    question_text_en TEXT NOT NULL,
    question_text_roman TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, text_en, text_roman }
    correct_option_id TEXT NOT NULL, -- Never sent to student client before submit
    explanation_en TEXT,
    explanation_roman TEXT,
    marks INT NOT NULL DEFAULT 1 CHECK (marks > 0),
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_course ON public.quiz_questions(course_id);

-- Safely extend student_quiz_attempts table if exists
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'questions_snapshot') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN questions_snapshot JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_attempts' AND column_name = 'status') THEN
        ALTER TABLE public.student_quiz_attempts ADD COLUMN status TEXT DEFAULT 'completed';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. FINAL EXAMS TABLE (CONFIGURABLE PASS MARK, DEFAULT 70%)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. FINAL EXAM QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.final_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.final_exams(id) ON DELETE CASCADE,
    question_text_en TEXT NOT NULL,
    question_text_roman TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, text_en, text_roman }
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

-- ------------------------------------------------------------------------------
-- 6. FINAL EXAM ATTEMPTS TABLE
-- ------------------------------------------------------------------------------
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
    questions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_final_exam_attempts_user_exam ON public.final_exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_attempts_course ON public.final_exam_attempts(course_id);

-- ------------------------------------------------------------------------------
-- 7. CERTIFICATES TABLE (ONLINE & PHYSICAL WITH UNIQUE CODE & QR TOKEN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_code TEXT NOT NULL UNIQUE, -- e.g. INSPIRE-CERT-2026-0001
    verification_token TEXT NOT NULL UNIQUE, -- 32-char secure random token
    student_type TEXT NOT NULL CHECK (student_type IN ('online', 'physical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Online student auth
    physical_student_id UUID REFERENCES public.physical_students(id) ON DELETE SET NULL, -- Physical student record
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    course_title TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    score_percentage NUMERIC(5, 2),
    final_grade TEXT, -- Distinction, Merit, Pass, A+, A, etc.
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
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_physical_student ON public.certificates(physical_student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

-- ------------------------------------------------------------------------------
-- 8. CERTIFICATE CODE GENERATION HELPER
-- ------------------------------------------------------------------------------
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
    
    -- Ensure collision resistance
    WHILE EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = cert_code) LOOP
        seq_val := nextval('public.certificate_code_seq');
        cert_code := 'INSPIRE-CERT-' || curr_year || '-' || LPAD(seq_val::text, 4, '0');
    END LOOP;
    
    RETURN cert_code;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. SAFE PUBLIC CERTIFICATE VERIFICATION FUNCTION
-- Returns only safe public fields, never leaks private emails, phone, or secrets
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_identifier TEXT)
RETURNS TABLE (
    found BOOLEAN,
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
        true AS found,
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
    WHERE c.certificate_code = trim(p_identifier)
       OR c.verification_token = trim(p_identifier)
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Quizzes RLS
DROP POLICY IF EXISTS "Students can view published quizzes" ON public.quizzes;
CREATE POLICY "Students can view published quizzes"
    ON public.quizzes FOR SELECT
    USING (is_published = true AND is_archived = false);

DROP POLICY IF EXISTS "Staff can manage all quizzes" ON public.quizzes;
CREATE POLICY "Staff can manage all quizzes"
    ON public.quizzes FOR ALL
    USING (public.can_manage_quizzes());

-- Quiz Questions RLS
DROP POLICY IF EXISTS "Students can view active questions" ON public.quiz_questions;
CREATE POLICY "Students can view active questions"
    ON public.quiz_questions FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Staff can manage quiz questions"
    ON public.quiz_questions FOR ALL
    USING (public.can_manage_quizzes());

-- Final Exams RLS
DROP POLICY IF EXISTS "Students can view published final exams" ON public.final_exams;
CREATE POLICY "Students can view published final exams"
    ON public.final_exams FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage final exams" ON public.final_exams;
CREATE POLICY "Staff can manage final exams"
    ON public.final_exams FOR ALL
    USING (public.can_manage_quizzes());

-- Final Exam Questions RLS
DROP POLICY IF EXISTS "Students can view active final exam questions" ON public.final_exam_questions;
CREATE POLICY "Students can view active final exam questions"
    ON public.final_exam_questions FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage final exam questions" ON public.final_exam_questions;
CREATE POLICY "Staff can manage final exam questions"
    ON public.final_exam_questions FOR ALL
    USING (public.can_manage_quizzes());

-- Final Exam Attempts RLS
DROP POLICY IF EXISTS "Students can view own final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Students can view own final exam attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can submit own final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Students can submit own final exam attempts"
    ON public.final_exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Staff can view all final exam attempts"
    ON public.final_exam_attempts FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage all final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Staff can manage all final exam attempts"
    ON public.final_exam_attempts FOR ALL
    USING (public.can_manage_quizzes());

-- Certificates RLS
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
CREATE POLICY "Students can view own certificates"
    ON public.certificates FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all certificates" ON public.certificates;
CREATE POLICY "Staff can view all certificates"
    ON public.certificates FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage certificates" ON public.certificates;
CREATE POLICY "Staff can manage certificates"
    ON public.certificates FOR ALL
    USING (public.can_manage_certificates());

-- Anonymous/Public access to certificates table directly for verify
DROP POLICY IF EXISTS "Public can verify certificate by code or token" ON public.certificates;
CREATE POLICY "Public can verify certificate by code or token"
    ON public.certificates FOR SELECT
    TO anon, authenticated
    USING (status IN ('valid', 'revoked'));
