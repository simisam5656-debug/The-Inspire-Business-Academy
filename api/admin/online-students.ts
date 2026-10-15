import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../_lib/auth';
import { getEnv } from '../_lib/env';

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // Check service-role credentials first
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey && !dbClient) {
      return res.status(500).json({
        ok: false,
        error: 'Server is not configured: add SUPABASE_SERVICE_ROLE_KEY',
      });
    }

    // 1. Authenticate staff: caller must be super_admin or manager holding 'enrollments' permission
    const authResult = await authenticateStaff(req, 'enrollments', dbClient);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({ ok: false, error: authResult.error });
    }

    const actorId = authResult.actorId!;
    const actorRole = authResult.actorRole!;

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    // 3. Parse request payload
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, studentId, reason, fullName, phone, city, email } = body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Student ID is required.' });
    }

    const validActions = ['activate', 'deactivate', 'update', 'reset_password'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid action '${action}'. Supported: activate, deactivate, update, reset_password.`,
      });
    }

    // 4. Fetch target student profile
    const { data: targetProfile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (pErr) {
      return res.status(500).json({ ok: false, error: 'Failed to lookup student profile: ' + pErr.message });
    }

    if (!targetProfile) {
      return res.status(404).json({ ok: false, error: 'Student profile not found.' });
    }

    // CRITICAL SECURITY RULE: It may act ONLY on profiles whose role is 'online_student' (never super_admin or manager)
    if (targetProfile.role !== 'online_student') {
      return res.status(403).json({
        ok: false,
        error: 'Forbidden: Cannot modify staff accounts. Only online_student profiles may be managed.',
      });
    }

    const nowIso = new Date().toISOString();

    // 5. Execute requested action
    if (action === 'activate') {
      const { data: updated, error: uErr } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          updated_at: nowIso,
        })
        .eq('id', studentId)
        .select()
        .single();

      if (uErr) {
        return res.status(500).json({ ok: false, error: 'Failed to activate student account: ' + uErr.message });
      }

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'activate_online_student',
        entity: 'profiles',
        entity_id: studentId,
        details: {
          email: targetProfile.email,
          studentCode: targetProfile.student_code,
          fullName: targetProfile.full_name,
        },
      });

      return res.status(200).json({
        ok: true,
        message: 'Student account activated successfully.',
        profile: updated,
      });
    }

    if (action === 'deactivate') {
      const { data: updated, error: uErr } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: nowIso,
        })
        .eq('id', studentId)
        .select()
        .single();

      if (uErr) {
        return res.status(500).json({ ok: false, error: 'Failed to deactivate student account: ' + uErr.message });
      }

      // Audit Log with optional reason stored in details
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'deactivate_online_student',
        entity: 'profiles',
        entity_id: studentId,
        details: {
          email: targetProfile.email,
          studentCode: targetProfile.student_code,
          fullName: targetProfile.full_name,
          reason: reason || 'Deactivated by administration',
        },
      });

      return res.status(200).json({
        ok: true,
        message: 'Student account deactivated successfully.',
        profile: updated,
      });
    }

    if (action === 'update') {
      const updates: Record<string, any> = {
        updated_at: nowIso,
      };

      if (fullName !== undefined) updates.full_name = String(fullName).trim();
      if (phone !== undefined) updates.phone = String(phone).trim();
      if (city !== undefined) updates.city = String(city).trim();
      if (body.portfolioUrl !== undefined) {
        const raw = String(body.portfolioUrl || '').trim();
        if (raw && !/^https?:\/\/[^\s]+$/i.test(raw)) {
          return res.status(400).json({ ok: false, error: 'Portfolio URL must start with http:// or https://' });
        }
        updates.portfolio_url = raw || null;
      }

      let emailChanged = false;
      const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;

      if (cleanEmail && cleanEmail !== targetProfile.email.toLowerCase()) {
        emailChanged = true;
        // Keep Supabase Auth in sync via supabase.auth.admin.updateUserById
        if (supabase.auth?.admin?.updateUserById) {
          const { error: authErr } = await supabase.auth.admin.updateUserById(studentId, {
            email: cleanEmail,
            email_confirm: true,
          });
          if (authErr) {
            return res.status(400).json({
              ok: false,
              error: 'Failed to update authentication email: ' + authErr.message,
            });
          }
        }
        updates.email = cleanEmail;
      }

      const { data: updated, error: uErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single();

      if (uErr) {
        return res.status(500).json({ ok: false, error: 'Failed to update student profile: ' + uErr.message });
      }

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'update_online_student',
        entity: 'profiles',
        entity_id: studentId,
        details: {
          previous: {
            full_name: targetProfile.full_name,
            phone: targetProfile.phone,
            city: targetProfile.city,
            email: targetProfile.email,
          },
          updated: updates,
          emailChanged,
        },
      });

      return res.status(200).json({
        ok: true,
        message: 'Student profile updated successfully.',
        profile: updated,
      });
    }

    if (action === 'reset_password') {
      const targetEmail = targetProfile.email;
      const siteUrl = getEnv(req, 'VITE_PUBLIC_SITE_URL') || 'https://theinspireacademy.com';

      if (supabase.auth?.resetPasswordForEmail) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${siteUrl}/forgot-password`,
        });

        if (resetErr) {
          return res.status(500).json({
            ok: false,
            error: 'Failed to send password reset email: ' + resetErr.message,
          });
        }
      }

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'reset_password_online_student',
        entity: 'profiles',
        entity_id: studentId,
        details: {
          email: targetEmail,
          studentCode: targetProfile.student_code,
        },
      });

      return res.status(200).json({
        ok: true,
        message: `Password reset email sent to ${targetEmail}.`,
      });
    }

    return res.status(400).json({ ok: false, error: 'Unhandled action.' });
  } catch (err: any) {
    console.error('[Admin Online Students Exception]', err?.name || 'Exception', err);
    return res.status(500).json({ ok: false, error: 'Internal server error while managing online student.' });
  }
}
