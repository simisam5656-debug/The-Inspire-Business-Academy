/**
 * POST /api/admin/ai/import-course
 * AI-powered JSON course importer.
 *
 * Admin uploads a JSON string (any shape). AI parses, validates, fills
 * missing fields, enhances descriptions, and returns a normalized preview.
 * Nothing is written to DB here — the frontend sends a follow-up save call
 * after admin approval.
 *
 * Security:
 *  - Staff-only (requires ai_tools permission)
 *  - Input capped at 20 KB
 *  - AI output is strict JSON only
 */
import { authenticateStaff } from '../../_lib/auth';
import { runWorkersAi, WorkersAiMessage } from '../../_lib/workersAi';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../_lib/env';

const IMPORT_SYSTEM_PROMPT = `You are a JSON normalizer for The Inspire Business Academy admin panel.
You receive a raw JSON object (any shape / partial / messy) representing a course with modules and lessons.
Your job is to return a single valid JSON object in the EXACT schema below.

Rules:
1. Extract all meaningful data from the input.
2. Enhance titles and descriptions: fix grammar, spelling, make them professional and inspiring.
3. NEVER invent student counts, fees, prices, or enrollment numbers.
4. If a required field is missing, use a sensible placeholder wrapped in [brackets] e.g. "[Add description here]".
5. Return ONLY the JSON object — no markdown, no code fences, no explanation.
6. slugify titles: lowercase, spaces → hyphens, remove special chars.

Output schema:
{
  "title": "string",
  "titleRomanUrdu": "string or empty",
  "slug": "string (slugified from title)",
  "shortDescription": "string (1-2 sentences)",
  "fullDescription": "string (2-4 sentences)",
  "category": "business|tech|design|language|other",
  "status": "draft",
  "modules": [
    {
      "title": "string",
      "titleRomanUrdu": "string or empty",
      "description": "string or empty",
      "order": number,
      "lessons": [
        {
          "title": "string",
          "titleRomanUrdu": "string or empty",
          "description": "string or empty",
          "youtubeUrl": "string or empty",
          "durationMinutes": number,
          "isFreePreview": false,
          "order": number
        }
      ]
    }
  ]
}`;

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const authResult = await authenticateStaff(req, 'ai_tools', dbClient);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({
        ok: false,
        error: authResult.error || 'Unauthorized',
      });
    }

    const { actorId, actorRole } = authResult;
    const { jsonText } = req.body || {};

    if (!jsonText || typeof jsonText !== 'string') {
      return res.status(400).json({ ok: false, error: 'jsonText (string) is required.' });
    }

    if (jsonText.length > 20000) {
      return res.status(400).json({ ok: false, error: 'JSON input must be under 20 KB.' });
    }

    // Basic check: must be parseable JSON
    try {
      JSON.parse(jsonText);
    } catch {
      // Let AI try to fix it anyway — some users paste slightly malformed JSON
    }

    const messages: WorkersAiMessage[] = [
      { role: 'system', content: IMPORT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the raw course JSON to normalize and enhance:\n\n${jsonText}`,
      },
    ];

    const aiResult = await runWorkersAi(req, messages, {
      maxTokens: 2000,
      temperature: 0.2, // Low temperature for structured JSON
    });

    if (!aiResult.ok) {
      return res.status(500).json({
        ok: false,
        error: aiResult.error || 'AI processing failed.',
        correlationId: aiResult.correlationId,
      });
    }

    // Parse AI output as JSON
    let parsed: any;
    try {
      // Strip any accidental markdown fences
      const clean = (aiResult.text || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(422).json({
        ok: false,
        error: 'AI returned invalid JSON. Please simplify your input and try again.',
        rawOutput: (aiResult.text || '').substring(0, 500),
        correlationId: aiResult.correlationId,
      });
    }

    // Audit log (non-blocking)
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');
    if (dbClient || (supabaseUrl && serviceKey)) {
      try {
        const sb = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
        await sb.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole || 'manager',
          action: 'admin_ai_import_course',
          entity: 'ai_tools',
          details: { correlationId: aiResult.correlationId, modelUsed: aiResult.modelUsed },
        });
      } catch (_) {}
    }

    return res.status(200).json({
      ok: true,
      course: parsed,
      correlationId: aiResult.correlationId,
      modelUsed: aiResult.modelUsed,
    });
  } catch (err: any) {
    console.error('[Import Course AI Error]', err?.name);
    return res.status(500).json({ ok: false, error: 'Internal server error during AI course import.' });
  }
}
