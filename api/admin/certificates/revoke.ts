import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../../_lib/auth';
import { getEnv } from '../../_lib/env';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const authResult = await authenticateStaff(req, 'certificates');
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({ ok: false, error: authResult.error });
    }

    const actorId = authResult.actorId!;
    const actorRole = authResult.actorRole!;

    const { certificateId, reason } = req.body || {};

    if (!certificateId || !reason || !reason.trim()) {
      return res.status(400).json({ ok: false, error: 'Certificate ID and mandatory revocation reason required.' });
    }

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ ok: false, error: 'Server database credentials not configured.' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: now,
        revocation_reason: reason.trim(),
        revoked_by: actorId || null,
        updated_at: now,
      })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) {
      console.error('Revoke certificate DB error:', error?.code || 'DB_ERROR');
      return res.status(500).json({ ok: false, error: 'Database operation failed while revoking certificate.' });
    }

    // Write audit log
    if (actorId) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole || 'super_admin',
          action: 'revoke_certificate_api',
          entity: 'certificates',
          entity_id: certificateId,
          details: { reason: reason.trim(), revokedAt: now },
        });
      } catch (_) {}
    }

    return res.status(200).json({
      ok: true,
      message: 'Certificate successfully revoked.',
      certificate: updated,
    });
  } catch (err: any) {
    console.error('Revoke certificate handler exception:', err?.name || 'Exception');
    return res.status(500).json({ ok: false, error: 'Internal server error while processing revocation.' });
  }
}
