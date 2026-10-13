-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 008: CMS, Reports, Public Settings & Governance (Phase 10)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PUBLIC SITE SETTINGS TABLE (Single-row or keyed site configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings_public (
    id TEXT PRIMARY KEY DEFAULT 'default',
    academy_name TEXT NOT NULL DEFAULT 'The Inspire Business Academy',
    tagline TEXT NOT NULL DEFAULT 'Hunarmand Pakistan mission ke tehat physical lab training aur online recorded courses',
    campus_address TEXT NOT NULL DEFAULT 'Main Campus, Sadiqabad, Punjab, Pakistan',
    phone TEXT NOT NULL DEFAULT '0300-1234567',
    whatsapp TEXT NOT NULL DEFAULT '0300-1234567',
    contact_email TEXT NOT NULL DEFAULT 'info@theinspireacademy.com',
    default_language TEXT NOT NULL DEFAULT 'roman-urdu' CHECK (default_language IN ('roman-urdu', 'english')),
    notice_ticker_enabled BOOLEAN NOT NULL DEFAULT true,
    public_site_url TEXT NOT NULL DEFAULT 'https://theinspireacademy.com',
    social_youtube TEXT DEFAULT 'https://youtube.com/@adeelbhattiofficial',
    social_facebook TEXT DEFAULT 'https://facebook.com/theinspireacademy',
    social_instagram TEXT DEFAULT 'https://instagram.com/theinspireacademy',
    payment_jazzcash_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_jazzcash_number TEXT DEFAULT '03001234567',
    payment_easypaisa_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_easypaisa_number TEXT DEFAULT '03001234567',
    payment_bank_name TEXT DEFAULT 'Meezan Bank Limited',
    payment_bank_account_title TEXT DEFAULT 'The Inspire Business Academy',
    payment_bank_account_number TEXT DEFAULT '0102030405060708',
    payment_bank_iban TEXT DEFAULT 'PK00MEZN0001020304050607',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default settings row if empty
INSERT INTO public.site_settings_public (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. ANNOUNCEMENTS TABLE (LMS & Public updates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    content TEXT NOT NULL,
    content_roman_urdu TEXT,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'admission', 'exam', 'holiday', 'workshop', 'urgent')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'physical_only', 'online_only')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, display_order, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. FAQS TABLE (Managed FAQs with category & ordering)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_roman_urdu TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_roman_urdu TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'physical', 'online', 'admissions', 'fees', 'certificates')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_faqs_published_order ON public.faqs(is_published, display_order);

-- ------------------------------------------------------------------------------
-- 4. TESTIMONIALS TABLE (Verified student reviews & feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_city TEXT DEFAULT 'Sadiqabad',
    course_title TEXT,
    testimonial_text TEXT NOT NULL,
    testimonial_text_roman_urdu TEXT,
    rating INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    avatar_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(is_approved, is_featured, display_order);

-- ------------------------------------------------------------------------------
-- 5. NOTICES TICKER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    message_roman_urdu TEXT,
    link_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(is_published, display_order, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. GALLERY ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    category TEXT NOT NULL DEFAULT 'campus' CHECK (category IN ('campus', 'lab', 'workshops', 'testing')),
    description TEXT,
    description_roman_urdu TEXT,
    location TEXT DEFAULT 'Sadiqabad Campus',
    image_url TEXT,
    alt_text TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gallery_published ON public.gallery_items(is_published, display_order);

-- ------------------------------------------------------------------------------
-- 7. SHORT SESSIONS TABLE (7-Day / 20-Day skill bootcamps)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.short_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_roman_urdu TEXT,
    skill_topic TEXT NOT NULL,
    description TEXT NOT NULL,
    description_roman_urdu TEXT,
    duration_days INT NOT NULL DEFAULT 7 CHECK (duration_days > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0),
    free_for_enrolled_students BOOLEAN NOT NULL DEFAULT true,
    includes_certificate BOOLEAN NOT NULL DEFAULT false, -- Preserving rule: no cert by default
    eligibility_notes TEXT DEFAULT 'Physical lab or online enrolled students eligible',
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_short_sessions_published ON public.short_sessions(is_published, display_order);

-- ------------------------------------------------------------------------------
-- 8. EXTEND OFFERS TABLE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE public.offers ADD COLUMN display_order INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.site_settings_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Site Settings Policies
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings_public;
CREATE POLICY "Public can view site settings" ON public.site_settings_public
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can update site settings" ON public.site_settings_public;
CREATE POLICY "Staff can update site settings" ON public.site_settings_public
    FOR UPDATE USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 2. Announcements Policies
DROP POLICY IF EXISTS "Public can view published announcements" ON public.announcements;
CREATE POLICY "Public can view published announcements" ON public.announcements
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage all announcements" ON public.announcements;
CREATE POLICY "Staff can manage all announcements" ON public.announcements
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 3. FAQs Policies
DROP POLICY IF EXISTS "Public can view published faqs" ON public.faqs;
CREATE POLICY "Public can view published faqs" ON public.faqs
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage all faqs" ON public.faqs;
CREATE POLICY "Staff can manage all faqs" ON public.faqs
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 4. Testimonials Policies
DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials" ON public.testimonials
    FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Staff can manage all testimonials" ON public.testimonials;
CREATE POLICY "Staff can manage all testimonials" ON public.testimonials
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 5. Notices Policies
DROP POLICY IF EXISTS "Public can view published notices" ON public.notices;
CREATE POLICY "Public can view published notices" ON public.notices
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage all notices" ON public.notices;
CREATE POLICY "Staff can manage all notices" ON public.notices
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 6. Gallery Items Policies
DROP POLICY IF EXISTS "Public can view published gallery items" ON public.gallery_items;
CREATE POLICY "Public can view published gallery items" ON public.gallery_items
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage all gallery items" ON public.gallery_items;
CREATE POLICY "Staff can manage all gallery items" ON public.gallery_items
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 7. Short Sessions Policies
DROP POLICY IF EXISTS "Public can view published short sessions" ON public.short_sessions;
CREATE POLICY "Public can view published short sessions" ON public.short_sessions
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff can manage all short sessions" ON public.short_sessions;
CREATE POLICY "Staff can manage all short sessions" ON public.short_sessions
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());
