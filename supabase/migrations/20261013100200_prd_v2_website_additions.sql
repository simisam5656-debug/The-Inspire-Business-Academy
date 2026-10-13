-- ==============================================================================
-- Migration 20261013100200: PRD v2 Website additions
-- Safe to re-run (idempotent)
-- ==============================================================================

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS is_most_popular BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS online_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS online_duration_months INT DEFAULT 6,
    ADD COLUMN IF NOT EXISTS available_for_physical BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS available_for_online BOOLEAN NOT NULL DEFAULT true;

UPDATE public.courses SET image_url = thumbnail_url WHERE image_url IS NULL AND thumbnail_url IS NOT NULL;

ALTER TABLE public.gallery_items
    ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
    ADD COLUMN IF NOT EXISTS video_url TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_media_type_check'
    ) THEN
        ALTER TABLE public.gallery_items 
            ADD CONSTRAINT gallery_items_media_type_check 
            CHECK (media_type IN ('image', 'video'));
    END IF;
END $$;

ALTER TABLE public.site_settings_public
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_1 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_2 TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_3 TEXT,
    ADD COLUMN IF NOT EXISTS home_class_image_url TEXT,
    ADD COLUMN IF NOT EXISTS home_teacher_image_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_package_image_url TEXT,
    ADD COLUMN IF NOT EXISTS founder_image_url TEXT,
    ADD COLUMN IF NOT EXISTS founder_name TEXT DEFAULT 'Adeel Bhatti',
    ADD COLUMN IF NOT EXISTS why_choose_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS courses_hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS about_left_image_url TEXT,
    ADD COLUMN IF NOT EXISTS about_right_image_url TEXT,
    ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
    ADD COLUMN IF NOT EXISTS maps_embed_url TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS social_youtube TEXT,
    ADD COLUMN IF NOT EXISTS social_facebook TEXT,
    ADD COLUMN IF NOT EXISTS social_instagram TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_jazzcash_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_easypaisa_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS payment_bank_name TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_account_title TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_account_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_iban TEXT,
    ADD COLUMN IF NOT EXISTS payment_bank_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS opening_time TEXT DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '19:00',
    ADD COLUMN IF NOT EXISTS working_days_text TEXT DEFAULT 'Monday - Friday',
    ADD COLUMN IF NOT EXISTS physical_monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 5040,
    ADD COLUMN IF NOT EXISTS physical_total_fee NUMERIC(10,2) NOT NULL DEFAULT 30240,
    ADD COLUMN IF NOT EXISTS physical_course_count INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS physical_admission_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS online_course_price NUMERIC(10,2) NOT NULL DEFAULT 5000;
