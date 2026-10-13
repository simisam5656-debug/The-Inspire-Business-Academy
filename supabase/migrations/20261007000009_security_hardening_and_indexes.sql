-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 009: Security Hardening, RLS Audit & Performance Indexes (Phase 11)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURE CERTIFICATE VERIFICATION (PREVENT SCRAPING OF PRIVATE CERT DATA)
-- ------------------------------------------------------------------------------

-- Drop overly broad anonymous policy on public.certificates
DROP POLICY IF EXISTS "Public can verify certificate by code or token" ON public.certificates;

-- Anonymous users cannot run unrestricted SELECT * on certificates.
-- Instead, public verification is done via dedicated RPC function below or /api/certificates/verify
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

-- Grant execution of safe verify function to public anon and authenticated
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT) TO anon, authenticated;

-- Ensure authenticated students can strictly see ONLY their own certificates
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
CREATE POLICY "Students can view own certificates"
    ON public.certificates FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Staff can view and manage all certificates
DROP POLICY IF EXISTS "Staff can view all certificates" ON public.certificates;
CREATE POLICY "Staff can view all certificates"
    ON public.certificates FOR SELECT
    TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage certificates" ON public.certificates;
CREATE POLICY "Staff can manage certificates"
    ON public.certificates FOR ALL
    TO authenticated
    USING (public.can_manage_certificates())
    WITH CHECK (public.can_manage_certificates());

-- ------------------------------------------------------------------------------
-- 2. FINAL EXAM ATTEMPTS INTEGRITY & IMMUTABILITY
-- ------------------------------------------------------------------------------
-- Ensure students cannot alter or overwrite submitted exam scores
DROP POLICY IF EXISTS "Students can update own final exam attempts" ON public.final_exam_attempts;
-- Students can ONLY insert (one-time submission)
DROP POLICY IF EXISTS "Students can submit own final exam attempts" ON public.final_exam_attempts;
CREATE POLICY "Students can submit own final exam attempts"
    ON public.final_exam_attempts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. AUDIT LOG IMMUTABILITY & PRESERVATION
-- ------------------------------------------------------------------------------
-- Audit logs must be strictly immutable (append-only)
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

-- Ensure staff can read audit logs only if super admin
DROP POLICY IF EXISTS "Super admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES FOR HIGH-FREQUENCY QUERIES
-- ------------------------------------------------------------------------------

-- Online Payments
CREATE INDEX IF NOT EXISTS idx_online_payments_tx_id ON public.online_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_user_id ON public.online_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON public.online_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_online_payments_created ON public.online_payments(created_at DESC);

-- Student Enrollments
CREATE INDEX IF NOT EXISTS idx_student_enrollments_user_id ON public.student_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id ON public.student_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON public.student_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_expiry ON public.student_enrollments(expiry_date);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON public.certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

-- Physical Academy Operations
CREATE INDEX IF NOT EXISTS idx_physical_students_code ON public.physical_students(student_id_code);
CREATE INDEX IF NOT EXISTS idx_physical_students_status ON public.physical_students(status);
CREATE INDEX IF NOT EXISTS idx_physical_students_course ON public.physical_students(course_slug);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_date ON public.physical_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_student ON public.physical_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_fee_payments_student ON public.physical_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_fee_payments_date ON public.physical_fee_payments(payment_date);

-- Admissions & Registrations
CREATE INDEX IF NOT EXISTS idx_admissions_ref ON public.admissions(reference_number);
CREATE INDEX IF NOT EXISTS idx_admissions_type_status ON public.admissions(admission_type, status);
CREATE INDEX IF NOT EXISTS idx_admissions_email ON public.admissions(email);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions(phone);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- CMS Items
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, start_date);
CREATE INDEX IF NOT EXISTS idx_site_notices_active ON public.notices(is_published, priority);
CREATE INDEX IF NOT EXISTS idx_site_faqs_published ON public.faqs(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(is_approved, display_order);
CREATE INDEX IF NOT EXISTS idx_short_sessions_published ON public.short_sessions(is_published, start_date);
