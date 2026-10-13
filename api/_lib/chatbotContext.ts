import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

export const CHATBOT_ALLOWED_TABLES = [
  'chatbot_settings',
  'chatbot_knowledge',
  'courses',
  'faqs',
  'site_settings_public',
  'packages',
  'offers',
  'announcements',
  'short_sessions',
] as const;

export type ChatbotAllowedTable = (typeof CHATBOT_ALLOWED_TABLES)[number];

export function assertAllowedChatbotTable(tableName: string): void {
  if (!CHATBOT_ALLOWED_TABLES.includes(tableName as ChatbotAllowedTable)) {
    throw new Error(
      `[SECURITY VIOLATION] Chatbot context builder attempted to access unauthorized table: "${tableName}". Chatbot is strictly restricted to public tables.`
    );
  }
}

export const STATIC_FALLBACK_PROMPT = `You are the official AI Assistant for The Inspire Business Academy (Mission: Hunarmand Pakistan).
Your job is to provide accurate, helpful, and courteous information to visitors and students in English and Roman Urdu.

CRITICAL ACADEMY KNOWLEDGE:
- Academy Name: The Inspire Business Academy (Hunarmand Pakistan)
- Founder & Leadership: Adeel Bhatti
- Campus Location: Main Campus, Sadiqabad, Rahim Yar Khan District, Punjab, Pakistan
- Official WhatsApp / Helpline: Refer to official helpline details on website
- Physical Package: Comprehensive Vocational Program (Monday - Friday). Dedicated computer lab workstations available on campus (no laptops given to take home).
- Online Courses: Self-paced video lessons with chapter quizzes and final exam.
- Passing Requirement: Minimum 70% passing score on final examination is required for verified certificate.
- Verification: Public certificate verification is available 24/7 at /verify.

CRITICAL SECURITY & PRIVACY RULES:
1. You must NEVER read, disclose, or discuss private records, student profiles, admissions records, fee ledger, expenses, payment screenshots, audit logs, admin messages, passwords, coupons, or promo codes.
2. If asked about student personal information, account balances, or secret discounts, politely refuse and instruct the user to contact the official WhatsApp helpline.
3. If user writes in Roman Urdu, respond in clear Roman Urdu. If in English, respond in English.
4. Never invent prices or fabricate guarantees.`;

export interface ChatbotContextResult {
  systemPrompt: string;
  isEnabled: boolean;
  greeting?: string;
  greetingEn?: string;
  greetingRomanUrdu?: string;
  fallbackMessage?: string;
  extraInstructions?: string;
  fromCache?: boolean;
}

interface CacheEntry {
  result: ChatbotContextResult;
  expiresAt: number;
}

let inMemoryCache: CacheEntry | null = null;

export function clearChatbotContextCache(): void {
  inMemoryCache = null;
}

export async function buildChatbotContext(
  req?: any,
  customDb?: any
): Promise<ChatbotContextResult> {
  const now = Date.now();

  // Return cached result if valid and not a custom test DB injection
  if (!customDb && inMemoryCache && inMemoryCache.expiresAt > now) {
    return { ...inMemoryCache.result, fromCache: true };
  }

  let db = customDb;
  if (!db) {
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY') || getEnv(req, 'VITE_SUPABASE_PUBLISHABLE_KEY');

    if (supabaseUrl && serviceKey) {
      db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    }
  }

  if (!db) {
    return {
      systemPrompt: STATIC_FALLBACK_PROMPT,
      isEnabled: true,
      fallbackMessage:
        'Hamari AI helpline masroof hai. Barahe karam official WhatsApp par rabta karein.',
    };
  }

  try {
    // Helper to safely query allowed tables only
    const queryTable = async (table: string, selectFields: string, modifier?: (q: any) => any) => {
      assertAllowedChatbotTable(table);
      let q = db.from(table).select(selectFields);
      if (modifier) {
        q = modifier(q);
      }
      const { data, error } = await q;
      if (error) {
        console.warn(`[Chatbot Context] Error querying table ${table}:`, error.message);
        return [];
      }
      return data || [];
    };

    // 1. Chatbot settings
    assertAllowedChatbotTable('chatbot_settings');
    let settingsRow: any = null;
    try {
      const { data: sData } = await db
        .from('chatbot_settings')
        .select('is_enabled, greeting, greeting_en, greeting_roman_urdu, extra_instructions, fallback_message')
        .eq('id', 'default')
        .maybeSingle();
      settingsRow = sData;
    } catch (e: any) {
      console.warn('[Chatbot Context] Could not read chatbot_settings:', e?.message);
    }

    const isEnabled = settingsRow?.is_enabled !== false;
    const fallbackMessage =
      settingsRow?.fallback_message ||
      'Hamari AI helpline filwaqt masroof hai. Baraye meharbani WhatsApp par rabta farmayein.';
    const extraInstructions = settingsRow?.extra_instructions || '';

    // If disabled, return early
    if (!isEnabled) {
      return {
        systemPrompt: STATIC_FALLBACK_PROMPT,
        isEnabled: false,
        fallbackMessage,
      };
    }

    // 2. Chatbot knowledge entries (highest priority)
    const knowledgeRows = await queryTable(
      'chatbot_knowledge',
      'title, category, content, keywords',
      (q) => q.eq('is_active', true).order('display_order', { ascending: true })
    );

    // 3. Site settings public
    let siteSettings: any = null;
    try {
      assertAllowedChatbotTable('site_settings_public');
      const { data: ssData } = await db
        .from('site_settings_public')
        .select(
          'academy_name, campus_address, phone, whatsapp, opening_time, closing_time, working_days_text, physical_monthly_fee, physical_total_fee, online_course_price'
        )
        .eq('id', 'default')
        .maybeSingle();
      siteSettings = ssData;
    } catch (e: any) {
      console.warn('[Chatbot Context] Could not read site_settings_public:', e?.message);
    }

    // 4. Published courses
    const coursesRows = await queryTable(
      'courses',
      'title, short_description, price, online_price, duration_value, available_for_physical, available_for_online',
      (q) => q.eq('status', 'published').order('display_order', { ascending: true })
    );

    // 5. Published FAQs
    const faqRows = await queryTable(
      'faqs',
      'question, answer',
      (q) => q.eq('is_published', true).order('display_order', { ascending: true })
    );

    // 6. Active Packages (without promo codes!)
    const packageRows = await queryTable(
      'packages',
      'title, description, package_type, courses_count',
      (q) => q.eq('is_active', true)
    );

    // 7. Active Offers (strictly without promo codes!)
    const offerRows = await queryTable(
      'offers',
      'title, description, discount_percentage',
      (q) => q.eq('is_active', true)
    );

    // 8. Published Announcements
    const announcementRows = await queryTable(
      'announcements',
      'title, content',
      (q) => q.eq('is_published', true).order('display_order', { ascending: true })
    );

    // 9. Short Sessions
    const shortSessionRows = await queryTable(
      'short_sessions',
      'title, skill_topic, description, duration_days, fee',
      (q) => q.eq('is_published', true)
    );

    // Assemble Prompt with Strict Priorities
    const academyName = siteSettings?.academy_name || 'The Inspire Business Academy';
    const campusAddress = siteSettings?.campus_address || 'Sadiqabad, Punjab, Pakistan';
    const whatsappNum = siteSettings?.whatsapp || '0300-1234567';
    const phoneNum = siteSettings?.phone || '0300-1234567';
    const hours = `${siteSettings?.working_days_text || 'Monday - Friday'} (${siteSettings?.opening_time || '09:00'} - ${siteSettings?.closing_time || '19:00'})`;
    const monthlyFee = siteSettings?.physical_monthly_fee ?? 5040;
    const totalFee = siteSettings?.physical_total_fee ?? 30240;
    const onlinePrice = siteSettings?.online_course_price ?? 5000;

    let prompt = `You are the official AI Assistant for ${academyName} (Mission: Hunarmand Pakistan).
Provide helpful, polite, and accurate information to prospective and enrolled students in English and Roman Urdu.

CRITICAL SECURITY & PRIVACY RULES:
- You must NEVER disclose, lookup, or confirm personal student records, profiles, roll numbers, enrollments, transaction proofs, payment receipts, fee ledger, expenses, audit logs, messages, coupons, or promo codes.
- If a user asks about private account details, individual payments, or secrets, politely refuse and instruct them to contact the official WhatsApp helpline: ${whatsappNum}.
- If user writes in Roman Urdu, answer in Roman Urdu. If in English, answer in English.
- NEVER invent prices, free laptop gifts, guaranteed employment, or unapproved discounts.

ACADEMY PUBLIC INFO & FEES:
- Name: ${academyName} (Founder: Adeel Bhatti)
- Campus: ${campusAddress}
- Helpline / WhatsApp: ${whatsappNum} (Phone: ${phoneNum})
- Timings: ${hours}
- Physical 6-Month Package: Monthly fee Rs. ${monthlyFee}, Total fee Rs. ${totalFee}. Hands-on computer lab workstations available at campus.
- Online LMS Price: Rs. ${onlinePrice} per course with 70% passing requirement on final exam for verified certificate (/verify).
`;

    // Priority 1: Knowledge Base
    if (knowledgeRows.length > 0) {
      prompt += `\nOFFICIAL KNOWLEDGE BASE:\n`;
      for (const k of knowledgeRows) {
        prompt += `- [${k.category || 'General'}] ${k.title}: ${k.content}\n`;
      }
    }

    // Priority 2: Courses
    if (coursesRows.length > 0) {
      prompt += `\nPUBLISHED COURSES:\n`;
      for (const c of coursesRows) {
        const pFee = c.online_price || c.price || onlinePrice;
        const avail = [
          c.available_for_physical ? 'Physical' : null,
          c.available_for_online ? 'Online' : null,
        ].filter(Boolean).join(', ');
        prompt += `- ${c.title} (${c.duration_value || 6} mo, Rs. ${pFee}, ${avail || 'Available'}): ${c.short_description || ''}\n`;
      }
    }

    // Priority 3: FAQs
    if (faqRows.length > 0) {
      prompt += `\nFREQUENTLY ASKED QUESTIONS:\n`;
      for (const f of faqRows.slice(0, 10)) {
        prompt += `Q: ${f.question}\nA: ${f.answer}\n`;
      }
    }

    // Priority 4: Short Sessions & Packages & Offers
    if (packageRows.length > 0 || shortSessionRows.length > 0 || offerRows.length > 0) {
      prompt += `\nPACKAGES & WORKSHOPS:\n`;
      for (const p of packageRows) {
        prompt += `- Package: ${p.title} (${p.package_type || 'bundle'}, ${p.courses_count || 'all'} courses): ${p.description || ''}\n`;
      }
      for (const s of shortSessionRows) {
        prompt += `- Short Session: ${s.title} (${s.skill_topic}, ${s.duration_days} days, Rs. ${s.fee}): ${s.description || ''}\n`;
      }
      for (const o of offerRows) {
        prompt += `- Active Offer: ${o.title} (${o.discount_percentage}% off): ${o.description || ''}\n`;
      }
    }

    // Priority 5: Announcements
    if (announcementRows.length > 0) {
      prompt += `\nANNOUNCEMENTS:\n`;
      for (const a of announcementRows.slice(0, 3)) {
        prompt += `- ${a.title}: ${a.content}\n`;
      }
    }

    if (extraInstructions) {
      prompt += `\nADDITIONAL INSTRUCTIONS:\n${extraInstructions}\n`;
    }

    // Bound total context length under ~6000 characters
    if (prompt.length > 5800) {
      prompt = prompt.slice(0, 5800) + '\n[Context bounded for performance]';
    }

    const result: ChatbotContextResult = {
      systemPrompt: prompt,
      isEnabled,
      greeting: settingsRow?.greeting,
      greetingEn: settingsRow?.greeting_en,
      greetingRomanUrdu: settingsRow?.greeting_roman_urdu,
      fallbackMessage,
      extraInstructions,
    };

    // Cache in memory for 60 seconds
    if (!customDb) {
      inMemoryCache = {
        result,
        expiresAt: now + 60_000,
      };
    }

    return result;
  } catch (err: any) {
    console.error('[Chatbot Context Builder Error]:', err?.message);
    return {
      systemPrompt: STATIC_FALLBACK_PROMPT,
      isEnabled: true,
      fallbackMessage:
        'Hamari AI helpline masroof hai. Barahe karam official WhatsApp par rabta karein.',
    };
  }
}
