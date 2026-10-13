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
    const authResult = await authenticateStaff(req, 'enrollments', dbClient);
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
    const { action, enrollmentId, userId, courseId, daysToAdd, newExpiryDate, reason } = body;

    const nowIso = new Date().toISOString();

    // Action: Manual Grant without payment
    if (action === 'grant' || action === 'manual_grant') {
      if (!userId || !courseId) {
        return res.status(400).json({ ok: false, error: 'User ID and Course ID are required to grant access.' });
      }

      const provRes = await provisionEnrollment({
        supabase,
        userId,
        courseId,
        actorId,
        actorRole,
        mode: 'initial',
      });

      if (!provRes.ok) {
        return res.status(500).json({ ok: false, error: provRes.error || 'Failed to grant course access.' });
      }

      if (actorId) {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            actor_role: actorRole,
            action: 'manual_grant_enrollment',
            entity: 'student_enrollments',
            entity_id: provRes.enrollment?.id || courseId,
            details: {
              userId,
              courseId,
              studentCode: provRes.studentCode,
              expiryDate: provRes.expiryDate,
              reason: reason || 'Manual access grant without payment',
            },
          });
        } catch (_) {}
      }

      return res.status(200).json({
        ok: true,
        message: 'Course access successfully granted.',
        enrollment: provRes.enrollment,
        studentCode: provRes.studentCode,
        expiryDate: provRes.expiryDate,
      });
    }

    if (!enrollmentId) {
      return res.status(400).json({ ok: false, error: 'Enrollment ID is required.' });
    }

    // Fetch existing enrollment
    const { data: enrollment, error: eErr } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (eErr || !enrollment) {
      return res.status(404).json({ ok: false, error: 'Enrollment record not found.' });
    }

    let updatedEnrollment: any = null;

    if (action === 'extend') {
      const currentExpiry = new Date(enrollment.expiry_date || new Date());
      let targetDate: Date;

      if (newExpiryDate) {
        targetDate = new Date(newExpiryDate);
      } else {
        const days = Number(daysToAdd) || 30;
        targetDate = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
      }

      const targetDateStr = targetDate.toISOString().split('T')[0];
      const prevExpiryStr = enrollment.expiry_date;

      const historyItem = {
        action: 'extended',
        actorId,
        actorRole,
        timestamp: nowIso,
        previousExpiryDate: prevExpiryStr,
        newExpiryDate: targetDateStr,
        reason: reason || 'Staff extension granted',
      };

      const existingHistory = Array.isArray(enrollment.extension_history) ? enrollment.extension_history : [];
      const updatedHistory = [...existingHistory, historyItem];

      const { data: uEnr, error: uErr } = await supabase
        .from('student_enrollments')
        .update({
          expiry_date: targetDateStr,
          status: 'active', // Reactivate if it was expired
          extended_count: (Number(enrollment.extended_count) || 0) + 1,
          extension_history: updatedHistory,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (uErr) {
        console.error('[Admin Enrollment Update DB Error]', uErr?.code || 'DB_ERROR');
        return res.status(500).json({ ok: false, error: 'Failed to update enrollment record in database.' });
      }
      updatedEnrollment = uEnr;

      if (actorId) {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            actor_role: actorRole,
            action: 'extend_enrollment',
            entity: 'student_enrollments',
            entity_id: enrollmentId,
            details: historyItem,
          });
        } catch (_) {}
      }

      return res.status(200).json({
        ok: true,
        message: `Enrollment extended until ${targetDateStr}.`,
        enrollment: updatedEnrollment,
      });
    } else if (action === 'suspend') {
      const historyItem = {
        action: 'suspended',
        actorId,
        actorRole,
        timestamp: nowIso,
        reason: reason || 'Suspended by administration',
      };

      const existingHistory = Array.isArray(enrollment.extension_history) ? enrollment.extension_history : [];
      const updatedHistory = [...existingHistory, historyItem];

      const { data: uEnr, error: uErr } = await supabase
        .from('student_enrollments')
        .update({
          status: 'suspended',
          extension_history: updatedHistory,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (uErr) {
        console.error('[Admin Enrollment Suspend DB Error]', uErr?.code || 'DB_ERROR');
        return res.status(500).json({ ok: false, error: 'Failed to update enrollment status in database.' });
      }
      updatedEnrollment = uEnr;

      if (actorId) {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            actor_role: actorRole,
            action: 'suspend_enrollment',
            entity: 'student_enrollments',
            entity_id: enrollmentId,
            details: historyItem,
          });
        } catch (_) {}
      }

      return res.status(200).json({
        ok: true,
        message: 'Enrollment suspended.',
        enrollment: updatedEnrollment,
      });
    } else if (action === 'reactivate') {
      const historyItem = {
        action: 'reactivated',
        actorId,
        actorRole,
        timestamp: nowIso,
        reason: reason || 'Reactivated by administration',
      };

      const existingHistory = Array.isArray(enrollment.extension_history) ? enrollment.extension_history : [];
      const updatedHistory = [...existingHistory, historyItem];

      const { data: uEnr, error: uErr } = await supabase
        .from('student_enrollments')
        .update({
          status: 'active',
          extension_history: updatedHistory,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (uErr) {
        console.error('[Admin Enrollment Reactivate DB Error]', uErr?.code || 'DB_ERROR');
        return res.status(500).json({ ok: false, error: 'Failed to update enrollment status in database.' });
      }
      updatedEnrollment = uEnr;

      if (actorId) {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            actor_role: actorRole,
            action: 'reactivate_enrollment',
            entity: 'student_enrollments',
            entity_id: enrollmentId,
            details: historyItem,
          });
        } catch (_) {}
      }

      return res.status(200).json({
        ok: true,
        message: 'Enrollment reactivated.',
        enrollment: updatedEnrollment,
      });
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid action. Supported: grant, extend, suspend, reactivate.' });
    }
  } catch (err: any) {
    console.error('[Admin Enrollment Exception]', err?.name || 'Exception');
    return res.status(500).json({ ok: false, error: 'Internal server error while processing enrollment.' });
  }
}
