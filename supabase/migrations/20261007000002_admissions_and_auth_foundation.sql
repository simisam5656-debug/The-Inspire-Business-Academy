-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 002: Admissions Table, Hardened Auth Trigger & Security Policies
-- Target: Supabase PostgreSQL (Phase 4 Foundation)
-- ==============================================================================

-- 1. HARDEN NEW USER TRIGGER (Prevent privilege escalation)
-- Even if user metadata contains a crafted "role" field, force it to 'online_student'.
-- Administrative roles (super_admin, manager) MUST only be provisioned via secure backend/SQL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        is_active
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
        NULLIF(TRIM(new.raw_user_meta_data->>'phone'), ''),
        'online_student'::public.user_role, -- STRICT: always online_student from public signup
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = timezone('utc'::text, now());

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. CREATE ADMISSIONS TABLE
-- Clear separation between admission records and authenticated user accounts.
-- Physical students: admission record only, no auth.users login.
-- Online students: admission record linked to auth.users(id).
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    admission_type TEXT NOT NULL CHECK (admission_type IN ('physical', 'online')),
    full_name TEXT NOT NULL,
    guardian_name TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    city TEXT NOT NULL DEFAULT 'Sadiqabad',
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    batch_preference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_admissions_ref ON public.admissions(reference_number);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions(phone);
CREATE INDEX IF NOT EXISTS idx_admissions_email ON public.admissions(email);
CREATE INDEX IF NOT EXISTS idx_admissions_user_id ON public.admissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admissions_type ON public.admissions(admission_type);
CREATE INDEX IF NOT EXISTS idx_admissions_created_at ON public.admissions(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) FOR ADMISSIONS
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

-- Staff can view all admissions
DROP POLICY IF EXISTS "Staff can view all admissions" ON public.admissions;
CREATE POLICY "Staff can view all admissions"
    ON public.admissions
    FOR SELECT
    USING (public.is_staff());

-- Staff can update admissions (e.g. approve, reject, set notes)
DROP POLICY IF EXISTS "Staff can update admissions" ON public.admissions;
CREATE POLICY "Staff can update admissions"
    ON public.admissions
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Super admin can delete admissions if necessary
DROP POLICY IF EXISTS "Super admin can delete admissions" ON public.admissions;
CREATE POLICY "Super admin can delete admissions"
    ON public.admissions
    FOR DELETE
    USING (public.is_super_admin());

-- Authenticated online students can view only their own admission records
DROP POLICY IF EXISTS "Students can view own admissions" ON public.admissions;
CREATE POLICY "Students can view own admissions"
    ON public.admissions
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Controlled public/applicant insert:
-- Anyone (anonymous or authenticated) may submit an application,
-- but the status MUST be 'pending' (cannot self-approve) and cannot set reviewed_by or admin_notes.
DROP POLICY IF EXISTS "Public and users can submit pending admission" ON public.admissions;
CREATE POLICY "Public and users can submit pending admission"
    ON public.admissions
    FOR INSERT
    WITH CHECK (
        status = 'pending' AND
        reviewed_by IS NULL AND
        reviewed_at IS NULL AND
        admin_notes IS NULL
    );
