-- Phase 4: single-device login. A new login replaces the old one (old device is signed out
-- by the app on its next check). Additive; RLS enabled; writes only through RPCs.

CREATE TABLE IF NOT EXISTS public.student_sessions (
    user_id UUID PRIMARY KEY,
    device_id TEXT NOT NULL,
    session_token UUID NOT NULL DEFAULT gen_random_uuid(),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own session" ON public.student_sessions;
CREATE POLICY "Students view own session" ON public.student_sessions
    FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Staff view all sessions" ON public.student_sessions;
CREATE POLICY "Staff view all sessions" ON public.student_sessions
    FOR SELECT TO authenticated USING (public.is_staff());

-- Called right after a student logs in: this device becomes the only valid one.
CREATE OR REPLACE FUNCTION public.register_student_session(p_device_id TEXT, p_user_agent TEXT DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := (select auth.uid());
    v_role TEXT;
    v_token UUID := gen_random_uuid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role IS DISTINCT FROM 'online_student' THEN
        RETURN NULL; -- staff and others are never limited
    END IF;

    INSERT INTO public.student_sessions(user_id, device_id, session_token, user_agent, created_at, last_seen_at)
    VALUES (v_uid, left(coalesce(p_device_id, ''), 100), v_token, left(p_user_agent, 300), now(), now())
    ON CONFLICT (user_id) DO UPDATE
        SET device_id = EXCLUDED.device_id,
            session_token = EXCLUDED.session_token,
            user_agent = EXCLUDED.user_agent,
            created_at = now(),
            last_seen_at = now();
    RETURN v_token;
END;
$$;

-- Called periodically by the app: is this device still the active one?
CREATE OR REPLACE FUNCTION public.check_student_session(p_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := (select auth.uid());
    v_role TEXT;
    v_row public.student_sessions%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'no_auth');
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role IS DISTINCT FROM 'online_student' THEN
        RETURN jsonb_build_object('valid', true);
    END IF;

    SELECT * INTO v_row FROM public.student_sessions WHERE user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'reset');
    END IF;
    IF p_token IS NULL OR v_row.session_token <> p_token THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'other_device');
    END IF;

    UPDATE public.student_sessions SET last_seen_at = now() WHERE user_id = v_uid;
    RETURN jsonb_build_object('valid', true);
END;
$$;

-- Admin: sign the student out of every device.
CREATE OR REPLACE FUNCTION public.admin_reset_student_sessions(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;
    DELETE FROM public.student_sessions WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_student_session(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_student_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_student_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_student_session(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_student_sessions(UUID) TO authenticated;
