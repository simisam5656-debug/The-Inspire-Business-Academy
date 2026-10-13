import { createClient } from '@supabase/supabase-js';
import { resolveAuthoritativePrice } from '../_lib/pricing';
import { getEnv } from '../_lib/env';

function normalizePakistaniPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  return digits;
}

function isValidPhone(phone: string): boolean {
  const normalized = normalizePakistaniPhone(phone);
  return /^03[0-9]{9}$/.test(normalized);
}

function generatePaymentRef(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `IBA-PAY-${year}-${randomPart}`;
}

function generateAdmissionRef(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `IBA-${year}-${randomPart}`;
}

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      fullName,
      email,
      phone,
      city,
      courseSlug,
      packageSlug,
      courseTitle,
      paymentMethod,
      transactionId,
      accountSenderName,
      accountSenderNumber,
      screenshotPath,
      couponCode,
      promoCode,
      notes,
      userId,
      requestType,
      selectedCourseIds,
    } = body;

    // 1. Basic Field Validations
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Full name is required (at least 3 characters).' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ ok: false, error: 'A valid email address is required.' });
    }

    if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
      return res.status(400).json({ ok: false, error: 'A valid Pakistani mobile phone number is required (e.g. 0300-1234567).' });
    }

    const hasCourse = Boolean(courseSlug && typeof courseSlug === 'string' && courseSlug.trim());
    const hasPackage = Boolean(packageSlug && typeof packageSlug === 'string' && packageSlug.trim());

    if (!hasCourse && !hasPackage) {
      return res.status(400).json({ ok: false, error: 'Course or package selection is required.' });
    }

    const validMethods = ['jazzcash', 'easypaisa', 'bank_transfer', 'other'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({ ok: false, error: 'Please select a valid payment method (JazzCash, Easypaisa, Bank Transfer).' });
    }

    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 4) {
      return res.status(400).json({ ok: false, error: 'Valid Transaction ID / TID is required.' });
    }

    const PROOF_PATH_REGEX = /^proofs\/\d{4}\/\d{2}\/[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$/;
    if (screenshotPath) {
      if (typeof screenshotPath !== 'string' || !PROOF_PATH_REGEX.test(screenshotPath.trim())) {
        return res.status(400).json({
          ok: false,
          error: 'Valid payment screenshot proof path is required in format proofs/YYYY/MM/uuid.ext.',
        });
      }
    }

    const cleanTxId = transactionId.trim().toUpperCase();
    const normalizedPhone = normalizePakistaniPhone(phone);

    // 2. Setup Supabase Client (Fail safely if credentials unavailable)
    const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
    const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

    if (!dbClient && (!supabaseUrl || !serviceKey)) {
      return res.status(503).json({
        ok: false,
        error: 'Database service unavailable. Payment submission cannot be processed.',
      });
    }

    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

    // Validate that the chosen payment method is enabled in site settings
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('site_settings_public')
      .select('payment_jazzcash_enabled, payment_easypaisa_enabled, payment_bank_enabled')
      .eq('id', 'default')
      .maybeSingle();

    if (!settingsErr && settingsRow) {
      if (paymentMethod === 'jazzcash' && settingsRow.payment_jazzcash_enabled === false) {
        return res.status(400).json({
          ok: false,
          error: 'JazzCash payment method is currently disabled. Please select another payment method.',
        });
      }
      if (paymentMethod === 'easypaisa' && settingsRow.payment_easypaisa_enabled === false) {
        return res.status(400).json({
          ok: false,
          error: 'Easypaisa payment method is currently disabled. Please select another payment method.',
        });
      }
      if (paymentMethod === 'bank_transfer' && settingsRow.payment_bank_enabled !== true) {
        return res.status(400).json({
          ok: false,
          error: 'Bank Transfer payment method is currently disabled. Please select another payment method.',
        });
      }
    }

    // 3. User Identity Verification (Never blindly trust client-supplied userId)
    let verifiedUserId: string | null = null;
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: 'Unauthorized: Invalid or expired session token.',
        });
      }
      verifiedUserId = userData.user.id;

      if (userId && typeof userId === 'string' && userId.trim() !== verifiedUserId) {
        return res.status(403).json({
          ok: false,
          error: 'Forbidden: Cannot submit payment on behalf of another user account.',
        });
      }
    } else if (userId && typeof userId === 'string' && userId.trim().length > 0) {
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized: Authentication token required when associating payment with a user ID.',
      });
    }

    // 4. Duplicate Transaction ID Check
    const { data: existingTx, error: txCheckErr } = await supabase
      .from('online_payments')
      .select('id, reference_number')
      .eq('transaction_id', cleanTxId)
      .maybeSingle();

    if (txCheckErr) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to verify transaction uniqueness.',
      });
    }

    if (existingTx) {
      return res.status(409).json({
        ok: false,
        error: 'Ye Transaction ID pehle use ho chuki hai. Please apni payment details verify karein.',
        duplicateTx: true,
      });
    }

    // 5. Authoritative Course/Package Validation & Pricing
    const priceResult = await resolveAuthoritativePrice({
      courseSlug: courseSlug?.trim(),
      packageSlug: packageSlug?.trim(),
      couponCode: couponCode?.trim(),
      promoCode: promoCode?.trim(),
      selectedCourseIds: Array.isArray(selectedCourseIds) ? selectedCourseIds : undefined,
      userId: verifiedUserId,
      dbClient: supabase,
      req,
      env: req.env,
    });

    if (!priceResult.ok) {
      return res.status(priceResult.statusCode || 400).json({
        ok: false,
        error: priceResult.error,
      });
    }

    const appliedCode = (couponCode || promoCode || '').trim();
    if (appliedCode && !priceResult.couponId && !priceResult.promoCodeId) {
      return res.status(400).json({
        ok: false,
        error: priceResult.couponMessage || 'Invalid, expired, or ineligible coupon or promo code.',
      });
    }

    const itemId = priceResult.itemId;
    const isPackage = priceResult.isPackage;
    const authoritativeItemTitle = priceResult.itemTitle || courseTitle || (hasPackage ? packageSlug : courseSlug);
    const basePrice = priceResult.basePrice;
    const discountAmount = priceResult.totalDiscount;
    const offerId = priceResult.offerId;
    const offerTitle = priceResult.offerTitle;
    const promoCodeId = priceResult.promoCodeId;
    const couponId = priceResult.couponId;
    const finalAmount = priceResult.finalAmount;

    // Validate supplied amount against authoritative finalAmount
    if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
      const suppliedAmount = Number(body.amount);
      if (isNaN(suppliedAmount) || suppliedAmount < 0) {
        return res.status(400).json({ ok: false, error: 'Invalid payment amount specified.' });
      }
      if (Math.abs(suppliedAmount - finalAmount) > 1) {
        return res.status(400).json({
          ok: false,
          error: `Payment amount mismatch: Expected Rs. ${finalAmount}, but received Rs. ${suppliedAmount}.`,
        });
      }
    }

    const admissionRef = generateAdmissionRef();
    const paymentRef = generatePaymentRef();

    // Determine effective request_type: 'package' | 'additional_course' | 'registration'
    let effectiveRequestType: 'registration' | 'additional_course' | 'package' = 'registration';
    if (isPackage || hasPackage) {
      effectiveRequestType = 'package';
    } else if (requestType === 'additional_course') {
      effectiveRequestType = 'additional_course';
    }

    // 6. Insert Admission Record
    const { data: adm, error: admErr } = await supabase
      .from('admissions')
      .insert({
        reference_number: admissionRef,
        admission_type: 'online',
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email.trim().toLowerCase(),
        city: (city && city.trim()) || 'Online',
        course_slug: courseSlug || packageSlug || 'online',
        course_title: authoritativeItemTitle,
        status: 'pending',
        notes: notes ? notes.trim() : null,
        user_id: verifiedUserId,
      })
      .select('id, reference_number')
      .single();

    if (admErr || !adm || !adm.id) {
      const errCode = admErr?.code || 'ADM_INSERT_ERROR';
      const errMsg = admErr?.message || 'Database error inserting admission';
      console.error(`[Admissions DB Insert Error] code=${errCode} msg=${errMsg}`);
      const isDebug = getEnv(req, 'AI_DEBUG') === 'true';
      return res.status(500).json({
        ok: false,
        error: 'Failed to record admission in database.',
        code: errCode,
        ...(isDebug ? { detail: errMsg } : {}),
      });
    }

    const insertedAdmissionId = adm.id;

    // 7. Insert Online Payment Record
    const paymentPayload: any = {
      reference_number: paymentRef,
      admission_id: insertedAdmissionId,
      user_id: verifiedUserId,
      course_id: isPackage ? null : itemId,
      package_id: isPackage ? itemId : null,
      course_slug: (courseSlug && courseSlug.trim()) || (packageSlug && packageSlug.trim()) || 'online',
      course_title: authoritativeItemTitle,
      payment_method: paymentMethod,
      transaction_id: cleanTxId,
      account_sender_name: accountSenderName ? accountSenderName.trim() : null,
      account_sender_number: accountSenderNumber ? accountSenderNumber.trim() : null,
      screenshot_path: screenshotPath || null,
      base_price: basePrice,
      discount_amount: discountAmount,
      coupon_id: couponId,
      coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
      offer_id: offerId,
      offer_title: offerTitle,
      final_amount: finalAmount,
      payment_status: 'pending',
      request_type: effectiveRequestType,
      access_status: 'pending',
    };

    if (selectedCourseIds && Array.isArray(selectedCourseIds) && selectedCourseIds.length > 0) {
      paymentPayload.selected_course_ids = selectedCourseIds;
    } else if (!isPackage && itemId) {
      paymentPayload.selected_course_ids = [itemId];
    }

    const { data: pay, error: payErr } = await supabase
      .from('online_payments')
      .insert(paymentPayload)
      .select('id, reference_number')
      .single();

    if (payErr || !pay || !pay.id) {
      try {
        await supabase.from('admissions').delete().eq('id', insertedAdmissionId);
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphan admission on payment failure:', cleanupErr);
      }

      const errCode = payErr?.code || 'PAY_INSERT_ERROR';
      const errMsg = payErr?.message || 'Database error inserting payment';
      console.error(`[Online Payments DB Insert Error] code=${errCode} msg=${errMsg}`);
      const isDebug = getEnv(req, 'AI_DEBUG') === 'true';

      if (payErr?.code === '23505') {
        return res.status(409).json({
          ok: false,
          error: 'Ye Transaction ID pehle use ho chuki hai. Please apni payment details verify karein.',
          code: payErr.code,
          duplicateTx: true,
          ...(isDebug ? { detail: errMsg } : {}),
        });
      }
      return res.status(500).json({
        ok: false,
        error: 'Failed to record payment in database.',
        code: errCode,
        ...(isDebug ? { detail: errMsg } : {}),
      });
    }

    const insertedPaymentId = pay.id;

    // Record coupon redemption if coupon was applied and user is authenticated
    if (couponId && verifiedUserId) {
      try {
        await supabase.from('coupon_redemptions').insert({
          coupon_id: couponId,
          user_id: verifiedUserId,
          payment_reference: paymentRef,
        });
        await supabase.rpc('increment_coupon_usage', { cp_id: couponId });
      } catch (cErr) {
        console.warn('Coupon redemption logging warning:', cErr);
      }
    }

    // Atomically increment promo code usage if offer promo code was applied
    if (promoCodeId) {
      try {
        const { data: currentPromo } = await supabase
          .from('offer_promo_codes')
          .select('times_used')
          .eq('id', promoCodeId)
          .maybeSingle();

        const currentTimes = Number(currentPromo?.times_used || 0);
        await supabase
          .from('offer_promo_codes')
          .update({ times_used: currentTimes + 1 })
          .eq('id', promoCodeId);
      } catch (prErr) {
        console.warn('Promo code usage update warning:', prErr);
      }
    }

    return res.status(200).json({
      ok: true,
      admissionReference: admissionRef,
      paymentReference: paymentRef,
      admissionId: insertedAdmissionId,
      paymentId: insertedPaymentId,
      finalAmount,
      basePrice,
      discountAmount,
      transactionId: cleanTxId,
      requestType: effectiveRequestType,
      message: 'Aap ki registration aur payment record receive ho gaya hai. Verification ke baad course access activate hoga.',
    });
  } catch (error: any) {
    console.error('Submit payment unexpected error:', error?.message || 'Unknown error');
    return res.status(500).json({
      ok: false,
      error: 'Registration aur payment submit karne mein masla pesh aya. Connection check karein.',
    });
  }
}
