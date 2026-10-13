import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../_lib/auth';
import { getEnv } from '../_lib/env';

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
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
    const { paymentId, reason } = body;

    if (!paymentId) {
      return res.status(400).json({ ok: false, error: 'Payment ID is required.' });
    }

    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    if (!cleanReason) {
      return res.status(400).json({
        ok: false,
        error: 'A rejection reason is required so the student knows why their payment was not approved.',
      });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedPayment, error: uErr } = await supabase
      .from('online_payments')
      .update({
        payment_status: 'rejected',
        rejection_reason: cleanReason,
        verified_by: actorId,
        verified_at: nowIso,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (uErr) {
      console.error('[Admin Reject Payment DB Error]', uErr?.code || 'DB_ERROR');
      return res.status(500).json({ ok: false, error: 'Failed to update payment status in database.' });
    }

    if (actorId) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole,
          action: 'reject_online_payment',
          entity: 'online_payments',
          entity_id: paymentId,
          details: {
            reason: cleanReason,
          },
        });
      } catch (e: any) {
        console.warn('Audit log write error:', e);
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Payment rejected successfully.',
      payment: updatedPayment,
    });
  } catch (err: any) {
    console.error('[Admin Reject Payment Exception]', err?.name || 'Exception');
    return res.status(500).json({ ok: false, error: 'Internal server error while rejecting payment.' });
  }
}
