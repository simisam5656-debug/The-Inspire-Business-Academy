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
