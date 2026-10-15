-- Phase 2: Promo codes — one use per student, atomic usage counting.
-- Additive only. RLS enabled. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.offer_promo_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES public.offer_promo_codes(id) ON DELETE CASCADE,
    user_id UUID,
    email TEXT,
    phone TEXT,
    payment_reference TEXT,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_user
    ON public.offer_promo_redemptions(promo_code_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_email
    ON public.offer_promo_redemptions(promo_code_id, lower(email)) WHERE email IS NOT NULL AND email <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_redemption_phone
    ON public.offer_promo_redemptions(promo_code_id, phone) WHERE phone IS NOT NULL AND phone <> '';

ALTER TABLE public.offer_promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view promo redemptions" ON public.offer_promo_redemptions;
CREATE POLICY "Staff can view promo redemptions" ON public.offer_promo_redemptions
    FOR SELECT TO authenticated USING (public.is_staff());

-- Atomic claim: locks the promo row, enforces usage_limit and once-per-student, counts usage.
CREATE OR REPLACE FUNCTION public.claim_offer_promo(
    p_promo_code_id UUID,
    p_user_id UUID,
    p_email TEXT,
    p_phone TEXT,
    p_payment_reference TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_promo public.offer_promo_codes%ROWTYPE;
BEGIN
    SELECT * INTO v_promo FROM public.offer_promo_codes WHERE id = p_promo_code_id FOR UPDATE;
    IF NOT FOUND OR NOT v_promo.is_active THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'inactive');
    END IF;
    IF v_promo.usage_limit IS NOT NULL AND v_promo.times_used >= v_promo.usage_limit THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'limit_reached');
    END IF;

    BEGIN
        INSERT INTO public.offer_promo_redemptions(promo_code_id, user_id, email, phone, payment_reference)
        VALUES (p_promo_code_id, p_user_id, NULLIF(trim(p_email), ''), NULLIF(trim(p_phone), ''), p_payment_reference);
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
    END;

    UPDATE public.offer_promo_codes SET times_used = times_used + 1, updated_at = now() WHERE id = p_promo_code_id;
    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_offer_promo(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer_promo(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
