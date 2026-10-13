import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/payments/submit.ts';

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

interface MockSubmitDbState {
  users: Record<string, { id: string; email: string }>;
  courses: Record<string, any>;
  onlinePayments: Record<string, any>;
  admissions: Record<string, any>;
  offers: any[];
  coupons: Record<string, any>;
  siteSettings?: Record<string, any>;
  failAdmissionInsert?: boolean;
  failPaymentInsert?: boolean;
  failRecordIdReturn?: boolean;
}

function createMockSubmitSupabase(initialState?: Partial<MockSubmitDbState>) {
  const state: MockSubmitDbState = {
    siteSettings: initialState?.siteSettings || {
      id: 'default',
      payment_jazzcash_enabled: true,
      payment_easypaisa_enabled: true,
      payment_bank_enabled: false,
    },
    users: {
      'user-alice-token': { id: 'user-alice-id', email: 'alice@example.com' },
      'user-bob-token': { id: 'user-bob-id', email: 'bob@example.com' },
      ...(initialState?.users || {}),
    },
    courses: {
      'youtube-monetization': {
        id: 'crs-yt-1',
        slug: 'youtube-monetization',
        title: 'YouTube Monetization Mastery',
        price: 6000,
        status: 'published',
      },
      'bad-price-course': {
        id: 'crs-bad-1',
        slug: 'bad-price-course',
        title: 'Course with Invalid Price',
        price: 'invalid_price',
        status: 'published',
      },
      'missing-price-course': {
        id: 'crs-missing-1',
        slug: 'missing-price-course',
        title: 'Course with Missing Price',
        price: null,
        status: 'published',
      },
      'archived-course': {
        id: 'crs-archived-1',
        slug: 'archived-course',
        title: 'Archived Course',
        price: 5000,
        status: 'archived',
      },
      ...(initialState?.courses || {}),
    },
    onlinePayments: {
      'existing-pay-1': {
        id: 'pay-existing-id-123',
        transaction_id: 'TXN-DUPLICATE-999',
        reference_number: 'IBA-PAY-2026-11111',
      },
      ...(initialState?.onlinePayments || {}),
    },
    admissions: {
      ...(initialState?.admissions || {}),
    },
    offers: initialState?.offers || [],
    coupons: initialState?.coupons || {},
    failAdmissionInsert: initialState?.failAdmissionInsert,
    failPaymentInsert: initialState?.failPaymentInsert,
    failRecordIdReturn: initialState?.failRecordIdReturn,
  };

  const client = {
    auth: {
      async getUser(token: string) {
        if (!token || token === 'invalid-token' || token === 'expired-token') {
          return { data: { user: null }, error: new Error('Invalid token') };
        }
        const user = state.users[token];
        if (!user) {
          return { data: { user: null }, error: new Error('User not found') };
        }
        return { data: { user }, error: null };
      },
    },
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
          const list = await query.execute();
          return { data: list.length > 0 ? list[0] : null, error: null };
        },
        async single() {
          const list = await query.execute();
          if (list.length === 0) return { data: null, error: new Error('Not found') };
          return { data: list[0], error: null };
        },
        async execute() {
          let rows: any[] = [];
          if (table === 'courses') {
            rows = Object.values(state.courses);
          } else if (table === 'online_payments') {
            rows = Object.values(state.onlinePayments);
          } else if (table === 'admissions') {
            rows = Object.values(state.admissions);
          } else if (table === 'offers') {
            rows = [...state.offers];
          } else if (table === 'coupons') {
            rows = Object.values(state.coupons);
          } else if (table === 'site_settings_public') {
            rows = state.siteSettings ? [state.siteSettings] : [];
          }

          for (const f of filters) {
            rows = rows.filter((r) => r[f.col] === f.val);
          }
          return rows;
        },
        insert(payload: any) {
          if (table === 'admissions' && state.failAdmissionInsert) {
            return {
              select() {
                return { single: async () => ({ data: null, error: new Error('Database insert failed') }) };
              },
              error: new Error('Database insert failed'),
            };
          }

          if (table === 'online_payments' && state.failPaymentInsert) {
            return {
              select() {
                return { single: async () => ({ data: null, error: new Error('Database insert failed') }) };
              },
              error: new Error('Database insert failed'),
            };
          }

          const id = state.failRecordIdReturn ? undefined : `gen-${table}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const inserted = { ...payload, ...(id ? { id } : {}) };

          if (id) {
            if (table === 'admissions') {
              state.admissions[id] = inserted;
            } else if (table === 'online_payments') {
              state.onlinePayments[id] = inserted;
            }
          }

          return {
            select() {
              return {
                single: async () => ({ data: inserted, error: null }),
              };
            },
            data: inserted,
            error: null,
          };
        },
        delete() {
          return {
            eq(col: string, val: any) {
              if (table === 'admissions') {
                delete state.admissions[val];
              } else if (table === 'online_payments') {
                delete state.onlinePayments[val];
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        then: async (resolve: any) => {
          const rows = await query.execute();
          resolve({ data: rows, error: null });
        },
      };

      return query;
    },
    rpc: async () => ({ data: null, error: null }),
    _state: state,
  };

  return client;
}

const validPayload = {
  fullName: 'Muhammad Usman',
  email: 'usman@example.com',
  phone: '03001234567',
  city: 'Sadiqabad',
  courseSlug: 'youtube-monetization',
  paymentMethod: 'jazzcash',
  transactionId: 'TXN-NEW-8888',
  accountSenderName: 'Usman',
};

describe('Payment Submission API Tests (api/payments/submit.ts)', () => {
  // Case 1: Supabase unavailable
  test('1. Supabase unavailable: fails safely with HTTP 503, never returns ok: true', async () => {
    // Save original env vars
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
        headers: {},
        body: validPayload,
      };
      const res = createMockRes();

      await handler(req, res, undefined); // dbClient is undefined

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

  // Case 2: Invalid or unknown course
  test('2a. Invalid or unknown course: rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        courseSlug: 'non-existent-course-slug',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Course record not found/i);
  });

  test('2b. Archived course: rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        courseSlug: 'archived-course',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /archived and no longer accepting enrollments/i);
  });

  test('2c. Course with missing/null price in DB: rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        courseSlug: 'missing-price-course',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Course price is missing or invalid in database/i);
  });

  // Case 3: Missing or invalid authenticated identity where authentication is required
  test('3a. Invalid bearer session token: rejected with HTTP 401', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
      body: validPayload,
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or expired session token/i);
  });

  test('3b. Unauthenticated client claims a userId without bearer token: rejected with HTTP 401', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {}, // No Authorization header
      body: {
        ...validPayload,
        userId: 'some-claimed-user-id',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Authentication token required/i);
  });

  // Case 4: Client submits another user's userId
  test("4. Client submits another user's userId: rejected with HTTP 403 Forbidden", async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer user-alice-token' }, // Alice is authenticated
      body: {
        ...validPayload,
        userId: 'user-bob-id', // Tries to submit on behalf of Bob
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Cannot submit payment on behalf of another user account/i);
  });

  // Case 5: Invalid or unverifiable price
  test('5a. Course with invalid price: rejected with HTTP 400 without falling back to Rs. 5000', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        courseSlug: 'bad-price-course',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or unverifiable course price/i);
  });

  test('5b. Client supplies mismatched payment amount: rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        amount: 2000, // Client attempts to underpay (course price is 6000)
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Payment amount mismatch/i);
  });

  // Case 6: Required database insert fails
  test('6a. Admission insert failure: fails safely with HTTP 500, never returns ok: true', async () => {
    const mockDb = createMockSubmitSupabase({ failAdmissionInsert: true });
    const req = {
      method: 'POST',
      headers: {},
      body: validPayload,
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to record admission/i);
  });

  test('6b. Payment insert failure: fails safely with HTTP 500, never returns ok: true', async () => {
    const mockDb = createMockSubmitSupabase({ failPaymentInsert: true });
    const req = {
      method: 'POST',
      headers: {},
      body: validPayload,
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to record payment/i);
  });

  test('6c. Payment insert failure cleans up orphan admission record (compensation)', async () => {
    const mockDb = createMockSubmitSupabase({ failPaymentInsert: true });
    const req = {
      method: 'POST',
      headers: {},
      body: validPayload,
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    // Verify that the orphan admission created before payment failure was cleaned up/deleted
    assert.equal(Object.keys(mockDb._state.admissions).length, 0);
  });

  test('6d. Missing required record ID after insert: fails safely with HTTP 500', async () => {
    const mockDb = createMockSubmitSupabase({ failRecordIdReturn: true });
    const req = {
      method: 'POST',
      headers: {},
      body: validPayload,
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to record/i);
  });

  // Case 7: Valid submission saves all required records and returns real IDs
  test('7a. Valid submission saves all required records and returns real IDs with authoritative pricing', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer user-alice-token' },
      body: {
        ...validPayload,
        userId: 'user-alice-id',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.admissionId, 'Expected non-null admissionId');
    assert.ok(res.body.paymentId, 'Expected non-null paymentId');
    assert.equal(typeof res.body.admissionId, 'string');
    assert.equal(typeof res.body.paymentId, 'string');
    assert.equal(res.body.basePrice, 6000); // Authoritative course price
    assert.equal(res.body.finalAmount, 6000);

    // Verify stored records in database
    const savedAdm = mockDb._state.admissions[res.body.admissionId];
    assert.ok(savedAdm);
    assert.equal(savedAdm.full_name, 'Muhammad Usman');
    assert.equal(savedAdm.user_id, 'user-alice-id');

    const savedPay = mockDb._state.onlinePayments[res.body.paymentId];
    assert.ok(savedPay);
    assert.equal(savedPay.admission_id, res.body.admissionId);
    assert.equal(savedPay.user_id, 'user-alice-id');
    assert.equal(savedPay.final_amount, 6000);
    assert.equal(savedPay.payment_status, 'pending');
  });

  test('7b. Submitting screenshot proof does NOT automatically mark payment verified', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        screenshotPath: 'guest/1728560000_receipt.jpg',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);

    const savedPay = mockDb._state.onlinePayments[res.body.paymentId];
    assert.ok(savedPay);
    // Crucial check: status MUST be 'pending', NEVER 'verified'
    assert.equal(savedPay.payment_status, 'pending');
    assert.equal(savedPay.screenshot_path, 'guest/1728560000_receipt.jpg');
  });

  // Case 8: Repeated request does not silently create duplicate payments
  test('8. Repeated request with duplicate transaction ID: rejected with HTTP 409 Conflict', async () => {
    const mockDb = createMockSubmitSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        transactionId: 'TXN-DUPLICATE-999', // Already exists in online_payments
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.duplicateTx, true);
    assert.match(res.body.error, /pehle use ho chuki hai/i);
  });

  // Case 9: Disabled payment method validation
  test('9a. Payment with disabled payment method (JazzCash disabled in settings) is rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase({
      siteSettings: {
        id: 'default',
        payment_jazzcash_enabled: false,
        payment_easypaisa_enabled: true,
        payment_bank_enabled: false,
      },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        paymentMethod: 'jazzcash',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /JazzCash payment method is currently disabled/i);
  });

  test('9b. Payment with disabled payment method (Bank Transfer disabled by default) is rejected with HTTP 400', async () => {
    const mockDb = createMockSubmitSupabase({
      siteSettings: {
        id: 'default',
        payment_jazzcash_enabled: true,
        payment_easypaisa_enabled: true,
        payment_bank_enabled: false,
      },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        ...validPayload,
        paymentMethod: 'bank_transfer',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Bank Transfer payment method is currently disabled/i);
  });
});
