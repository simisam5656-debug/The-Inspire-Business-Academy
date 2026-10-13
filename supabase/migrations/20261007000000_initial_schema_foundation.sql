-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 000: Initial Schema Foundation + Security / RLS
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Custom Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'manager', 'online_student');
    END IF;
END $$;

-- 2. Profiles Table (Extends Supabase auth.users)
-- Note: NO passwords or credentials stored here! Auth belongs exclusively to auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'online_student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for role-based lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Manager Module Permissions Table
-- Super Admin assigns specific module permissions to manager accounts (max 4 managers)
CREATE TABLE IF NOT EXISTS public.manager_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    granted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(profile_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_manager_permissions_profile ON public.manager_permissions(profile_id);

-- 4. Audit Log Table
-- Immutable activity log for privileged actions (approvals, fee adjustments, permissions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    actor_role user_role NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - MANDATORY SECURITY BOUNDARY
-- ==============================================================================

-- Enable RLS on all foundation tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security helper: Check if requesting user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    );
$$;

-- Security helper: Check if requesting user is manager or super_admin
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'manager') AND is_active = true
    );
$$;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Staff can view all profiles
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_staff());

-- Users can update safe non-role fields on their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Prevent privilege escalation: cannot self-assign role or status
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
    );

-- Super Admin can manage all profiles
DROP POLICY IF EXISTS "Super admin can manage profiles" ON public.profiles;
CREATE POLICY "Super admin can manage profiles"
    ON public.profiles
    FOR ALL
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- Manager Permissions Policies
-- ------------------------------------------------------------------------------

-- Only super admin can manage manager permissions
DROP POLICY IF EXISTS "Super admin can manage manager permissions" ON public.manager_permissions;
CREATE POLICY "Super admin can manage manager permissions"
    ON public.manager_permissions
    FOR ALL
    USING (public.is_super_admin());

-- Managers can read their own granted permissions
DROP POLICY IF EXISTS "Managers can read own permissions" ON public.manager_permissions;
CREATE POLICY "Managers can read own permissions"
    ON public.manager_permissions
    FOR SELECT
    USING (auth.uid() = profile_id);

-- ------------------------------------------------------------------------------
-- Audit Logs Policies
-- ------------------------------------------------------------------------------

-- Only super admin can read audit logs
DROP POLICY IF EXISTS "Super admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can read audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (public.is_super_admin());

-- Authenticated staff can insert audit log records (no updates, no deletes)
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (auth.users -> public.profiles)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'online_student')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger on auth.users (if permission allows)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
