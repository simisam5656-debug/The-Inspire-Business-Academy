import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../_lib/auth';
import { getEnv } from '../_lib/env';

/**
 * Validates and sanitizes a storage path against path traversal attacks.
 * Path cannot contain .., \ or null bytes, and must not escape the target bucket.
 */
function isSafeStoragePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..') || path.includes('\\') || path.includes('\0')) return false;
  // Disallow leading slashes or absolute protocols
  if (path.startsWith('/') || path.includes('://')) return false;
  return true;
}

function normalizeProofPath(rawPath: string): string {
  return rawPath.replace(/^payment-proofs\//, '').trim();
}

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

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceKey)) {
      return res.status(500).json({ ok: false, error: 'Database credentials not configured.' });
    }

    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { storagePath, paymentId, referenceNumber } = body;

    // Require either paymentId or referenceNumber for authoritative verification
    if (!paymentId && !referenceNumber) {
      return res.status(400).json({
        ok: false,
        error: 'Payment identifier (paymentId or referenceNumber) is required to access payment proof.',
      });
    }

    // Query the authoritative payment record
    let query = supabase
      .from('online_payments')
      .select('id, reference_number, screenshot_path');

    if (paymentId) {
      query = query.eq('id', paymentId);
    } else if (referenceNumber) {
      query = query.eq('reference_number', referenceNumber);
    }

    const { data: paymentRecord, error: pErr } = await query.maybeSingle();

    if (pErr) {
      console.error('Error querying payment proof record:', pErr);
      return res.status(500).json({ ok: false, error: 'Failed to query payment record.' });
    }

    if (!paymentRecord) {
      return res.status(404).json({ ok: false, error: 'Payment record not found.' });
    }

    if (!paymentRecord.screenshot_path) {
      return res.status(404).json({ ok: false, error: 'No proof file is associated with this payment.' });
    }

    const authoritativePath = normalizeProofPath(paymentRecord.screenshot_path);

    // If a storagePath was explicitly supplied, verify it matches the authoritative record
    if (storagePath) {
      const requestedPath = normalizeProofPath(storagePath);
      if (requestedPath !== authoritativePath) {
        return res.status(403).json({
          ok: false,
          error: 'Forbidden: Requested storage path does not match the payment record.',
        });
      }
    }

    // Validate path against directory traversal
    if (!isSafeStoragePath(authoritativePath)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid or unsafe storage path detected.',
      });
    }

    // Generate short-lived signed URL (300 seconds / 5 minutes)
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(authoritativePath, 300);

    if (error || !data?.signedUrl) {
      console.error('Storage signed URL generation error:', error);
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate signed URL from storage service.',
      });
    }

    return res.status(200).json({
      ok: true,
      signedUrl: data.signedUrl,
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    console.error('Signed URL handler exception:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error occurred.' });
  }
}
