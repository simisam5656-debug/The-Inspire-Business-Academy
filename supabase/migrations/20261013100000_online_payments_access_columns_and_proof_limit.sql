-- ==============================================================================
-- Migration 20261013100000: Online payments access columns and proof size limit
-- Safe to re-run (idempotent)
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
