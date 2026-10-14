-- Round 3 fixes (additive; RLS stays enabled, nothing is weakened).
-- 1) Public certificate verification without opening the certificates table to anon.
-- 2) Student certificate claim (server-side eligibility check) -> fixes RLS error on insert.
-- 3) Student course progress update (students have no UPDATE on student_enrollments).
-- 4) Audit log: actor id/role are stamped by the database, never trusted from the client.

-- 1) verify_certificate -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(p_identifier text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT to_jsonb(t) FROM (
    SELECT c.certificate_code, c.recipient_name, c.course_title, c.course_titles, c.duration_text,
           c.completion_date, c.student_type, c.issue_date, c.score_percentage, c.final_grade,
           c.status, c.revoked_at, c.revocation_reason
      FROM public.certificates c
     WHERE upper(c.certificate_code) = upper(trim(p_identifier))
        OR c.verification_token = trim(p_identifier)
     LIMIT 1
  ) t;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2) claim_online_certificate -------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_online_certificate(p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_enr public.student_enrollments%ROWTYPE;
  v_att public.final_exam_attempts%ROWTYPE;
  v_name text; v_email text; v_course text; v_code text; v_grade text;
  v_row public.certificates%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Login required.'; END IF;

  SELECT * INTO v_enr FROM public.student_enrollments WHERE user_id = v_uid AND course_id = p_course_id;
  IF NOT FOUND OR v_enr.status = 'suspended' OR v_enr.expiry_date < current_date THEN
    RAISE EXCEPTION 'Course enrollment is not active.';
  END IF;

  SELECT * INTO v_att FROM public.final_exam_attempts
   WHERE user_id = v_uid AND course_id = p_course_id AND passed = true
   ORDER BY percentage DESC, completed_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Final exam has not been passed yet.'; END IF;

  IF EXISTS (SELECT 1 FROM public.certificates WHERE user_id = v_uid AND course_id = p_course_id AND status = 'valid') THEN
    RAISE EXCEPTION 'Certificate already issued for this course.';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_uid;
  SELECT title INTO v_course FROM public.courses WHERE id = p_course_id;
  v_code := public.generate_next_certificate_code();
  v_grade := CASE WHEN v_att.percentage >= 90 THEN 'Distinction (A+)'
                  WHEN v_att.percentage >= 80 THEN 'Excellence (A)'
                  WHEN v_att.percentage >= 70 THEN 'Certified Pass (B)'
                  ELSE 'Passing (C)' END;

  INSERT INTO public.certificates (certificate_code, verification_token, student_type, user_id, course_id,
      course_title, recipient_name, recipient_email, score_percentage, final_grade, exam_attempt_id,
      issue_date, completion_date, status, issued_by)
  VALUES (v_code, replace(gen_random_uuid()::text, '-', ''), 'online', v_uid, p_course_id,
      coalesce(v_course, 'Certified Program'), coalesce(v_name, 'Student'), v_email, v_att.percentage, v_grade,
      v_att.id, current_date, current_date, 'valid', NULL)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END; $$;
REVOKE ALL ON FUNCTION public.claim_online_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_online_certificate(uuid) TO authenticated;

-- 3) update_my_course_progress ------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_my_course_progress(p_course_id uuid, p_lesson_id uuid DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int; v_done int; v_pct numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Login required.'; END IF;

  SELECT count(*) INTO v_total
    FROM public.course_lessons l JOIN public.course_modules m ON m.id = l.module_id
   WHERE m.course_id = p_course_id AND m.is_published AND l.is_published;

  SELECT count(*) INTO v_done
    FROM public.student_lesson_progress p
    JOIN public.course_lessons l ON l.id = p.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
   WHERE p.user_id = v_uid AND p.course_id = p_course_id AND p.is_completed
     AND m.course_id = p_course_id AND m.is_published AND l.is_published;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE round(v_done::numeric * 100 / v_total, 2) END;

  UPDATE public.student_enrollments
     SET progress_percentage = v_pct,
         last_accessed_lesson_id = coalesce(p_lesson_id, last_accessed_lesson_id),
         last_accessed_at = now(),
         status = CASE WHEN v_pct >= 100 THEN 'completed' ELSE 'active' END,
         completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
   WHERE user_id = v_uid AND course_id = p_course_id AND status IN ('active', 'completed');

  RETURN v_pct;
END; $$;
REVOKE ALL ON FUNCTION public.update_my_course_progress(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_course_progress(uuid, uuid) TO authenticated;

-- 4) audit_logs: database stamps the real actor ------------------------------
CREATE OR REPLACE FUNCTION public.audit_logs_stamp_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    NEW.actor_id := auth.uid();
    IF v_role IS NOT NULL THEN NEW.actor_role := v_role; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.audit_logs_stamp_actor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_logs_stamp_actor ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_stamp_actor BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_stamp_actor();

-- Backfill: fix wrongly labelled historical rows using the real profile role.
UPDATE public.audit_logs a SET actor_role = p.role
  FROM public.profiles p
 WHERE p.id = a.actor_id AND a.actor_role IS DISTINCT FROM p.role;
