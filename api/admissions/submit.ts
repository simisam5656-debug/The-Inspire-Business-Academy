import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../_lib/env';

// Normalization helper for Pakistani mobile numbers
function normalizePakistaniPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  return digits;
}

function isValidPhone(phone: string): boolean {
  const normalized = normalizePakistaniPhone(phone);
  // Valid Pakistani mobile numbers: 11 digits starting with 03
  return /^03[0-9]{9}$/.test(normalized);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `IBA-${year}-${randomPart}`;
}

export default async function handler(req: any, res: any, dbClient?: any) {
  // Only POST allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed. Use POST.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    const {
      admissionType,
      fullName,
      guardianName,
      phone,
      whatsapp,
      email,
      city,
      courseSlug,
      courseTitle,
      batchPreference,
      notes,
      userId,
    } = body;

    // 1. Validate admissionType
    if (admissionType !== 'physical' && admissionType !== 'online') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid admission type. Must be "physical" or "online".',
      });
    }

    // 2. Validate fullName
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Full name is required (at least 3 characters).',
      });
    }

    // 3. Validate phone
    if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
      return res.status(400).json({
        ok: false,
        error: 'A valid Pakistani mobile phone number is required (e.g. 0300-1234567).',
      });
    }

    // 4. Guardian name required for physical admissions
    if (admissionType === 'physical' && (!guardianName || guardianName.trim().length < 2)) {
      return res.status(400).json({
        ok: false,
        error: 'Father or guardian name is required for physical academy admission.',
      });
    }

    // 5. Email required for online admissions
    if (admissionType === 'online' && (!email || !isValidEmail(email))) {
      return res.status(400).json({
        ok: false,
        error: 'A valid email address is required for online student admission.',
      });
    }

    // 6. City validation
    const studentCity = (city && typeof city === 'string' && city.trim()) ? city.trim() : 'Sadiqabad';

    // 7. Course validation
    if (!courseSlug || !courseTitle) {
      return res.status(400).json({
        ok: false,
        error: 'Course selection is required.',
      });
    }

    const normalizedPhone = normalizePakistaniPhone(phone);
    const referenceNumber = generateReferenceNumber();

    // Check if server-side Supabase credentials are configured
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes('your-secret'))) {
      return res.status(503).json({
        ok: false,
        error: 'Database service unavailable. Admission application cannot be processed.',
      });
    }

    const adminClient = dbClient || createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    // Validate course availability based on admission type
    if (admissionType === 'physical') {
      const isFullPackage = ['all-courses-physical', 'all-courses', 'full-package'].includes(courseSlug);
      if (!isFullPackage) {
        const { data: courseRow, error: courseErr } = await adminClient
          .from('courses')
          .select('id, slug, status, available_for_physical')
          .or(`slug.eq.${courseSlug},id.eq.${courseSlug}`)
          .maybeSingle();

        if (courseErr) {
          console.warn('Course availability check warning:', courseErr.message);
        } else if (!courseRow || courseRow.status !== 'published' || courseRow.available_for_physical === false) {
          return res.status(400).json({
            ok: false,
            error: 'This course is not currently available for physical admission.',
          });
        }
      }
    } else if (admissionType === 'online') {
      const { data: courseRow, error: courseErr } = await adminClient
        .from('courses')
        .select('id, slug, status, available_for_online')
        .or(`slug.eq.${courseSlug},id.eq.${courseSlug}`)
        .maybeSingle();

      if (courseErr) {
        console.warn('Course availability check warning:', courseErr.message);
      } else if (!courseRow || courseRow.status !== 'published' || courseRow.available_for_online === false) {
        return res.status(400).json({
          ok: false,
          error: 'This course is not currently available for online admission.',
        });
      }
    }

    // Duplicate check: Check if an active pending admission exists with same phone & course
    const { data: existing, error: checkError } = await adminClient
      .from('admissions')
      .select('id, reference_number, created_at')
      .eq('phone', normalizedPhone)
      .eq('course_slug', courseSlug)
      .eq('status', 'pending')
      .maybeSingle();

      if (checkError) {
        console.warn('Duplicate check warning:', checkError.message);
      } else if (existing) {
        return res.status(409).json({
          ok: false,
          error: `Is mobile number par is course ke liye dakhla request pehle se register hai (Ref: ${existing.reference_number}). Hamari team aapse rabta karegi.`,
          referenceNumber: existing.reference_number,
        });
      }

      // Insert new admission record
      const { data: inserted, error: insertError } = await adminClient
        .from('admissions')
        .insert({
          reference_number: referenceNumber,
          admission_type: admissionType,
          full_name: fullName.trim(),
          guardian_name: guardianName ? guardianName.trim() : null,
          phone: normalizedPhone,
          whatsapp: whatsapp ? normalizePakistaniPhone(whatsapp) : normalizedPhone,
          email: email ? email.trim().toLowerCase() : null,
          city: studentCity,
          course_slug: courseSlug,
          course_title: courseTitle,
          batch_preference: batchPreference ? batchPreference.trim() : null,
          notes: notes ? notes.trim() : null,
          status: 'pending',
          user_id: userId || null,
        })
        .select('id, reference_number, created_at')
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError.message);
        return res.status(500).json({
          ok: false,
          error: 'Dakhla darj karne mein masla pesh aya. Baraye meharbani WhatsApp helpline 0309-3534289 par rabta karein.',
        });
      }

      return res.status(201).json({
        ok: true,
        referenceNumber: inserted.reference_number,
        message: 'Aapki dakhla request kamyabi se receive ho gayi hai.',
      });
  } catch (err: any) {
    console.error('Server error handling admission submission:', err);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected error occurred while processing the admission application.',
    });
  }
}
