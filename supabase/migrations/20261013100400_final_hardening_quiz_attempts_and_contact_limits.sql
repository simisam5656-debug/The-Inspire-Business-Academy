-- ==============================================================================
-- Migration 20261013100400: Final hardening for quiz attempts and contact messages
-- Safe to re-run (idempotent)
-- ==============================================================================

-- Ensure contact_messages has rate limiting check & RLS protection
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
