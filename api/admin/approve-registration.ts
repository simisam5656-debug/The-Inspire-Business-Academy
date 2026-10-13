import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../_lib/auth';
import { getEnv } from '../_lib/env';

import { provisionEnrollment } from '../_lib/enrollmentProvisioning';

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 1. Strict Authenticate caller & check permissions via shared server-side helper
    const authResult = await authenticateStaff(req, 'registrations', dbClient);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({ ok: false, error: authResult.error });
    }

    // Role and Actor ID are authoritatively determined by server-side session, NEVER client body/params
    const actorId = authResult.actorId!;
    const actorRole = authResult.actorRole!;

    // 2. Parse request body and validate required parameters
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { admissionId, adminNotes, bypassPaymentCheck, exceptionReason } = body;

    if (!admissionId || typeof admissionId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Admission ID is required.' });
    }

    const isBypassRequested = Boolean(bypassPaymentCheck);

    // 3. Security Rule: Caller-controlled boolean is not proof of authorization.
    // Managers can NEVER bypass payment verification under any circumstances.
    if (isBypassRequested && actorRole !== 'super_admin') {
      return res.status(403).json({
        ok: false,
        error: 'Forbidden: Managers cannot bypass payment verification. Only a super administrator can authorize a manual payment exception.',
      });
    }

    // 4. Initialize Database Client
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceKey)) {
      return res.status(500).json({ ok: false, error: 'Database credentials not configured.' });
    }

    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    // 5. Fetch Admission Record and Validate State (Pre-mutation check)
    const { data: admission, error: aErr } = await supabase
      .from('admissions')
      .select('*')
      .eq('id', admissionId)
      .maybeSingle();

    if (aErr) {
      return res.status(500).json({ ok: false, error: 'Failed to query admission record.' });
    }

    if (!admission) {
      return res.status(404).json({ ok: false, error: 'Admission record not found.' });
    }

    // Handle Idempotency / Duplicate Approval Requests safely
    if (admission.status === 'approved') {
      const { data: existingEnrollment, error: enrReadErr } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('user_id', admission.user_id)
        .maybeSingle();

      if (enrReadErr) {
        return res.status(500).json({
          ok: false,
          error: 'Failed to lookup existing enrollment for approved registration.',
        });
      }

      return res.status(200).json({
        ok: true,
        message: 'Registration has already been approved.',
        admission,
        studentCode: existingEnrollment?.student_code || null,
        enrollment: existingEnrollment || null,
        expiryDate: existingEnrollment?.expiry_date || null,
        alreadyApproved: true,
      });
    }

    if (admission.status === 'rejected' || admission.status === 'cancelled') {
      return res.status(400).json({
        ok: false,
        error: `Cannot approve registration with status '${admission.status}'.`,
      });
    }

    if (admission.status !== 'pending') {
      return res.status(400).json({
        ok: false,
        error: `Admission is in invalid state '${admission.status}'.`,
      });
    }

    // 6. Fetch and Validate Associated Course Record (Pre-mutation check)
    if (!admission.course_slug) {
      return res.status(400).json({ ok: false, error: 'Admission record has no associated course slug.' });
    }

    const { data: course, error: cErr } = await supabase
      .from('courses')
      .select('id, title, status, duration_value, duration_unit, online_duration_months')
      .eq('slug', admission.course_slug)
      .maybeSingle();

    if (cErr) {
      return res.status(500).json({ ok: false, error: 'Failed to query course record.' });
    }

    if (!course) {
      return res.status(404).json({ ok: false, error: 'Associated course record not found.' });
    }

    if (course.status === 'archived') {
      return res.status(400).json({ ok: false, error: 'Associated course is archived and cannot accept enrollments.' });
    }

    const courseId = course.id;
    const durationMonths = Number(
      (course as any).online_duration_months ||
        (course.duration_unit === 'months' ? course.duration_value : 6) ||
        6
    );

    // 7. Authoritative Payment Record Validation (Pre-mutation check)
    const { data: payment, error: pErr } = await supabase
      .from('online_payments')
      .select('*')
      .eq('admission_id', admissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pErr) {
      return res.status(500).json({ ok: false, error: 'Failed to query payment record.' });
    }

    if (!payment) {
      return res.status(400).json({
        ok: false,
        error: 'Authoritative payment record not found for this admission. Registration approval requires a valid payment record.',
      });
    }

    let isManualException = false;
    let manualExceptionReason = '';

    if (payment.payment_status !== 'verified') {
      // Payment is not verified (e.g. pending or rejected)
      if (!isBypassRequested) {
        return res.status(400).json({
          ok: false,
          error: 'Pehle student ki payment verify karein ya verify payment button dabayein.',
          paymentPending: payment.payment_status === 'pending',
        });
      }

      // Bypass was requested, and we already confirmed actorRole === 'super_admin' above.
      // Validate non-empty explanation/reason
      manualExceptionReason = String(exceptionReason || adminNotes || '').trim();
      if (!manualExceptionReason) {
        return res.status(400).json({
          ok: false,
          error: 'A non-empty explanation/reason is required for an authorized super admin manual-payment exception.',
        });
      }

      isManualException = true;

      // CRITICAL SECURITY ENFORCEMENT:
      // Do NOT mutate payment.payment_status to 'verified'!
      // The payment record remains in its true ledger state. Registration approval is distinct from payment verification.
    }

    // 8. Record Audit Log for Manual Exception (Before main mutations; MUST succeed)
    if (isManualException) {
      const { error: auditErr } = await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: 'super_admin',
        action: 'approve_registration_payment_exception',
        entity: 'admissions',
        entity_id: admissionId,
        details: {
          admissionReference: admission.reference_number,
          paymentReference: payment.reference_number,
          paymentId: payment.id,
          paymentStatus: payment.payment_status,
          exceptionReason: manualExceptionReason,
          timestamp: new Date().toISOString(),
        },
      });

      if (auditErr) {
        return res.status(500).json({
          ok: false,
          error: 'Failed to record manual payment exception in audit log. Approval halted.',
        });
      }
    }

    // 9. Resolve or Link User Profile
    let studentUserId = admission.user_id;

    if (!studentUserId && admission.email) {
      const { data: existingProfile, error: profLookupErr } = await supabase
        .from('profiles')
        .select('id, role, student_code')
        .eq('email', admission.email.toLowerCase())
        .maybeSingle();

      if (profLookupErr) {
        return res.status(500).json({
          ok: false,
          error: 'Failed to lookup student profile by email.',
        });
      }

      if (existingProfile) {
        studentUserId = existingProfile.id;
      }
    }

    if (!studentUserId) {
      return res.status(400).json({
        ok: false,
        error: 'Cannot approve online registration: No student user account found for applicant. The student must have a user profile before enrollment can be established.',
      });
    }

    // 10. Provision or Renew Enrollment via shared helper
    const provRes = await provisionEnrollment({
      supabase,
      userId: studentUserId,
      courseId,
      paymentId: payment.id,
      actorId,
      actorRole,
    });

    if (!provRes.ok) {
      return res.status(500).json({
        ok: false,
        error: provRes.error || 'Enrollment record could not be established.',
      });
    }

    const studentCode = provRes.studentCode!;
    const enrollmentRecord = provRes.enrollment!;
    const startDateStr = provRes.startDate!;
    const expiryDateStr = provRes.expiryDate!;

    // 11. Update Admission Status
    const nowIso = new Date().toISOString();
    const notesToSave = isManualException
      ? `Approved via super admin manual-payment exception. Reason: ${manualExceptionReason}. Student ID: ${studentCode}. Enrollment active until ${expiryDateStr}.`
      : adminNotes || `Approved by staff. Student ID: ${studentCode}. Enrollment active until ${expiryDateStr}.`;

    const { data: updatedAdmission, error: uAdmErr } = await supabase
      .from('admissions')
      .update({
        status: 'approved',
        user_id: studentUserId || admission.user_id,
        reviewed_by: actorId,
        reviewed_at: nowIso,
        admin_notes: notesToSave,
      })
      .eq('id', admissionId)
      .select()
      .single();

    if (uAdmErr || !updatedAdmission || updatedAdmission.status !== 'approved') {
      // Compensate: If a new enrollment was created during this request, attempt rollback
      if (!provRes.isExisting && enrollmentRecord?.id) {
        try {
          await supabase.from('student_enrollments').delete().eq('id', enrollmentRecord.id);
        } catch (rollbackErr) {
          console.error('Failed to rollback created enrollment on admission update failure:', rollbackErr);
        }
      }
      console.error('[Admin Approve Registration Update DB Error]', uAdmErr?.code || 'DB_ERROR');
      return res.status(500).json({
        ok: false,
        error: 'Failed to update admission status to approved in database.',
      });
    }

    // 12. Write Standard Audit Log (Must succeed)
    const { error: stdAuditErr } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action: isManualException ? 'approve_online_registration_manual_exception' : 'approve_online_registration',
      entity: 'admissions',
      entity_id: admissionId,
      details: {
        admissionReference: admission.reference_number,
        studentCode,
        courseSlug: admission.course_slug,
        studentUserId,
        paymentId: payment.id,
        paymentStatus: payment.payment_status,
        isManualException,
        exceptionReason: isManualException ? manualExceptionReason : undefined,
        startDate: startDateStr,
        expiryDate: expiryDateStr,
      },
    });

    if (stdAuditErr) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to record approval in audit log.',
      });
    }

    // 13. Final Verification of Required States Before Returning ok: true
    if (!enrollmentRecord || enrollmentRecord.status !== 'active') {
      return res.status(500).json({
        ok: false,
        error: 'Enrollment active state verification failed.',
      });
    }

    return res.status(200).json({
      ok: true,
      message: isManualException
        ? 'Online registration approved under authorized super admin manual payment exception.'
        : 'Online registration approved, student account activated, and enrollment created.',
      admission: updatedAdmission,
      studentCode,
      enrollment: enrollmentRecord,
      expiryDate: expiryDateStr,
    });
  } catch (err: any) {
    console.error('[Admin Approve Registration Exception]', err?.name || 'Exception');
    return res.status(500).json({ ok: false, error: 'Internal server error while approving registration.' });
  }
}
