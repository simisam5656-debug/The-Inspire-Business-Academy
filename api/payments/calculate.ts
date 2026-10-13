import { resolveAuthoritativePrice } from '../_lib/pricing';

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { courseSlug, packageSlug, couponCode, promoCode, selectedCourseIds, userId } = body;

    const result = await resolveAuthoritativePrice({
      courseSlug,
      packageSlug,
      couponCode,
      promoCode,
      selectedCourseIds,
      userId,
      dbClient,
      req,
      env: req.env,
    });

    if (!result.ok) {
      return res.status(result.statusCode || 400).json({
        ok: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      ok: true,
      basePrice: result.basePrice,
      totalDiscount: result.totalDiscount,
      offerDiscount: result.offerDiscount,
      couponDiscount: result.couponDiscount,
      finalAmount: result.finalAmount,
      itemTitle: result.itemTitle,
      itemId: result.itemId,
      isPackage: result.isPackage,
      packageType: result.packageType,
      offer: result.offer,
      promoCodeId: result.promoCodeId,
      promoCode: result.promoCode,
      coupon: result.coupon,
      couponMessage: result.couponMessage,
      couponMessageRoman: result.couponMessageRoman,
    });
  } catch (error: any) {
    console.error('Pricing calculation error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to calculate authoritative price.' });
  }
}
