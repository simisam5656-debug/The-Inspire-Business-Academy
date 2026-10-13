import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../_lib/env';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// In-memory sliding window rate limiter: 20 upload requests per 10 minutes per IP
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const rawIp =
      req.headers?.['cf-connecting-ip'] ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      'anonymous';

    if (!checkRateLimit(rawIp)) {
      return res.status(429).json({
        ok: false,
        error: 'Too many upload requests. Please wait a few minutes before trying again.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { contentType, fileSize } = body;

    if (!contentType || typeof contentType !== 'string' || !ALLOWED_MIME_TYPES[contentType.toLowerCase()]) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid file type. Allowed types: JPEG, PNG, WEBP, and PDF only.',
      });
    }

    const cleanContentType = contentType.toLowerCase();
    const ext = ALLOWED_MIME_TYPES[cleanContentType];

    const numericSize = Number(fileSize);
    if (isNaN(numericSize) || numericSize <= 0 || numericSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        ok: false,
        error: 'File size must be between 1 byte and 5 MB.',
      });
    }

    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceKey)) {
      return res.status(503).json({
        ok: false,
        error: 'Storage service unavailable.',
      });
    }

    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomUuid = crypto.randomUUID();
    const storagePath = `proofs/${year}/${month}/${randomUuid}.${ext}`;

    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('Failed to create signed upload url:', error?.message || 'Unknown error');
      return res.status(500).json({
        ok: false,
        error: 'Failed to initialize secure upload destination.',
      });
    }

    return res.status(200).json({
      ok: true,
      path: data.path || storagePath,
      token: data.token,
    });
  } catch (err: any) {
    console.error('Proof upload URL unexpected error:', err?.message || 'Unknown error');
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred while generating payment proof upload URL.',
    });
  }
}
