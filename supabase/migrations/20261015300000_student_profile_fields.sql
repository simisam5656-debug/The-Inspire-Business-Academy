-- Phase 3: student profile fields + admin-only portfolio URL. Additive, RLS unchanged.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Students may update their own row (existing policy), but must never change
-- portfolio_url (admin-only), student_code or email. Staff / service role are unaffected.
CREATE OR REPLACE FUNCTION public.profiles_protect_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
        NEW.portfolio_url := OLD.portfolio_url;
        NEW.student_code := OLD.student_code;
        NEW.email := OLD.email;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.profiles_protect_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_protect_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_fields BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_fields();

-- Narrow RPC for the student's own profile settings.
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_full_name TEXT,
    p_phone TEXT,
    p_city TEXT,
    p_bio TEXT,
    p_avatar_url TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := (select auth.uid());
    v_name TEXT := NULLIF(trim(coalesce(p_full_name, '')), '');
    v_avatar TEXT := NULLIF(trim(coalesce(p_avatar_url, '')), '');
    v_row public.profiles%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF v_name IS NULL OR char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
        RAISE EXCEPTION 'Name must be 2-80 characters';
    END IF;
    IF char_length(coalesce(p_bio, '')) > 300 THEN
        RAISE EXCEPTION 'Bio must be at most 300 characters';
    END IF;
    IF char_length(coalesce(p_phone, '')) > 25 OR char_length(coalesce(p_city, '')) > 60 THEN
        RAISE EXCEPTION 'Phone or city is too long';
    END IF;
    IF v_avatar IS NOT NULL AND (v_avatar !~* '^https://[^\s]+$' OR char_length(v_avatar) > 500) THEN
        RAISE EXCEPTION 'Profile picture must be a valid https link';
    END IF;

    UPDATE public.profiles
       SET full_name = v_name,
           phone = NULLIF(trim(coalesce(p_phone, '')), ''),
           city = NULLIF(trim(coalesce(p_city, '')), ''),
           bio = NULLIF(trim(coalesce(p_bio, '')), ''),
           avatar_url = v_avatar,
           updated_at = now()
     WHERE id = v_uid
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    RETURN jsonb_build_object(
        'full_name', v_row.full_name, 'phone', v_row.phone, 'city', v_row.city,
        'bio', v_row.bio, 'avatar_url', v_row.avatar_url
    );
END;
$$;
REVOKE ALL ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
