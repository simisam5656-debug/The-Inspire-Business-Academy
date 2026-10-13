import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import paymentProofUrlHandler from '../api/admin/payment-proof-url.ts';
import enrollmentsHandler from '../api/admin/enrollments.ts';
import verifyPaymentHandler from '../api/admin/verify-payment.ts';
import rejectPaymentHandler from '../api/admin/reject-payment.ts';
import admissionsSubmitHandler from '../api/admissions/submit.ts';
import { authenticateStaff } from '../api/_lib/auth.ts';

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

interface MockState {
  users: Record<string, { id: string; email: string }>;
  profiles: Record<string, any>;
  managerPermissions: Array<{ profile_id: string; permission_key: string }>;
  onlinePayments: Record<string, any>;
  storageFiles: Record<string, boolean>;
  storageFailError?: { message: string } | null;
  storageThrowException?: boolean;
}

function createMockDb(initialState?: Partial<MockState>) {
  const state: MockState = {
    users: {
      'admin-token': { id: 'admin-id', email: 'admin@iba.edu.pk' },
      'manager-token': { id: 'manager-id', email: 'manager@iba.edu.pk' },
      'student-token': { id: 'student-id', email: 'student@example.com' },
      'unauth-manager-token': { id: 'unauth-manager-id', email: 'othermanager@iba.edu.pk' },
      ...(initialState?.users || {}),
    },
    profiles: {
      'admin-id': {
        id: 'admin-id',
        email: 'admin@iba.edu.pk',
        full_name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
      },
      'manager-id': {
        id: 'manager-id',
        email: 'manager@iba.edu.pk',
        full_name: 'Finance Manager',
        role: 'manager',
        is_active: true,
      },
      'unauth-manager-id': {
        id: 'unauth-manager-id',
        email: 'othermanager@iba.edu.pk',
        full_name: 'Academics Manager',
        role: 'manager',
        is_active: true,
      },
      'student-id': {
        id: 'student-id',
        email: 'student@example.com',
        full_name: 'Student User',
        role: 'student',
        is_active: true,
      },
      ...(initialState?.profiles || {}),
    },
    managerPermissions: [
      { profile_id: 'manager-id', permission_key: 'payments' },
      ...(initialState?.managerPermissions || []),
    ],
    onlinePayments: {
      'pay-1': {
        id: 'pay-1',
        reference_number: 'IBA-PAY-2026-001',
        screenshot_path: 'proofs/student-receipt-123.jpg',
      },
      'pay-no-proof': {
        id: 'pay-no-proof',
        reference_number: 'IBA-PAY-2026-002',
        screenshot_path: null,
      },
      'pay-traversal': {
        id: 'pay-traversal',
        reference_number: 'IBA-PAY-2026-003',
        screenshot_path: '../../etc/passwd',
      },
      ...(initialState?.onlinePayments || {}),
    },
    storageFiles: {
      'proofs/student-receipt-123.jpg': true,
      ...(initialState?.storageFiles || {}),
    },
    storageFailError: initialState?.storageFailError,
    storageThrowException: initialState?.storageThrowException,
  };

  return {
    auth: {
      async getUser(token: string) {
        if (!token || !state.users[token]) {
          return { data: { user: null }, error: new Error('Invalid token') };
        }
        return { data: { user: state.users[token] }, error: null };
      },
    },
    storage: {
      from(bucket: string) {
        return {
          async createSignedUrl(path: string, expiresIn: number) {
            if (state.storageThrowException) {
              throw new Error('Fatal internal raw disk failure at /var/storage/s3_credentials.json');
            }
            if (state.storageFailError) {
              return { data: null, error: state.storageFailError };
            }
            if (bucket !== 'payment-proofs') {
              return { data: null, error: new Error('Bucket not found') };
            }
            if (state.storageFiles[path]) {
              return { data: { signedUrl: `https://storage.supabase.co/${bucket}/${path}?token=signed-123&exp=${expiresIn}` }, error: null };
            }
            return { data: null, error: new Error('Object not found in bucket') };
          },
        };
      },
    },
    from(table: string) {
      let filters: Array<{ col: string; val: any }> = [];
      return {
        select(cols: string) {
          return this;
        },
        eq(col: string, val: any) {
          filters.push({ col, val });
          return this;
        },
        async maybeSingle() {
          if (table === 'profiles') {
            const idFilter = filters.find((f) => f.col === 'id');
            const profile = idFilter ? state.profiles[idFilter.val] : null;
            return { data: profile || null, error: null };
          }
          if (table === 'manager_permissions') {
            const pId = filters.find((f) => f.col === 'profile_id')?.val;
            const pKey = filters.find((f) => f.col === 'permission_key')?.val;
            const match = state.managerPermissions.find((mp) => mp.profile_id === pId && mp.permission_key === pKey);
            return { data: match || null, error: null };
          }
          if (table === 'online_payments') {
            const idFilter = filters.find((f) => f.col === 'id')?.val;
            const refFilter = filters.find((f) => f.col === 'reference_number')?.val;
            let record: any = null;
            if (idFilter && state.onlinePayments[idFilter]) {
              record = state.onlinePayments[idFilter];
            } else if (refFilter) {
              record = Object.values(state.onlinePayments).find((p) => p.reference_number === refFilter) || null;
            }
            return { data: record, error: null };
          }
          return { data: null, error: null };
        },
      };
    },
  };
}

describe('Service Role Key Security & Payment Proof URL Authorization Tests', () => {
  // Test A1: authenticateStaff rejects missing SUPABASE_SERVICE_ROLE_KEY and never falls back to publishable key
  test('A1. authenticateStaff: missing SUPABASE_SERVICE_ROLE_KEY returns HTTP 500 even if VITE_SUPABASE_PUBLISHABLE_KEY is set', async () => {
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origUrl = process.env.SUPABASE_URL;
    const origPub = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_URL = 'https://mock-test.supabase.co';
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'anon-public-key-attempted-fallback';

      const req = {
        headers: { authorization: 'Bearer admin-token' },
      };

      const result = await authenticateStaff(req, 'payments');

      assert.equal(result.authorized, false);
      assert.equal(result.statusCode, 500);
      assert.match(result.error || '', /Database credentials not configured/i);
    } finally {
      if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origPub) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = origPub;
    }
  });

  // Test A2: Endpoint handlers fail safely when SUPABASE_SERVICE_ROLE_KEY is missing
  test('A2. Admin endpoints fail safely without service role key', async () => {
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origUrl = process.env.SUPABASE_URL;

    try {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_URL = 'https://mock-test.supabase.co';

      // Verify payment endpoint
      const res1 = createMockRes();
      await verifyPaymentHandler({ method: 'POST', headers: {}, body: { paymentId: 'pay-1' } }, res1);
      assert.equal(res1.statusCode, 401); // Unauthorized header check before reaching db

      // Admissions submit endpoint
      const res2 = createMockRes();
      await admissionsSubmitHandler(
        {
          method: 'POST',
          body: {
            admissionType: 'online',
            fullName: 'Test Applicant',
            email: 'applicant@example.com',
            phone: '03001234567',
            city: 'Lahore',
            courseSlug: 'shopify-dropshipping',
            courseTitle: 'Shopify Dropshipping',
          },
        },
        res2
      );
      assert.equal(res2.statusCode, 503);
      assert.equal(res2.body.ok, false);
    } finally {
      if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      if (origUrl) process.env.SUPABASE_URL = origUrl;
    }
  });

  // Test B1: Payment-proof-url requires staff authentication
  test('B1. Payment-proof-url: unauthenticated request is rejected with HTTP 401', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: {},
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Bearer authentication token is required/i);
  });

  // Test B2: Non-staff (student) request is rejected with HTTP 403
  test('B2. Payment-proof-url: non-staff user is rejected with HTTP 403', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer student-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /privileges required/i);
  });

  // Test B3: Manager without 'payments' permission is rejected with HTTP 403
  test('B3. Payment-proof-url: manager without payments permission is rejected with HTTP 403', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer unauth-manager-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /lacks permission/i);
  });

  // Test B4: Missing paymentId or referenceNumber is rejected with HTTP 400
  test('B4. Payment-proof-url: missing payment identifier rejected with HTTP 400', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { storagePath: 'proofs/student-receipt-123.jpg' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Payment identifier.*is required/i);
  });

  // Test B5: Non-existent payment record returns HTTP 404
  test('B5. Payment-proof-url: unknown payment record returns HTTP 404', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'non-existent-pay-id' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Payment record not found/i);
  });

  // Test B6: Payment record with no proof returns HTTP 404
  test('B6. Payment-proof-url: payment with null screenshot_path returns HTTP 404', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'pay-no-proof' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /No proof file is associated/i);
  });

  // Test B7: Client-supplied mismatched storagePath is rejected with HTTP 403
  test('B7. Payment-proof-url: mismatched client storagePath is rejected with HTTP 403 Forbidden', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: {
        paymentId: 'pay-1',
        storagePath: 'other-folder/secret-corporate-file.pdf',
      },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Requested storage path does not match the payment record/i);
  });

  // Test B8: Path traversal attempts are rejected
  test('B8. Payment-proof-url: path traversal attempt is rejected with HTTP 400', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'pay-traversal' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or unsafe storage path/i);
  });

  // Test B9: Valid authorized request returns short-lived signed URL
  test('B9. Payment-proof-url: valid staff request returns signedUrl with 300s expiry', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(typeof res.body.signedUrl, 'string');
    assert.equal(res.body.expiresInSeconds, 300);
    assert.match(res.body.signedUrl, /token=signed-123/);
  });

  // Test B10: Manager with 'payments' permission can successfully retrieve signed URL
  test('B10. Payment-proof-url: manager with payments permission succeeds', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-token' },
      body: { referenceNumber: 'IBA-PAY-2026-001' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.expiresInSeconds, 300);
  });

  // Test B11: Storage signed URL creation failure returns HTTP 500 (not 404) and safe generic error
  test('B11. Payment-proof-url: storage provider failure returns HTTP 500 without leaking raw storage error', async () => {
    const mockDb = createMockDb({
      storageFailError: { message: 'S3 backend timeout: connection refused to internal bucket payment-proofs' },
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    // Must be HTTP 500 server/storage error, NOT HTTP 404
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.signedUrl, undefined);
    assert.match(res.body.error, /Failed to generate signed URL from storage service/i);
    // Ensure raw storage provider message is NOT returned to client
    assert.equal(res.body.error.includes('S3 backend timeout'), false);
    assert.equal(res.body.error.includes('internal bucket'), false);
  });

  // Test B12: Unexpected storage exception fails safely with HTTP 500 and never leaks exception details
  test('B12. Payment-proof-url: unexpected exception fails safely with HTTP 500, never returning signed URL or leaking raw exception message', async () => {
    const mockDb = createMockDb({
      storageThrowException: true,
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.signedUrl, undefined);
    assert.match(res.body.error, /Internal server error occurred/i);
    assert.equal(res.body.error.includes('raw disk failure'), false);
    assert.equal(res.body.error.includes('/var/storage'), false);
  });

  // Test B13: No signed URL generated if preceding checks fail
  test('B13. Payment-proof-url: checks fail before storage call; no signed URL is generated for unauthorized caller', async () => {
    let storageCalled = false;
    const trackingDb: any = {
      auth: {
        async getUser() {
          return { data: { user: null }, error: new Error('Invalid token') };
        },
      },
      storage: {
        from() {
          storageCalled = true;
          return {
            async createSignedUrl() {
              storageCalled = true;
              return { data: { signedUrl: 'https://leak.example.com' }, error: null };
            },
          };
        },
      },
    };

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await paymentProofUrlHandler(req, res, trackingDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.signedUrl, undefined);
    assert.equal(storageCalled, false, 'Storage must not be touched if authentication fails');
  });
});
