-- ==============================================================================
-- Migration 20261013100100: Super admin insert policy for site settings public
-- Safe to re-run (idempotent)
-- ==============================================================================

DROP POLICY IF EXISTS "Super admin can insert site settings" ON public.site_settings_public;
CREATE POLICY "Super admin can insert site settings" 
ON public.site_settings_public 
FOR INSERT TO authenticated 
WITH CHECK ((select public.is_super_admin()));
