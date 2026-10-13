import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import calculateHandler from '../api/payments/calculate.ts';
import submitHandler from '../api/payments/submit.ts';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key: string, value: string) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

interface MockPricingDbState {
  courses: Record<string, any>;
  packages: Record<string, any>;
  offers: any[];
  coupons: Record<string, any>;
  couponRedemptions: Record<string, any>;
  onlinePayments: Record<string, any>;
  admissions: Record<string, any>;
  failCouponQuery?: boolean;
  failOfferQuery?: boolean;
}

function createMockPricingDb(initialState?: Partial<MockPricingDbState>) {
  const state: MockPricingDbState = {
    courses: {
      'amazon-va': {
        id: 'crs-amazon-1',
        slug: 'amazon-va',
        title: 'Amazon Virtual Assistant',
        price: 8000,
        status: 'published',
      },
      'shopify-dropshipping': {
        id: 'crs-shopify-1',
        slug: 'shopify-dropshipping',
        title: 'Shopify Dropshipping',
        price: 10000,
        status: 'published',
      },
      'archived-course': {
        id: 'crs-archived-1',
        slug: 'archived-course',
        title: 'Old Archived Course',
        price: 5000,
        status: 'archived',
      },
      'missing-price-course': {
        id: 'crs-null-price',
        slug: 'missing-price-course',
        title: 'Course with Null Price',
        price: null,
        status: 'published',
      },
      'invalid-price-course': {
        id: 'crs-invalid-price',
        slug: 'invalid-price-course',
        title: 'Course with Non-Numeric Price',
        price: 'not_a_number',
        status: 'published',
      },
      'negative-price-course': {
        id: 'crs-neg-price',
        slug: 'negative-price-course',
        title: 'Course with Negative Price',
        price: -500,
        status: 'published',
      },
      ...(initialState?.courses || {}),
    },
    packages: {
      'freelancing-bundle': {
        id: 'pkg-freelance-1',
        slug: 'freelancing-bundle',
        title: 'Freelancing Master Bundle',
        price: 15000,
        is_active: true,
      },
      'inactive-bundle': {
        id: 'pkg-inactive-1',
        slug: 'inactive-bundle',
        title: 'Expired Inactive Bundle',
        price: 12000,
        is_active: false,
      },
      ...(initialState?.packages || {}),
    },
    offers: initialState?.offers || [
      {
        id: 'offer-eid-1',
        title: 'Eid Flash Offer',
        title_roman_urdu: 'Eid Bachat Offer',
        discount_percentage: 10,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        applicable_course_slugs: ['amazon-va'],
      },
    ],
    coupons: {
      'VALID10': {
        id: 'cp-valid-10',
        code: 'VALID10',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        min_amount: 1000,
        usage_limit: 100,
        times_used: 5,
        applicable_course_slugs: null, // applies to all
      },
      'FIXED1000': {
        id: 'cp-fixed-1000',
        code: 'FIXED1000',
        discount_type: 'fixed',
        discount_value: 1000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        min_amount: 5000,
        usage_limit: 50,
        times_used: 2,
        applicable_course_slugs: null,
      },
      'EXPIREDCODE': {
        id: 'cp-expired',
        code: 'EXPIREDCODE',
        discount_type: 'percentage',
        discount_value: 20,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        is_active: true,
        usage_limit: 100,
        times_used: 0,
      },
      'INACTIVECODE': {
        id: 'cp-inactive',
        code: 'INACTIVECODE',
        discount_type: 'percentage',
        discount_value: 15,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: false,
      },
      'COURSEONLY': {
        id: 'cp-course-only',
        code: 'COURSEONLY',
        discount_type: 'percentage',
        discount_value: 15,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        applicable_course_slugs: ['shopify-dropshipping'], // only for shopify
      },
      'MAXUSED': {
        id: 'cp-max-used',
        code: 'MAXUSED',
        discount_type: 'percentage',
        discount_value: 25,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        usage_limit: 10,
        times_used: 10,
      },
      'HIGHMIN': {
        id: 'cp-high-min',
        code: 'HIGHMIN',
        discount_type: 'fixed',
        discount_value: 2000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
        min_amount: 50000, // min Rs. 50,000
      },
      'INVALIDPERCENT': {
        id: 'cp-invalid-percent',
        code: 'INVALIDPERCENT',
        discount_type: 'percentage',
        discount_value: 250, // invalid: > 100%
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_active: true,
      },
      ...(initialState?.coupons || {}),
    },
    couponRedemptions: {
      'red-user-1': {
        id: 'red-user-1',
        coupon_id: 'cp-valid-10',
        user_id: 'user-already-redeemed-id',
      },
      ...(initialState?.couponRedemptions || {}),
    },
    onlinePayments: {},
    admissions: {},
    failCouponQuery: initialState?.failCouponQuery,
    failOfferQuery: initialState?.failOfferQuery,
  };

  const client = {
    from(table: string) {
      let filters: Array<{ col: string; val: any }> = [];
      let orderBy = '';

      const query: any = {
        select(cols: string = '*') {
          return query;
        },
        eq(col: string, val: any) {
          filters.push({ col, val });
          return query;
        },
        lte(col: string, val: any) {
          return query;
        },
        gte(col: string, val: any) {
          return query;
        },
        order(col: string, opts?: any) {
          orderBy = col;
          return query;
        },
        async maybeSingle() {
          if (table === 'coupons' && state.failCouponQuery) {
            return { data: null, error: new Error('Database connection failure on coupons query') };
          }
          const list = await query.execute();
          return { data: list.length > 0 ? list[0] : null, error: null };
        },
        async single() {
          const list = await query.execute();
          if (list.length === 0) return { data: null, error: new Error('Record not found') };
          return { data: list[0], error: null };
        },
        async execute() {
          if (table === 'offers' && state.failOfferQuery) {
            throw new Error('Database error querying offers');
          }
          let rows: any[] = [];
          if (table === 'courses') {
            rows = Object.values(state.courses);
          } else if (table === 'packages') {
            rows = Object.values(state.packages);
          } else if (table === 'offers') {
            rows = [...state.offers];
          } else if (table === 'coupons') {
            rows = Object.values(state.coupons);
          } else if (table === 'coupon_redemptions') {
            rows = Object.values(state.couponRedemptions);
          } else if (table === 'online_payments') {
            rows = Object.values(state.onlinePayments);
          } else if (table === 'admissions') {
            rows = Object.values(state.admissions);
          }

          for (const f of filters) {
            rows = rows.filter((r) => r[f.col] === f.val);
          }
          return rows;
        },
        insert(payload: any) {
          const id = `gen-${table}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const inserted = { ...payload, id };
          if (table === 'admissions') state.admissions[id] = inserted;
          if (table === 'online_payments') state.onlinePayments[id] = inserted;
          return {
            select() {
              return { single: async () => ({ data: inserted, error: null }) };
            },
            data: inserted,
            error: null,
          };
        },
        delete() {
          return {
            eq(col: string, val: any) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        then: async (resolve: any) => {
          if (table === 'offers' && state.failOfferQuery) {
            resolve({ data: null, error: new Error('Database error querying offers') });
            return;
          }
          const rows = await query.execute();
          resolve({ data: rows, error: null });
        },
      };

      return query;
    },
    auth: {
      async getUser(token: string) {
        return { data: { user: { id: 'test-user-id' } }, error: null };
      },
    },
    rpc: async () => ({ data: null, error: null }),
    _state: state,
  };

  return client;
}

describe('Payment Calculation & Authoritative Pricing Tests (api/payments/calculate.ts)', () => {
  // 1. Unknown course
  test('1. Unknown course: returns HTTP 400 error, never falls back to Rs. 5000', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'non-existent-course-slug' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Course record not found/i);
  });

  // 2. Archived course
  test('2. Archived course: returns HTTP 400 error', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'archived-course' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /archived and no longer accepting enrollments/i);
  });

  // 3. Missing/null/empty/invalid course price
  test('3a. Missing (null) course price: rejected with HTTP 400 without falling back to default', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'missing-price-course' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Course price is missing or invalid/i);
  });

  test('3b. Non-numeric course price: rejected with HTTP 400', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'invalid-price-course' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or unverifiable course price/i);
  });

  test('3c. Negative course price: rejected with HTTP 400', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'negative-price-course' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or unverifiable course price/i);
  });

  // 4. Valid price with no coupon
  test('4. Valid course price with active offer and no coupon: calculated accurately', async () => {
    const mockDb = createMockPricingDb();
    // amazon-va is Rs. 8000. It has a 10% offer (Eid Flash Offer = Rs. 800 discount).
    const req = {
      method: 'POST',
      body: { courseSlug: 'amazon-va' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.basePrice, 8000);
    assert.equal(res.body.totalDiscount, 800);
    assert.equal(res.body.finalAmount, 7200);
    assert.equal(res.body.itemTitle, 'Amazon Virtual Assistant');
    assert.equal(res.body.coupon, null);
  });

  // 5. Valid active percentage coupon
  test('5. Valid active coupon: applied correctly on running total', async () => {
    const mockDb = createMockPricingDb();
    // shopify-dropshipping is Rs. 10000. No offer matches it.
    // VALID10 coupon is 10% off (Rs. 1000 discount). Final amount = Rs. 9000.
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'VALID10' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.basePrice, 10000);
    assert.equal(res.body.totalDiscount, 1000);
    assert.equal(res.body.finalAmount, 9000);
    assert.ok(res.body.coupon);
    assert.equal(res.body.coupon.code, 'VALID10');
    assert.match(res.body.couponMessage, /Coupon applied! You saved Rs\. 1,000/i);
  });

  // 6. Valid active fixed coupon
  test('6. Valid active fixed amount coupon: applies flat reduction', async () => {
    const mockDb = createMockPricingDb();
    // shopify-dropshipping is Rs. 10000. FIXED1000 gives flat Rs. 1000 off.
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'FIXED1000' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.basePrice, 10000);
    assert.equal(res.body.totalDiscount, 1000);
    assert.equal(res.body.finalAmount, 9000);
    assert.equal(res.body.coupon.discountType, 'fixed');
  });

  // 7. Inactive coupon: rejected without discount
  test('7. Inactive coupon: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'INACTIVECODE' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0); // No discount granted
    assert.equal(res.body.finalAmount, 10000);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /Coupon is inactive/i);
  });

  // 8. Expired coupon: rejected without discount
  test('8. Expired coupon: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'EXPIREDCODE' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.finalAmount, 10000);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /invalid or has expired/i);
  });

  // 9. Course-ineligible coupon: rejected without discount
  test('9. Course-ineligible coupon: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    // COURSEONLY is only for shopify-dropshipping. We try to use it on amazon-va.
    const req = {
      method: 'POST',
      body: { courseSlug: 'amazon-va', couponCode: 'COURSEONLY' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    // Offer gives 800, but coupon gives 0
    assert.equal(res.body.totalDiscount, 800);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /not applicable to the selected course/i);
  });

  // 10. Minimum amount not met
  test('10. Coupon minimum order amount not met: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    // HIGHMIN requires min Rs. 50,000. Course is Rs. 10,000.
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'HIGHMIN' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /Minimum order amount for this coupon is Rs\. 50000/i);
  });

  // 11. Coupon exceeded usage limit
  test('11. Coupon reached maximum global usage limit: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'MAXUSED' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /maximum global usage limit/i);
  });

  // 12. User already redeemed coupon once
  test('12. User already redeemed coupon once: rejected without discount', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: {
        courseSlug: 'shopify-dropshipping',
        couponCode: 'VALID10',
        userId: 'user-already-redeemed-id',
      },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /already redeemed this coupon once/i);
  });

  // 13 & 14. Demo coupons HUNARMAND10 and IBA500 without database records
  test('13. Demo coupon HUNARMAND10 grants NO discount when not in database', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'HUNARMAND10' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.finalAmount, 10000);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /invalid or has expired/i);
  });

  test('14. Demo coupon IBA500 grants NO discount when not in database', async () => {
    const mockDb = createMockPricingDb();
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'IBA500' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.totalDiscount, 0);
    assert.equal(res.body.finalAmount, 10000);
    assert.equal(res.body.coupon, null);
    assert.match(res.body.couponMessage, /invalid or has expired/i);
  });

  // 15. Database unavailable fails safely with 503, never returns fallback 5000
  test('15. Supabase credentials unavailable: fails safely with HTTP 503, never returns fallback Rs. 5000', async () => {
    const oldUrl = process.env.SUPABASE_URL;
    const oldViteUrl = process.env.VITE_SUPABASE_URL;
    const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const oldPub = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      const req = {
        method: 'POST',
        body: { courseSlug: 'shopify-dropshipping' },
      };
      const res = createMockRes();

      await calculateHandler(req, res, undefined);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.ok, false);
      assert.match(res.body.error, /Database service unavailable/i);
    } finally {
      if (oldUrl) process.env.SUPABASE_URL = oldUrl;
      if (oldViteUrl) process.env.VITE_SUPABASE_URL = oldViteUrl;
      if (oldKey) process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
      if (oldPub) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = oldPub;
    }
  });

  // 16. Database coupon query error returns HTTP 500
  test('16. Coupon query database error: returns HTTP 500, never swallows error', async () => {
    const mockDb = createMockPricingDb({ failCouponQuery: true });
    const req = {
      method: 'POST',
      body: { courseSlug: 'shopify-dropshipping', couponCode: 'VALID10' },
    };
    const res = createMockRes();

    await calculateHandler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to verify coupon code/i);
  });

  // 17. Consistency: calculate and submit calculate 100% identical totals
  test('17. Consistency: calculate and submit endpoints return identical totals for the same input', async () => {
    const mockDb = createMockPricingDb();

    // 17a. Calculate
    const calcReq = {
      method: 'POST',
      body: { courseSlug: 'amazon-va', couponCode: 'VALID10' },
    };
    const calcRes = createMockRes();
    await calculateHandler(calcReq, calcRes, mockDb);

    assert.equal(calcRes.statusCode, 200);
    assert.equal(calcRes.body.basePrice, 8000);
    // 10% offer = 800. Running = 7200. 10% coupon = 720. Total discount = 1520. Final = 6480.
    assert.equal(calcRes.body.totalDiscount, 1520);
    assert.equal(calcRes.body.finalAmount, 6480);

    // 17b. Submit
    const submitReq = {
      method: 'POST',
      headers: {},
      body: {
        fullName: 'Zubair Ahmed',
        email: 'zubair@example.com',
        phone: '03001234567',
        courseSlug: 'amazon-va',
        paymentMethod: 'jazzcash',
        transactionId: 'TXN-IDENTICAL-1',
        couponCode: 'VALID10',
      },
    };
    const submitRes = createMockRes();
    await submitHandler(submitReq, submitRes, mockDb);

    assert.equal(submitRes.statusCode, 200);
    assert.equal(submitRes.body.basePrice, calcRes.body.basePrice);
    assert.equal(submitRes.body.discountAmount, calcRes.body.totalDiscount);
    assert.equal(submitRes.body.finalAmount, calcRes.body.finalAmount);
  });

  // 18. Tampering: submitting with an invalid/fake coupon is rejected with HTTP 400
  test('18. Submitting payment with non-existent coupon is rejected with HTTP 400', async () => {
    const mockDb = createMockPricingDb();
    const submitReq = {
      method: 'POST',
      headers: {},
      body: {
        fullName: 'Zubair Ahmed',
        email: 'zubair@example.com',
        phone: '03001234567',
        courseSlug: 'shopify-dropshipping',
        paymentMethod: 'jazzcash',
        transactionId: 'TXN-FAKE-COUPON-1',
        couponCode: 'HUNARMAND10', // Fake / non-existent coupon
      },
    };
    const submitRes = createMockRes();
    await submitHandler(submitReq, submitRes, mockDb);

    assert.equal(submitRes.statusCode, 400);
    assert.equal(submitRes.body.ok, false);
    assert.match(submitRes.body.error, /invalid or has expired/i);
  });

  // 19. Neither demo code is automatically seeded by the current fresh-database setup scripts
  test('19. Neither HUNARMAND10 nor IBA500 is seeded in complete_database_setup.sql or migration files', () => {
    const completeSetupSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/complete_database_setup.sql'), 'utf-8');
    const migrationSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20261007000006_online_payments_enrollments_offers.sql'), 'utf-8');

    assert.equal(completeSetupSql.includes("'HUNARMAND10'"), false, 'HUNARMAND10 must not be seeded in complete_database_setup.sql');
    assert.equal(completeSetupSql.includes("'IBA500'"), false, 'IBA500 must not be seeded in complete_database_setup.sql');
    assert.equal(migrationSql.includes("'HUNARMAND10'"), false, 'HUNARMAND10 must not be seeded in migration 20261007000006');
    assert.equal(migrationSql.includes("'IBA500'"), false, 'IBA500 must not be seeded in migration 20261007000006');
  });

  // 20. Public OnlineJoinPage does not suggest HUNARMAND10 or IBA500 in UI placeholders
  test('20. Public OnlineJoinPage does not expose demo coupons in placeholder text', () => {
    const pageContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/public/OnlineJoinPage.tsx'), 'utf-8');
    assert.equal(pageContent.includes('HUNARMAND10'), false, 'HUNARMAND10 must not appear in OnlineJoinPage');
    assert.equal(pageContent.includes('IBA500'), false, 'IBA500 must not appear in OnlineJoinPage');
  });
});
