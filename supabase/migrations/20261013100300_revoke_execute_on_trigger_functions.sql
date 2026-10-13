-- ==============================================================================
-- Migration 20261013100300: Revoke execute on internal trigger functions
-- Safe to re-run (idempotent)
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
