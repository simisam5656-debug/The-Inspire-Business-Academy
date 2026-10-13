-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 001: Private Storage Buckets & Policies Foundation
-- Target: Supabase Storage
-- ==============================================================================

-- 1. Create Private Buckets
-- CRITICAL SECURITY RULE: Buckets must be private (public = false).
-- No public URL access for payment screenshots, assignments, or student files.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    (
        'payment-proofs',
        'payment-proofs',
        false,
        524288, -- 512 KB limit (clients compress under 250 KB)
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'assignment-submissions',
        'assignment-submissions',
        false,
        15728640, -- 15 MB limit
        ARRAY['application/pdf', 'application/zip', 'image/jpeg', 'image/png', 'text/plain']
    ),
    (
        'certificate-files',
        'certificate-files',
        false,
        5242880, -- 5 MB limit
        ARRAY['application/pdf', 'image/png']
    )
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- Storage RLS Policies: payment-proofs
-- ------------------------------------------------------------------------------

-- Authenticated online applicants/students can upload to their own folder: payment-proofs/{user_id}/*
DROP POLICY IF EXISTS "Users can upload their own payment proof" ON storage.objects;
CREATE POLICY "Users can upload their own payment proof"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can read their own uploaded proof
DROP POLICY IF EXISTS "Users can view their own payment proof" ON storage.objects;
CREATE POLICY "Users can view their own payment proof"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Academy staff can view all payment proofs for verification
DROP POLICY IF EXISTS "Staff can view all payment proofs" ON storage.objects;
CREATE POLICY "Staff can view all payment proofs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'payment-proofs' AND
        public.is_staff()
    );

-- ------------------------------------------------------------------------------
-- Storage RLS Policies: assignment-submissions
-- ------------------------------------------------------------------------------

-- Enrolled students can upload to: assignment-submissions/{user_id}/*
DROP POLICY IF EXISTS "Students can upload assignment submissions" ON storage.objects;
CREATE POLICY "Students can upload assignment submissions"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'assignment-submissions' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Students can read their own submissions
DROP POLICY IF EXISTS "Students can read their own assignment submissions" ON storage.objects;
CREATE POLICY "Students can read their own assignment submissions"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'assignment-submissions' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Staff can review and download all assignment submissions
DROP POLICY IF EXISTS "Staff can view all assignment submissions" ON storage.objects;
CREATE POLICY "Staff can view all assignment submissions"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'assignment-submissions' AND
        public.is_staff()
    );
