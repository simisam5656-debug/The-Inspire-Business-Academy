import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../../_lib/auth';
import { getEnv } from '../../_lib/env';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // 1. Strict Authenticate caller & check certificates permission
    const authResult = await authenticateStaff(req, 'certificates');
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({ ok: false, error: authResult.error });
    }

    const actorId = authResult.actorId!;
    const actorRole = authResult.actorRole!;

    const {
      studentType,
      userId,
      physicalStudentId,
      courseId,
      courseTitle,
      courseTitles,
      durationText,
      completionDate,
      recipientName,
      scorePercentage,
      finalGrade,
    } = req.body || {};

    if (!studentType || (!userId && !physicalStudentId)) {
      return res.status(400).json({ ok: false, error: 'Student information missing.' });
    }

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ ok: false, error: 'Server database credentials not configured.' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Generate unique code & token
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const certificateCode = `INSPIRE-CERT-${year}-${randomSuffix}`;
    const verificationToken = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');

    const today = new Date().toISOString().split('T')[0];

    const finalCourseTitles: string[] = Array.isArray(courseTitles) && courseTitles.length > 0
      ? courseTitles.map((t: any) => String(t).trim()).filter(Boolean)
      : courseTitle
      ? [String(courseTitle).trim()]
      : ['Certified Program'];

    const primaryCourseTitle = finalCourseTitles.join(', ');

    const { data: cert, error } = await supabase
      .from('certificates')
      .insert({
        certificate_code: certificateCode,
        verification_token: verificationToken,
        student_type: studentType,
        user_id: userId || null,
        physical_student_id: physicalStudentId || null,
        course_id: courseId || null,
        course_title: primaryCourseTitle,
        course_titles: finalCourseTitles,
        duration_text: durationText ? String(durationText).trim() : null,
        completion_date: completionDate || today,
        recipient_name: recipientName || 'Student',
        score_percentage: scorePercentage ? Number(scorePercentage) : null,
        final_grade: finalGrade || 'Passed',
        issue_date: today,
        status: 'valid',
        issued_by: actorId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Issue certificate DB error:', error?.code || 'DB_ERROR');
      return res.status(500).json({ ok: false, error: 'Database operation failed while issuing certificate.' });
    }

    // Audit log
    if (actorId) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole || 'super_admin',
          action: 'issue_certificate_api',
          entity: 'certificates',
          entity_id: cert.id,
          details: { certificateCode, recipientName, studentType },
        });
      } catch (_) {}
    }

    return res.status(200).json({
      ok: true,
      message: 'Certificate issued successfully.',
      certificate: cert,
    });
  } catch (err: any) {
    console.error('Issue certificate handler exception:', err?.name || 'Exception');
    return res.status(500).json({ ok: false, error: 'Internal server error while processing certificate issuance.' });
  }
}
