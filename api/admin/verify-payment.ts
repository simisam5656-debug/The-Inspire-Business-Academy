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
    // 1. Strict Authenticate caller & check permissions
    const authResult = await authenticateStaff(req, 'payments', dbClient);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({ ok: false, error: authResult.error });
    }

    const actorId = authResult.actorId!;
    const actorRole = authResult.actorRole!;

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceKey)) {
      return res.status(500).json({ ok: false, error: 'Database credentials not configured.' });
    }

    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { paymentId, adminNotes, action, accessAction, grantAccess } = body;

    if (!paymentId) {
      return res.status(400).json({ ok: false, error: 'Payment ID is required.' });
    }

    // 2. Fetch payment record
    const { data: payment, error: pErr } = await supabase
      .from('online_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (pErr || !payment) {
      return res.status(404).json({ ok: false, error: 'Payment record not found.' });
    }

    // Determine requested action
    // accessAction / action can be: 'grant' | 'grant_now' | 'verify_only' | 'deny'
    const isGrantRequested =
      grantAccess === true ||
      action === 'grant' ||
      action === 'grant_now' ||
      accessAction === 'grant' ||
      accessAction === 'grant_now';

    const isDenyRequested = action === 'deny' || accessAction === 'deny';
    const isVerifyOnlyRequested =
      action === 'verify_only' || accessAction === 'verify_only' || (!isGrantRequested && !isDenyRequested);

    // Resolve target student user ID
    let targetUserId = payment.user_id;
    if (!targetUserId && payment.admission_id) {
      const { data: admission } = await supabase
        .from('admissions')
        .select('id, user_id, email, course_slug')
        .eq('id', payment.admission_id)
        .maybeSingle();

      if (admission) {
        if (admission.user_id) {
          targetUserId = admission.user_id;
        } else if (admission.email) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', admission.email.toLowerCase())
            .maybeSingle();
          if (prof) targetUserId = prof.id;
        }
      }
    }

    // Resolve course IDs for enrollment
    const targetCourseIds: string[] = [];

    // 1. If explicit selected_course_ids array is present
    if (Array.isArray(payment.selected_course_ids) && payment.selected_course_ids.length > 0) {
      targetCourseIds.push(...payment.selected_course_ids);
    }

    // 2. If package_id is present
    if (payment.package_id) {
      const { data: pkg } = await supabase
        .from('packages')
        .select('id, package_type')
        .eq('id', payment.package_id)
        .maybeSingle();

      if (pkg?.package_type === 'all_courses') {
        const { data: allOnlineCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('status', 'published');
        if (allOnlineCourses) {
          allOnlineCourses.forEach((c: any) => {
            if (!targetCourseIds.includes(c.id)) targetCourseIds.push(c.id);
          });
        }
      } else if (targetCourseIds.length === 0) {
        // Query package_courses
        const { data: pkgCourses } = await supabase
          .from('package_courses')
          .select('course_id')
          .eq('package_id', payment.package_id);
        if (pkgCourses) {
          pkgCourses.forEach((pc: any) => {
            if (!targetCourseIds.includes(pc.course_id)) targetCourseIds.push(pc.course_id);
          });
        }
      }
    }

    // 2b. If package is not linked by ID but request_type is package or course_slug is a package slug
    if (targetCourseIds.length === 0 && (payment.request_type === 'package' || payment.package_slug || payment.course_slug)) {
      const pkgSlug = payment.package_slug || payment.course_slug;
      if (pkgSlug) {
        const { data: pkgBySlug } = await supabase
          .from('packages')
          .select('id, package_type')
          .eq('slug', pkgSlug)
          .maybeSingle();

        if (pkgBySlug?.package_type === 'all_courses') {
          const { data: allOnlineCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('status', 'published');
          if (allOnlineCourses) {
            allOnlineCourses.forEach((c: any) => {
              if (!targetCourseIds.includes(c.id)) targetCourseIds.push(c.id);
            });
          }
        } else if (pkgBySlug?.id) {
          const { data: pkgCourses } = await supabase
            .from('package_courses')
            .select('course_id')
            .eq('package_id', pkgBySlug.id);
          if (pkgCourses) {
            pkgCourses.forEach((pc: any) => {
              if (!targetCourseIds.includes(pc.course_id)) targetCourseIds.push(pc.course_id);
            });
          }
        }
      }
    }

    // 3. If direct course_id is present
    if (payment.course_id && !targetCourseIds.includes(payment.course_id)) {
      targetCourseIds.push(payment.course_id);
    }

    // 4. If course_slug is present and no course IDs resolved yet
    if (targetCourseIds.length === 0 && payment.course_slug) {
      const { data: crs } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', payment.course_slug)
        .maybeSingle();
      if (crs) targetCourseIds.push(crs.id);
    }

    const nowIso = new Date().toISOString();

    // Case A: Payment already verified and no grant/deny requested
    if (payment.payment_status === 'verified' && !isGrantRequested && !isDenyRequested) {
      let existingEnrollmentInfo: any = null;

      // Only recheck/retrieve enrollment if access_status is explicitly 'granted'
      if (payment.access_status === 'granted' && targetUserId && targetCourseIds.length > 0) {
        const provRes = await provisionEnrollment({
          supabase,
          userId: targetUserId,
          courseId: targetCourseIds[0],
          paymentId: payment.id,
          actorId,
          actorRole,
          mode: 'recheck',
        });

        if (provRes.ok) {
          existingEnrollmentInfo = {
            studentCode: provRes.studentCode,
            expiryDate: provRes.expiryDate,
            id: provRes.enrollment?.id,
            status: provRes.enrollment?.status || provRes.status || 'active',
            ...(provRes.note ? { note: provRes.note } : {}),
          };
        }
      }

      return res.status(200).json({
        ok: true,
        message: 'Payment was already verified.',
        payment,
        accessStatus: payment.access_status || 'pending',
        provisionedCourses: [],
        enrollment: existingEnrollmentInfo || {
          studentCode: null,
          expiryDate: null,
        },
      });
    }

    // Prepare payment updates
    let updatedAccessStatus = payment.access_status || 'pending';
    if (isGrantRequested) {
      updatedAccessStatus = 'granted';
    } else if (isDenyRequested) {
      updatedAccessStatus = 'denied';
    } else if (isVerifyOnlyRequested) {
      updatedAccessStatus = 'pending';
    }

    const paymentUpdates: any = {
      payment_status: 'verified',
      verified_by: payment.verified_by || actorId,
      verified_at: payment.verified_at || nowIso,
      rejection_reason: null,
      access_status: updatedAccessStatus,
      access_reviewed_by: actorId,
      access_reviewed_at: nowIso,
    };

    const { data: updatedPayment, error: uErr } = await supabase
      .from('online_payments')
      .update(paymentUpdates)
      .eq('id', paymentId)
      .select()
      .single();

    if (uErr) {
      console.error('[Admin Verify Payment DB Error]', uErr?.code || 'DB_ERROR');
      return res.status(500).json({ ok: false, error: 'Failed to update payment status in database.' });
    }

    // Update linked admission record if present
    if (payment.admission_id) {
      try {
        await supabase
          .from('admissions')
          .update({
            status: 'approved',
            reviewed_by: actorId,
            reviewed_at: nowIso,
            admin_notes: adminNotes || `Verified via payment ${payment.reference_number}. Access: ${updatedAccessStatus}`,
          })
          .eq('id', payment.admission_id);
      } catch (_) {}
    }

    // Provision enrollments ONLY when access is granted
    const provisionedEnrollments: any[] = [];
    if (isGrantRequested && targetUserId && targetCourseIds.length > 0) {
      const provMode = payment.payment_status === 'verified' ? 'recheck' : 'initial';
      for (const cId of targetCourseIds) {
        const provRes = await provisionEnrollment({
          supabase,
          userId: targetUserId,
          courseId: cId,
          paymentId: paymentId,
          actorId,
          actorRole,
          mode: provMode,
        });

        if (!provRes.ok) {
          console.error('[Admin Verify Payment Enrollment Provisioning Failed]', provRes.error);
          return res.status(500).json({
            ok: false,
            error: `Payment verified, but enrollment provisioning failed for course: ${provRes.error}. Please retry.`,
            payment: updatedPayment,
            provisioningFailed: true,
          });
        }

        provisionedEnrollments.push({
          courseId: cId,
          studentCode: provRes.studentCode,
          expiryDate: provRes.expiryDate,
          id: provRes.enrollment?.id,
          status: provRes.enrollment?.status || provRes.status || 'active',
          ...(provRes.note ? { note: provRes.note } : {}),
        });
      }
    }

    // Audit log
    if (actorId) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole,
          action: isGrantRequested ? 'verify_and_grant_access' : isDenyRequested ? 'verify_and_deny_access' : 'verify_online_payment',
          entity: 'online_payments',
          entity_id: paymentId,
          details: {
            transactionId: payment.transaction_id,
            amount: payment.final_amount,
            referenceNumber: payment.reference_number,
            accessStatus: updatedAccessStatus,
            provisionedCourses: provisionedEnrollments.map((e) => e.courseId),
            notes: adminNotes || undefined,
          },
        });
      } catch (e: any) {
        console.warn('Audit log write error:', e);
      }
    }

    const firstEnrollment = provisionedEnrollments[0] || null;

    return res.status(200).json({
      ok: true,
      message: isGrantRequested
        ? 'Payment verified and access granted to course(s).'
        : isDenyRequested
        ? 'Payment verified, course access denied.'
        : 'Payment verified. Course access remains pending review.',
      payment: updatedPayment,
      accessStatus: updatedAccessStatus,
      provisionedCourses: provisionedEnrollments.map((e) => e.courseId),
      enrollments: provisionedEnrollments,
      enrollment: firstEnrollment || {
        studentCode: null,
        expiryDate: null,
      },
    });
  } catch (err: any) {
    console.error('[Admin Verify Payment Exception]', err?.name || 'Exception', err?.message, err?.stack);
    return res.status(500).json({ ok: false, error: 'Internal server error while verifying payment.' });
  }
}
