import { authenticateStaff } from '../../_lib/auth';
import { runWorkersAi, WorkersAiMessage } from '../../_lib/workersAi';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../../_lib/env';

const ADMIN_AI_SYSTEM_PROMPT = `You are an internal AI Assistant for The Inspire Business Academy administration.
You assist authorized academy staff with drafting and refining academy communications, curriculum outlines, support responses, and report summaries.

STRICT EDITORIAL & ETHICAL POLICIES:
1. All generated text is a DRAFT for human staff review.
2. NEVER fabricate fake student reviews, fake success stories, or fraudulent testimonials. Only format or polish real feedback provided by the administrator.
3. In report summaries, clearly differentiate the provided numeric data from your commentary. Never invent numbers or revenue figures.
4. Keep the tone professional, educational, and inspiring, reflecting the academy's mission: "Hunarmand Pakistan".
5. Support English, Urdu, and Roman Urdu as requested by the administrator.
6. Output clean markdown or plain text only. NEVER output executable code, SQL queries, or HTML scripts.`;

export type AdminAiAction =
  | 'draft_content'
  | 'improve_text'
  | 'summarize_report'
  | 'draft_support_reply'
  | 'draft_course_outline'
  | 'enhance_field';

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // 1. Strict staff authentication & explicit 'ai_tools' permission check
    const authResult = await authenticateStaff(req, 'ai_tools', dbClient);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || 401).json({
        ok: false,
        error: authResult.error || 'Unauthorized access to Admin AI tools.',
      });
    }

    const { actorId, actorRole } = authResult;
    const { action, payload } = req.body || {};

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ ok: false, error: 'Action parameter is required.' });
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, error: 'Payload must be an object with task parameters.' });
    }

    const payloadString = JSON.stringify(payload);
    if (payloadString.length > 3000) {
      return res.status(400).json({ ok: false, error: 'Payload exceeds maximum length limit of 3,000 characters.' });
    }

    // 2. Build task-specific instruction
    let userPrompt = '';
    switch (action as AdminAiAction) {
      case 'draft_content': {
        const { contentType, topic, keyPoints, language } = payload;
        userPrompt = `Please draft an official ${contentType || 'announcement'} for The Inspire Business Academy.
Topic: ${topic || 'General Announcement'}
Key Points: ${keyPoints || 'None provided'}
Language: ${language || 'English & Roman Urdu'}
Format: Clear headline followed by concise, motivating paragraphs.`;
        break;
      }

      case 'improve_text': {
        const { originalText, goal, tone } = payload;
        if (!originalText || !originalText.trim()) {
          return res.status(400).json({ ok: false, error: 'originalText is required for improvement.' });
        }
        userPrompt = `Please review and improve the following text for academy staff.
Goal: ${goal || 'Enhance clarity, spelling, grammar, and professionalism'}
Tone: ${tone || 'Professional & Encouraging'}
Source Text:
"""
${originalText}
"""
Provide the refined text followed by a brief bullet list of notable improvements.`;
        break;
      }

      case 'summarize_report': {
        const { dateRange, metricsSummary, context } = payload;
        userPrompt = `Please generate an executive summary of the following academy operations metrics for internal review.
Date Range: ${dateRange || 'Current Period'}
Context / Notes: ${context || 'General performance'}
Supplied Metrics Data:
"""
${metricsSummary || 'No metrics supplied'}
"""
Highlight key strengths, potential areas for operational attention, and strategic observations. Remember: do not invent new numbers.`;
        break;
      }

      case 'draft_support_reply': {
        const { studentInquiry, studentName, language } = payload;
        if (!studentInquiry || !studentInquiry.trim()) {
          return res.status(400).json({ ok: false, error: 'studentInquiry is required to draft a reply.' });
        }
        userPrompt = `Please draft a courteous, informative response to the following student inquiry.
Student Name: ${studentName || 'Student'}
Language: ${language || 'Polite Roman Urdu or English matching the inquiry'}
Student Inquiry:
"""
${studentInquiry}
"""
Draft a helpful response advising on next steps or recommending our official WhatsApp helpline (0309-3534289) for immediate assistance.`;
        break;
      }

      case 'draft_course_outline': {
        const { courseTitle, targetAudience, durationWeeks, topics } = payload;
        userPrompt = `Please draft a modular course syllabus outline for an upcoming training program at The Inspire Business Academy.
Course Title: ${courseTitle || 'Vocational Training'}
Target Audience: ${targetAudience || 'Beginners and career switchers'}
Duration: ${durationWeeks || 8} weeks
Topics to Cover: ${topics || 'Standard foundational skills'}
Format: Week-by-week module breakdown with clear learning outcomes and practical assignments.`;
        break;
      }

      case 'enhance_field': {
        const { fieldName, fieldValue, context, language: fieldLang } = payload;
        if (!fieldValue || !String(fieldValue).trim()) {
          return res.status(400).json({ ok: false, error: 'fieldValue is required for enhance_field.' });
        }
        if (String(fieldValue).length > 2000) {
          return res.status(400).json({ ok: false, error: 'fieldValue must be under 2000 characters.' });
        }
        userPrompt = `You are enhancing a single form field for an online academy admin panel.

Field: ${fieldName || 'description'}
Context: ${context || 'Course management form for The Inspire Business Academy'}
Language preference: ${fieldLang || 'same as input'}

Original text:
"""
${fieldValue}
"""

Instructions:
- Fix spelling, grammar, and punctuation
- Make it more professional, clear, and engaging
- Keep the original meaning — do NOT add fake claims or invented details
- Keep it concise (do not expand beyond 2x original length)
- Return ONLY the improved text with no preamble, no explanation, no quotes`;
        break;
      }

      default:
        return res.status(400).json({
          ok: false,
          error: `Unsupported AI action: "${action}". Supported actions: draft_content, improve_text, summarize_report, draft_support_reply, draft_course_outline, enhance_field.`,
        });
    }

    // 3. Run Workers AI inference
    const messages: WorkersAiMessage[] = [
      { role: 'system', content: ADMIN_AI_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await runWorkersAi(req, messages, {
      maxTokens: 800,
      temperature: 0.5,
    });

    if (!aiResult.ok) {
      const statusCode = aiResult.configured === false ? 503 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: aiResult.error || 'Failed to generate AI response.',
        correlationId: aiResult.correlationId,
      });
    }

    // 4. Record audit log entry (non-blocking)
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');
    if (dbClient || (supabaseUrl && serviceKey)) {
      try {
        const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole || 'manager',
          action: 'admin_ai_generate',
          entity: 'ai_tools',
          details: {
            action,
            correlationId: aiResult.correlationId,
            modelUsed: aiResult.modelUsed,
          },
        });
      } catch (_) {
        // Non-blocking for audit log write
      }
    }

    return res.status(200).json({
      ok: true,
      action,
      resultText: aiResult.text,
      correlationId: aiResult.correlationId,
      modelUsed: aiResult.modelUsed,
    });
  } catch (err: any) {
    console.error(`[Admin AI API Error] type=${err?.name || 'Exception'}`);
    return res.status(500).json({
      ok: false,
      error: 'An internal error occurred while processing the admin AI request.',
    });
  }
}
