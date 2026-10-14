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
