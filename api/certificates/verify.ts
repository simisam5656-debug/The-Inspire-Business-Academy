import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../_lib/env';

export default async function handler(req: any, res: any, dbClient?: any) {
  // Safe CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL') || '';
    // Public certificate verification strictly uses browser-safe anon / publishable key adhering to least privilege.
    // SUPABASE_SERVICE_ROLE_KEY is intentionally excluded to prevent bypassing RLS policies.
    const supabaseKey =
      getEnv(req, 'SUPABASE_ANON_KEY') ||
      getEnv(req, 'SUPABASE_PUBLISHABLE_KEY') ||
      getEnv(req, 'VITE_SUPABASE_PUBLISHABLE_KEY') ||
      '';

    let identifier = '';
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost:3000');
      identifier = url.searchParams.get('code') || url.searchParams.get('token') || url.searchParams.get('id') || '';
    } else {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      identifier = body.identifier || body.code || body.token || '';
    }

    identifier = (identifier || '').trim();
    if (!identifier) {
      return res.status(400).json({ ok: false, error: 'Certificate code or verification token is required.' });
    }

    if (identifier.length < 3 || identifier.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(identifier)) {
      return res.status(400).json({ ok: false, error: 'Malformed certificate code or verification token.' });
    }

    if (!dbClient && (!supabaseUrl || !supabaseKey)) {
      return res.status(503).json({
        ok: false,
        error: 'Database service unavailable. Certificate verification cannot be processed.',
      });
    }

    const supabase = dbClient || createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Query authoritative certificate record (non-sensitive verification columns only)
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('certificate_code, recipient_name, course_title, course_titles, duration_text, completion_date, student_type, issue_date, score_percentage, final_grade, status, revoked_at, revocation_reason')
      .or(`certificate_code.eq.${identifier},verification_token.eq.${identifier}`)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: 'Database query failure occurred during certificate verification.',
      });
    }

    if (!cert) {
      return res.status(404).json({
        ok: false,
        found: false,
        error: 'No certificate matched the provided code or token.',
      });
    }

    const isValid = cert.status === 'valid';

    const courseTitles = Array.isArray(cert.course_titles) && cert.course_titles.length > 0
      ? cert.course_titles
      : cert.course_title
      ? [cert.course_title]
      : [];

    return res.status(200).json({
      ok: true,
      found: true,
      isValid,
      certificate: {
        certificateCode: cert.certificate_code,
        recipientName: cert.recipient_name,
        courseTitle: cert.course_title || (courseTitles.length > 0 ? courseTitles.join(', ') : 'Certified Program'),
        courseTitles,
        durationText: cert.duration_text || null,
        completionDate: cert.completion_date || cert.issue_date,
        studentType: cert.student_type === 'online' ? 'Online Certified Program' : 'Physical Academy Diploma',
        issueDate: cert.issue_date,
        scorePercentage: cert.score_percentage ? Number(cert.score_percentage) : null,
        finalGrade: cert.final_grade,
        status: cert.status,
        revokedAt: cert.revoked_at,
        revocationReason: cert.revocation_reason,
      },
    });
  } catch (err: any) {
    console.error('Verify certificate handler error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error occurred.' });
  }
}

