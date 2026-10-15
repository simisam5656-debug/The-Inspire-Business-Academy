import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

export interface AuthoritativePriceOptions {
  courseSlug?: string;
  packageSlug?: string;
  couponCode?: string;
  promoCode?: string;
  selectedCourseIds?: string[];
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  dbClient?: any;
  req?: any;
  env?: Record<string, any>;
}

export interface AuthoritativePriceResult {
  ok: boolean;
  basePrice: number;
  offerDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  itemTitle: string;
  itemId: string;
  isPackage: boolean;
  packageType?: 'all_courses' | 'bundle';
  selectedCourseIds?: string[];
  offerId: string | null;
  offerTitle: string | null;
  offer: any | null;
  promoCodeId?: string | null;
  promoCode?: string | null;
  couponId: string | null;
  couponCode: string | null;
  coupon: any | null;
  couponMessage: string | null;
  couponMessageRoman: string | null;
  error?: string;
  statusCode?: number;
}

export async function resolveAuthoritativePrice(
  options: AuthoritativePriceOptions
): Promise<AuthoritativePriceResult> {
  const { courseSlug, packageSlug, couponCode, promoCode, selectedCourseIds, userId, dbClient } = options;
  const buyerEmail = (options.email || '').trim().toLowerCase();
  const buyerPhone = (options.phone || '').trim();

  const emptyResult: AuthoritativePriceResult = {
    ok: false,
    basePrice: 0,
    offerDiscount: 0,
    couponDiscount: 0,
    totalDiscount: 0,
    finalAmount: 0,
    itemTitle: '',
    itemId: '',
    isPackage: false,
    offerId: null,
    offerTitle: null,
    offer: null,
    promoCodeId: null,
    promoCode: null,
    couponId: null,
    couponCode: null,
    coupon: null,
    couponMessage: null,
    couponMessageRoman: null,
  };

  const supabaseUrl = getEnv(options.req || options, 'SUPABASE_URL') || getEnv(options.req || options, 'VITE_SUPABASE_URL');
  const serviceKey = getEnv(options.req || options, 'SUPABASE_SERVICE_ROLE_KEY');

  if (!dbClient && (!supabaseUrl || !serviceKey)) {
    return {
      ...emptyResult,
      statusCode: 503,
      error: 'Database service unavailable. Pricing cannot be calculated.',
    };
  }

  const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

  if (!courseSlug && !packageSlug) {
    return {
      ...emptyResult,
      statusCode: 400,
      error: 'Course or package selection is required.',
    };
  }

  let basePrice = 0;
  let itemTitle = '';
  let itemId = '';
  let isPackage = false;
  let packageType: 'all_courses' | 'bundle' | undefined = undefined;
  let itemSlug = '';
  const today = new Date().toISOString().split('T')[0];

  // 1. Resolve Package or Course authoritatively from DB
  if (packageSlug && typeof packageSlug === 'string' && packageSlug.trim()) {
    const { data: pkg, error: pkgErr } = await supabase
      .from('packages')
      .select('id, title, price, is_active, package_type, courses_count, valid_from, valid_until')
      .eq('slug', packageSlug.trim())
      .maybeSingle();

    if (pkgErr) {
      return {
        ...emptyResult,
        statusCode: 500,
        error: 'Failed to query package pricing from database.',
      };
    }

    if (!pkg) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Invalid or unknown package selected. Package record not found.',
      };
    }

    if (!pkg.is_active) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Selected package is inactive and no longer available.',
      };
    }

    if (pkg.valid_from && today < pkg.valid_from) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Selected package is not yet available.',
      };
    }

    if (pkg.valid_until && today > pkg.valid_until) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Selected package offer has expired.',
      };
    }

    // Bundle course count and eligibility validation
    if (pkg.package_type === 'bundle' && selectedCourseIds && selectedCourseIds.length > 0) {
      const requiredCount = Number(pkg.courses_count || 0);
      if (requiredCount > 0 && selectedCourseIds.length !== requiredCount) {
        return {
          ...emptyResult,
          statusCode: 400,
          error: `Please select exactly ${requiredCount} courses for this bundle package.`,
        };
      }

      // Verify each course is eligible
      const { data: eligibleCourses } = await supabase
        .from('package_courses')
        .select('course_id')
        .eq('package_id', pkg.id);

      if (eligibleCourses && eligibleCourses.length > 0) {
        const eligibleSet = new Set(eligibleCourses.map((ec: any) => ec.course_id));
        const hasIneligible = selectedCourseIds.some((cid) => !eligibleSet.has(cid));
        if (hasIneligible) {
          return {
            ...emptyResult,
            statusCode: 400,
            error: 'One or more selected courses are not eligible for this bundle package.',
          };
        }
      }
    }

    if (pkg.price === null || pkg.price === undefined || pkg.price === '') {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Package price is missing or invalid in database.',
      };
    }

    const pkgPrice = Number(pkg.price);
    if (isNaN(pkgPrice) || pkgPrice < 0 || !isFinite(pkgPrice)) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Invalid or unverifiable package price.',
      };
    }

    basePrice = pkgPrice;
    itemTitle = pkg.title;
    itemId = pkg.id;
    isPackage = true;
    packageType = pkg.package_type;
    itemSlug = packageSlug.trim();
  } else if (courseSlug && typeof courseSlug === 'string' && courseSlug.trim()) {
    const { data: crs, error: crsErr } = await supabase
      .from('courses')
      .select('id, title, price, online_price, status')
      .eq('slug', courseSlug.trim())
      .maybeSingle();

    if (crsErr) {
      return {
        ...emptyResult,
        statusCode: 500,
        error: 'Failed to query course pricing from database.',
      };
    }

    if (!crs) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Invalid or unknown course selected. Course record not found.',
      };
    }

    if (crs.status === 'archived') {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Selected course is archived and no longer accepting enrollments.',
      };
    }

    const rawPrice = crs.online_price !== null && crs.online_price !== undefined ? crs.online_price : crs.price;
    if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Course price is missing or invalid in database.',
      };
    }

    const coursePrice = Number(rawPrice);
    if (isNaN(coursePrice) || coursePrice < 0 || !isFinite(coursePrice)) {
      return {
        ...emptyResult,
        statusCode: 400,
        error: 'Invalid or unverifiable course price.',
      };
    }

    basePrice = coursePrice;
    itemTitle = crs.title;
    itemId = crs.id;
    isPackage = false;
    itemSlug = courseSlug.trim();
  } else {
    return {
      ...emptyResult,
      statusCode: 400,
      error: 'Valid course or package selection is required.',
    };
  }

  // 2. Promotional Offers & Promo Codes
  const codeToEvaluate = (promoCode || couponCode || '').trim().toUpperCase();
  let offerDiscount = 0;
  let offerId: string | null = null;
  let offerTitle: string | null = null;
  let eligibleOffer: any = null;
  let promoCodeId: string | null = null;
  let resolvedPromoCode: string | null = null;
  let promoMsg: string | null = null;
  let promoMsgRoman: string | null = null;

  // First, check if input code matches an offer promo code in offer_promo_codes
  if (codeToEvaluate) {
    try {
      const { data: promoRow, error: prErr } = await supabase
        .from('offer_promo_codes')
        .select('*, offers(*)')
        .eq('code', codeToEvaluate)
        .maybeSingle();

      if (!prErr && promoRow && promoRow.offers) {
        const off = promoRow.offers;
        const isOfferActive = off.is_active && (!off.start_date || today >= off.start_date) && (!off.end_date || today <= off.end_date);
        const isApplicable = !off.applicable_course_slugs || off.applicable_course_slugs.length === 0 || off.applicable_course_slugs.includes(itemSlug);
        const withinUsage = !promoRow.usage_limit || promoRow.times_used < promoRow.usage_limit;

        let alreadyUsed = false;
        try {
          const ors: string[] = [];
          if (userId) ors.push(`user_id.eq.${userId}`);
          if (buyerEmail && /^[^,()\s]+$/.test(buyerEmail)) ors.push(`email.ilike.${buyerEmail}`);
          if (buyerPhone && /^[0-9+\-]+$/.test(buyerPhone)) ors.push(`phone.eq.${buyerPhone}`);
          if (ors.length > 0) {
            const { data: used } = await supabase
              .from('offer_promo_redemptions')
              .select('id')
              .eq('promo_code_id', promoRow.id)
              .or(ors.join(','))
              .limit(1);
            alreadyUsed = !!(used && used.length > 0);
          }
        } catch (_) {
          // table may be missing in mock environments
        }

        if (!promoRow.is_active || !off.is_active) {
          promoMsg = 'This offer has ended.';
          promoMsgRoman = 'Yeh offer khatam ho chuka hai.';
        } else if (!isOfferActive) {
          promoMsg = 'This offer is not running right now.';
          promoMsgRoman = 'Yeh offer abhi chalu nahi hai ya expire ho chuka hai.';
        } else if (!isApplicable) {
          promoMsg = 'This promo code is not valid for the selected course.';
          promoMsgRoman = 'Yeh promo code is course par laagu nahi hota.';
        } else if (!withinUsage) {
          promoMsg = 'This promo code has reached its usage limit.';
          promoMsgRoman = 'Is promo code ki istamaal ki hadd poori ho chuki hai.';
        } else if (alreadyUsed) {
          promoMsg = 'You have already used this promo code.';
          promoMsgRoman = 'Aap yeh promo code pehle istamaal kar chuke hain (aik student sirf aik baar).';
        } else {
          const discPct = Number(off.discount_percentage);
          if (!isNaN(discPct) && discPct > 0 && discPct <= 100) {
            eligibleOffer = off;
            offerId = off.id;
            offerTitle = off.title;
            promoCodeId = promoRow.id;
            resolvedPromoCode = promoRow.code;
            offerDiscount = Math.round((basePrice * discPct) / 100);
            offerDiscount = Math.min(basePrice, Math.max(0, offerDiscount));
          }
        }
      }
    } catch (_) {
      // Ignore table missing in mock test environments
    }
  }

  // If no promo code matched, check automatic offers that do NOT require promo code
  if (!eligibleOffer) {
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('discount_percentage', { ascending: false });

    if (offers && offers.length > 0) {
      for (const off of offers) {
        // Skip offers that require a promo code
        if (off.requires_promo_code) continue;

        if (
          !off.applicable_course_slugs ||
          off.applicable_course_slugs.length === 0 ||
          off.applicable_course_slugs.includes(itemSlug)
        ) {
          const discPct = Number(off.discount_percentage);
          if (!isNaN(discPct) && discPct > 0 && discPct <= 100 && isFinite(discPct)) {
            eligibleOffer = off;
            offerId = off.id;
            offerTitle = off.title;
            offerDiscount = Math.round((basePrice * discPct) / 100);
            offerDiscount = Math.min(basePrice, Math.max(0, offerDiscount));
            break;
          }
        }
      }
    }
  }

  const runningTotal = Math.max(0, basePrice - offerDiscount);

  // 3. Validate Database-Backed Coupon (if codeToEvaluate was not already used as an offer promo code)
  let couponDiscount = 0;
  let validatedCoupon: any = null;
  let couponId: string | null = null;
  let resolvedCouponCode: string | null = null;
  let couponMessage: string | null = null;
  let couponMessageRoman: string | null = null;

  if (codeToEvaluate && !promoCodeId && promoMsg) {
    couponMessage = promoMsg;
    couponMessageRoman = promoMsgRoman;
  } else if (codeToEvaluate && !promoCodeId) {
    resolvedCouponCode = codeToEvaluate;

    const { data: cp, error: cpErr } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', codeToEvaluate)
      .maybeSingle();

    if (cpErr) {
      return {
        ...emptyResult,
        statusCode: 500,
        error: 'Failed to verify coupon code in database.',
      };
    }

    if (!cp) {
      couponMessage = 'Coupon or promo code is invalid or has expired.';
      couponMessageRoman = 'Yeh coupon ya promo code ghalat hai ya expire ho chuka hai.';
    } else if (!cp.is_active) {
      couponMessage = 'Coupon is inactive.';
      couponMessageRoman = 'Yeh coupon filhal ghair-faal hai.';
    } else if ((cp.start_date && today < cp.start_date) || (cp.end_date && today > cp.end_date)) {
      couponMessage = 'Coupon code is invalid or has expired.';
      couponMessageRoman = 'Yeh coupon code expire ho chuka hai.';
    } else if (cp.usage_limit && cp.times_used >= cp.usage_limit) {
      couponMessage = 'This coupon has reached its maximum global usage limit.';
      couponMessageRoman = 'Is coupon ki kul istamaal ki hadd mukammal ho chuki hai.';
    } else if (runningTotal < Number(cp.min_amount || 0)) {
      couponMessage = `Minimum order amount for this coupon is Rs. ${cp.min_amount}.`;
      couponMessageRoman = `Is coupon ke liye kam az kam Rs. ${cp.min_amount} ka order darkar hai.`;
    } else if (
      cp.applicable_course_slugs &&
      cp.applicable_course_slugs.length > 0 &&
      !cp.applicable_course_slugs.includes(itemSlug)
    ) {
      couponMessage = 'This coupon is not applicable to the selected course.';
      couponMessageRoman = 'Yeh coupon is intikhab shuda course par laagu nahi hota.';
    } else {
      let userAlreadyRedeemed = false;
      if (userId) {
        const { data: red, error: redErr } = await supabase
          .from('coupon_redemptions')
          .select('id')
          .eq('coupon_id', cp.id)
          .eq('user_id', userId);

        if (!redErr && red && red.length >= (cp.per_user_limit || 1)) {
          userAlreadyRedeemed = true;
        }
      }

      if (userAlreadyRedeemed) {
        couponMessage = 'You have already redeemed this coupon once (maximum allowed times).';
        couponMessageRoman = 'Aap yeh coupon pehle istamaal kar chuke hain.';
      } else {
        validatedCoupon = {
          ...cp,
          discountType: cp.discount_type,
          discountValue: cp.discount_value,
        };
        couponId = cp.id;

        if (cp.discount_type === 'percentage') {
          const pct = Number(cp.discount_value);
          couponDiscount = Math.round((runningTotal * pct) / 100);
        } else {
          couponDiscount = Math.round(Number(cp.discount_value));
        }

        couponDiscount = Math.min(runningTotal, Math.max(0, couponDiscount));
        couponMessage = `Coupon applied! You saved Rs. ${couponDiscount.toLocaleString()}.`;
        couponMessageRoman = `Coupon lag gaya! Aap ki Rs. ${couponDiscount.toLocaleString()} bachat hui.`;
      }
    }
  }

  const totalDiscount = offerDiscount + couponDiscount;
  const finalAmount = Math.max(0, basePrice - totalDiscount);

  return {
    ok: true,
    basePrice,
    offerDiscount,
    couponDiscount,
    totalDiscount,
    finalAmount,
    itemTitle,
    itemId,
    isPackage,
    packageType,
    selectedCourseIds,
    offerId,
    offerTitle,
    offer: eligibleOffer
      ? {
          ...eligibleOffer,
          discountAmount: offerDiscount,
          discountPercentage: Number(eligibleOffer.discount_percentage ?? 0),
        }
      : null,
    promoCodeId,
    promoCode: resolvedPromoCode,
    couponId,
    couponCode: resolvedCouponCode,
    coupon: validatedCoupon ? { ...validatedCoupon, discountAmount: couponDiscount } : null,
    couponMessage,
    couponMessageRoman,
  };
}
