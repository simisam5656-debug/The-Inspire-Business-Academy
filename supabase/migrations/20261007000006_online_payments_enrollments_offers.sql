-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 006: Online Payments + Enrollments + Packages + Coupons + Offers (Phase 8)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PACKAGES TABLE & RELATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_months INT NOT NULL DEFAULT 6 CHECK (duration_months > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_packages_slug ON public.packages(slug);
CREATE INDEX IF NOT EXISTS idx_packages_active ON public.packages(is_active);

CREATE TABLE IF NOT EXISTS public.package_courses (
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, course_id)
);

-- ------------------------------------------------------------------------------
-- 2. COUPONS & REDEMPTIONS TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    usage_limit INT DEFAULT 100,
    times_used INT NOT NULL DEFAULT 0,
    per_user_limit INT NOT NULL DEFAULT 1,
    min_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applicable_course_slugs TEXT[] DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_reference TEXT,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);

-- ------------------------------------------------------------------------------
-- 3. OFFERS TABLE (PROMOTIONS & COUNTDOWNS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    banner_message TEXT,
    applicable_course_slugs TEXT[] DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_offers_active_dates ON public.offers(is_active, start_date, end_date);

-- ------------------------------------------------------------------------------
-- 4. ONLINE PAYMENTS TABLE (FINANCIAL LEDGER & TRANSACTION PROOFS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.online_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa', 'bank_transfer', 'other')),
    -- Critical Business Rule: One transaction ID cannot be reused for multiple unrelated payments
    transaction_id TEXT NOT NULL UNIQUE,
    account_sender_name TEXT,
    account_sender_number TEXT,
    screenshot_path TEXT, -- Private Supabase Storage path in 'payment-proofs'
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
    offer_title TEXT,
    final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_online_payments_ref ON public.online_payments(reference_number);
CREATE INDEX IF NOT EXISTS idx_online_payments_tx ON public.online_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_user ON public.online_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON public.online_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_online_payments_created ON public.online_payments(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. EXTEND STUDENT PROFILES & ENROLLMENTS
-- ------------------------------------------------------------------------------
-- Add unique student_code to profiles if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'student_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN student_code TEXT UNIQUE;
    END IF;
END $$;

-- Extend student_enrollments with start_date, expiry_date, student_code, payment_id, extension history
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'student_code'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN student_code TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN payment_id UUID REFERENCES public.online_payments(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'extended_count'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN extended_count INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'extension_history'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN extension_history JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollments_expiry ON public.student_enrollments(expiry_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_code ON public.student_enrollments(student_code);

-- ------------------------------------------------------------------------------
-- 6. SECURITY HELPERS FOR PAYMENTS & ENROLLMENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_payments()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND (
            p.role = 'super_admin'
            OR (
                p.role = 'manager'
                AND EXISTS (
                    SELECT 1 FROM public.manager_permissions mp
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('payments', 'fees')
                )
            )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_enrollments()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND (
            p.role = 'super_admin'
            OR (
                p.role = 'manager'
                AND EXISTS (
                    SELECT 1 FROM public.manager_permissions mp
                    WHERE mp.profile_id = p.id AND mp.permission_key IN ('enrollments', 'students', 'registrations')
                )
            )
          )
    );
$$;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;

-- Packages Policies
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
CREATE POLICY "Public can view active packages" ON public.packages FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage packages" ON public.packages;
CREATE POLICY "Staff can manage packages" ON public.packages FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Public can view package courses" ON public.package_courses;
CREATE POLICY "Public can view package courses" ON public.package_courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage package courses" ON public.package_courses;
CREATE POLICY "Staff can manage package courses" ON public.package_courses FOR ALL USING (public.is_staff());

-- Coupons Policies
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;
CREATE POLICY "Staff can manage coupons" ON public.coupons FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Staff can view all redemptions" ON public.coupon_redemptions FOR SELECT USING (public.is_staff());

-- Offers Policies
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage offers" ON public.offers;
CREATE POLICY "Staff can manage offers" ON public.offers FOR ALL USING (public.is_staff());

-- Online Payments Policies
DROP POLICY IF EXISTS "Students can view own online payments" ON public.online_payments;
CREATE POLICY "Students can view own online payments" ON public.online_payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all online payments" ON public.online_payments;
CREATE POLICY "Staff can view all online payments" ON public.online_payments FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can update online payments" ON public.online_payments;
CREATE POLICY "Staff can update online payments" ON public.online_payments FOR UPDATE USING (public.can_manage_payments()) WITH CHECK (public.can_manage_payments());

DROP POLICY IF EXISTS "Public and users can submit pending payment" ON public.online_payments;
CREATE POLICY "Public and users can submit pending payment" ON public.online_payments FOR INSERT WITH CHECK (
    payment_status = 'pending' AND verified_by IS NULL AND verified_at IS NULL
);

DROP POLICY IF EXISTS "Super admin can delete online payments" ON public.online_payments;
CREATE POLICY "Super admin can delete online payments" ON public.online_payments FOR DELETE USING (public.is_super_admin());

-- Update student_enrollments policies to allow management by can_manage_enrollments()
DROP POLICY IF EXISTS "Staff can manage student enrollments" ON public.student_enrollments;
CREATE POLICY "Staff can manage student enrollments" ON public.student_enrollments FOR ALL TO authenticated USING (public.can_manage_enrollments());

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA: OFFICIAL PACKAGES, COUPONS & OFFERS
-- ------------------------------------------------------------------------------

-- Seed Official Academy Packages
INSERT INTO public.packages (slug, title, title_roman_urdu, description, description_roman_urdu, price, duration_months, is_active, display_order)
VALUES
    (
        'digital-business-bundle',
        'Digital Business Master Bundle (YouTube + Dropshipping + Meta Ads)',
        'Digital Karobar Master Bundle (YouTube + Shopify + Meta Ads)',
        'Complete trio of high-income digital business courses: YouTube Monetization, Shopify E-Commerce, and Meta Ads scaling.',
        'Pakistan ke 3 sab se kamiyab digital business courses aik sath: YouTube Monetization, Shopify Dropshipping aur Meta Advertising.',
        12000.00,
        6,
        true,
        1
    ),
    (
        'freelancing-creative-suite',
        'Creative Freelancing Suite (Graphic Design + Video Editing + Freelancing)',
        'Creative Freelancing Suite (Graphic + Video Editing + Upwork/Fiverr)',
        'From zero design skills to landing international clients on Upwork and Fiverr with professional video and graphic assets.',
        'Photoshop, Illustrator, Premiere Pro aur CapCut ke zariye international clients se dollar kamane ka mukammal package.',
        11000.00,
        6,
        true,
        2
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    title_roman_urdu = EXCLUDED.title_roman_urdu,
    price = EXCLUDED.price,
    duration_months = EXCLUDED.duration_months;

-- Seed Welcome Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, per_user_limit, min_amount, is_active)
VALUES
    ('WELCOME2026', 'percentage', 15.00, CURRENT_DATE, (CURRENT_DATE + INTERVAL '1 year')::date, 200, 0, 1, 5000.00, true)
ON CONFLICT (code) DO NOTHING;

-- Seed Active Promotional Offer
INSERT INTO public.offers (title, title_roman_urdu, description, description_roman_urdu, discount_percentage, start_date, end_date, is_active, banner_message)
VALUES
    (
        'Special Hunarmand Pakistan Scholarship Offer',
        'Hunarmand Pakistan Khas Discount Offer',
        'Flat 10% discount on all online courses for Pakistani youth and freelancers.',
        'Pakistani nojawano ke liye tamam online recorded programs par 10% ki khas riayat.',
        10.00,
        CURRENT_DATE,
        (CURRENT_DATE + INTERVAL '60 days')::date,
        true,
        'Hunarmand Pakistan Special: 10% OFF on all online certified courses!'
    )
ON CONFLICT DO NOTHING;
