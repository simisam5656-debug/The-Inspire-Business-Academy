-- ==============================================================================
-- Migration 20261013000000: Align schema with code
-- ALREADY APPLIED to the live Supabase project through the Supabase connector.
-- This file exists so the repo matches the live database. Safe to re-run (idempotent).
-- ==============================================================================

-- 1. CHATBOT KNOWLEDGE BASE ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_active ON public.chatbot_knowledge(is_active, display_order);
ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active chatbot knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Public can view active chatbot knowledge" ON public.chatbot_knowledge FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage chatbot knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Staff can manage chatbot knowledge" ON public.chatbot_knowledge FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 2. OFFERS & PROMO CODES ------------------------------------------------------
ALTER TABLE public.offers
    ADD COLUMN IF NOT EXISTS requires_promo_code BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.offer_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_offer_promo_codes_lookup ON public.offer_promo_codes(code, is_active);
CREATE INDEX IF NOT EXISTS idx_offer_promo_codes_offer ON public.offer_promo_codes(offer_id);
ALTER TABLE public.offer_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage offer promo codes" ON public.offer_promo_codes;
CREATE POLICY "Staff can manage offer promo codes" ON public.offer_promo_codes FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 3. COUPON USAGE HELPER FUNCTION ----------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(cp_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.coupons
    SET times_used = times_used + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = cp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_usage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO anon, authenticated;
