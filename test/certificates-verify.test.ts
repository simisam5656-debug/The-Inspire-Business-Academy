import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import verifyHandler from '../api/certificates/verify.ts';

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
    end() {
      return res;
    },
  };
  return res;
}

interface MockCertificateDbState {
  certificates: Record<string, any>;
  failQuery?: boolean;
}

function createMockCertificateSupabase(initialState?: Partial<MockCertificateDbState>) {
  const state: MockCertificateDbState = {
    certificates: {
      'INSPIRE-CERT-2026-1001': {
        id: 'cert-uuid-1',
        certificate_code: 'INSPIRE-CERT-2026-1001',
        verification_token: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        student_type: 'online',
        user_id: 'usr-student-1',
        course_id: 'crs-amazon-1',
        course_title: 'Amazon Virtual Assistant',
        recipient_name: 'Muhammad Ali',
        recipient_email: 'ali@example.com',
        score_percentage: 88.5,
        final_grade: 'Excellence (A)',
        issue_date: '2026-03-15',
        status: 'valid',
        revoked_at: null,
        revocation_reason: null,
      },
      'INSPIRE-CERT-2026-1002': {
        id: 'cert-uuid-2',
        certificate_code: 'INSPIRE-CERT-2026-1002',
        verification_token: 'f6e5d4c3b2a10987654321fedcba0987',
        student_type: 'physical',
        physical_student_id: 'phys-student-2',
        course_title: 'Full Stack Web Development',
        recipient_name: 'Fatima Zahra',
        recipient_email: 'fatima@example.com',
        score_percentage: 94.0,
        final_grade: 'Distinction (A+)',
        issue_date: '2026-02-10',
        status: 'revoked',
        revoked_at: '2026-03-01T10:00:00Z',
        revocation_reason: 'Plagiarism in final graduation capstone submission.',
      },
    },
    ...initialState,
  };

  const client: any = {
    _state: state,
    from(table: string) {
      let filterOr = '';
      return {
        select(cols: string) {
          return {
            or(filterStr: string) {
              filterOr = filterStr;
              return {
                async maybeSingle() {
                  if (state.failQuery) {
                    return { data: null, error: { message: 'Database query execution failure.' } };
                  }
                  if (table !== 'certificates') {
                    return { data: null, error: null };
                  }

                  // Parse or condition e.g. "certificate_code.eq.XYZ,verification_token.eq.XYZ"
                  const matches = filterOr.match(/certificate_code\.eq\.([^,]+),verification_token\.eq\.(.+)/);
                  if (matches) {
                    const code = matches[1];
                    const token = matches[2];
                    for (const cert of Object.values(state.certificates)) {
                      if (cert.certificate_code === code || cert.verification_token === token) {
                        return { data: cert, error: null };
                      }
                    }
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  return client;
}

describe('Authoritative Certificate Verification Tests (api/certificates/verify.ts)', () => {
  // Test 1: Valid certificate verification by code
  test('1. Valid certificate query by certificate_code: returns HTTP 200 with isValid: true and safe fields', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.found, true);
    assert.equal(res.body.isValid, true);
    assert.equal(res.body.certificate.certificateCode, 'INSPIRE-CERT-2026-1001');
    assert.equal(res.body.certificate.recipientName, 'Muhammad Ali');
    assert.equal(res.body.certificate.courseTitle, 'Amazon Virtual Assistant');
    assert.equal(res.body.certificate.status, 'valid');
    assert.equal(res.body.certificate.scorePercentage, 88.5);

    // Ensure private data is NEVER leaked
    assert.equal(res.body.certificate.recipientEmail, undefined);
    assert.equal(res.body.certificate.userId, undefined);
    assert.equal(res.body.certificate.user_id, undefined);
  });

  // Test 2: Valid certificate verification by verification_token
  test('2. Valid certificate query by QR verification token: returns HTTP 200 with isValid: true', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?token=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.found, true);
    assert.equal(res.body.isValid, true);
    assert.equal(res.body.certificate.certificateCode, 'INSPIRE-CERT-2026-1001');
  });

  // Test 3: Revoked certificate verification
  test('3. Revoked certificate: returns HTTP 200 with isValid: false, status: revoked, and revocation reason', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1002',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.found, true);
    assert.equal(res.body.isValid, false);
    assert.equal(res.body.certificate.status, 'revoked');
    assert.equal(res.body.certificate.revocationReason, 'Plagiarism in final graduation capstone submission.');
    assert.equal(res.body.certificate.revokedAt, '2026-03-01T10:00:00Z');
  });

  // Test 4: Unknown certificate code
  test('4. Unknown certificate code: returns HTTP 404 with found: false and isValid NOT true', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-9999-9999',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.found, false);
    assert.equal(res.body.isValid, undefined);
    assert.match(res.body.error, /No certificate matched/i);
  });

  // Test 5: Former demo codes return NOT FOUND if not in authoritative database
  test('5. Former demo code (INSPIRE-CERT-2026-0001) not in database: returns HTTP 404, never claims valid', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-0001',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.found, false);
  });

  // Test 6: POST request with body identifier
  test('6. POST request with valid body identifier: processes verification successfully', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'POST',
      body: { identifier: 'INSPIRE-CERT-2026-1001' },
      headers: { 'content-type': 'application/json' },
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.isValid, true);
  });

  // Test 7: Malformed certificate code / identifier
  test('7a. Malformed identifier (too short): rejected with HTTP 400', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=ab',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Malformed certificate code/i);
  });

  test('7b. Malformed identifier (invalid characters): rejected with HTTP 400', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=CERT<script>alert(1)</script>',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Malformed certificate code/i);
  });

  test('7c. Missing identifier: rejected with HTTP 400', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /is required/i);
  });

  // Test 8: Missing Supabase database configuration
  test('8. Missing Supabase configuration: returns HTTP 503 Service Unavailable, never falls back to valid', async () => {
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origViteUrl = process.env.VITE_SUPABASE_URL;
    const origViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const origAnonKey = process.env.SUPABASE_ANON_KEY;
    const origPubKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    try {
      const req = {
        method: 'GET',
        url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
        headers: {},
      };
      const res = createMockRes();

      await verifyHandler(req, res); // no dbClient passed

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.ok, false);
      assert.match(res.body.error, /Database service unavailable/i);
    } finally {
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      if (origViteUrl) process.env.VITE_SUPABASE_URL = origViteUrl;
      if (origViteKey) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = origViteKey;
      if (origAnonKey) process.env.SUPABASE_ANON_KEY = origAnonKey;
      if (origPubKey) process.env.SUPABASE_PUBLISHABLE_KEY = origPubKey;
    }
  });

  // Test 9: Database query error
  test('9. Database query failure: returns HTTP 500, never swallows error or returns valid', async () => {
    const mockDb = createMockCertificateSupabase({ failQuery: true });
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Database query failure/i);
  });

  // Test 10: Disallowed HTTP method
  test('10. Unsupported HTTP method (DELETE): rejected with HTTP 405 Method Not Allowed', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'DELETE',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 405);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Method Not Allowed/i);
  });

  // Test 11: OPTIONS preflight response
  test('11. OPTIONS preflight: returns HTTP 200 with appropriate CORS headers', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
  });

  // Test 12: Empty and whitespace identifier validation
  test('12. Empty and whitespace identifier: rejected with HTTP 400', async () => {
    const mockDb = createMockCertificateSupabase();
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=%20%20%20',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /is required/i);
  });

  // Test 13: Service Role Key Isolation (Least Privilege)
  test('13. Service Role Key Isolation: verify endpoint NEVER uses SUPABASE_SERVICE_ROLE_KEY; returns HTTP 503 if only service key is set', async () => {
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origViteUrl = process.env.VITE_SUPABASE_URL;
    const origViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const origAnonKey = process.env.SUPABASE_ANON_KEY;
    const origPubKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    try {
      // Simulate environment where server has service-role key, but public/anon key is missing
      process.env.SUPABASE_URL = 'https://safe-test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-role-key-that-must-not-be-used';
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_PUBLISHABLE_KEY;

      const req = {
        method: 'GET',
        url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
        headers: {},
      };
      const res = createMockRes();

      await verifyHandler(req, res); // no dbClient passed

      // Must fail with 503 because public verify refuses to use service-role key
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.ok, false);
      assert.match(res.body.error, /Database service unavailable/i);
    } finally {
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      if (origViteUrl) process.env.VITE_SUPABASE_URL = origViteUrl;
      if (origViteKey) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = origViteKey;
      if (origAnonKey) process.env.SUPABASE_ANON_KEY = origAnonKey;
      if (origPubKey) process.env.SUPABASE_PUBLISHABLE_KEY = origPubKey;
    }
  });

  // Test 14: Database query throwing unexpected exception fails safely with HTTP 500
  test('14. Unexpected DB throw fails safely with HTTP 500, never returning valid certificate', async () => {
    const explodingDb: any = {
      from() {
        throw new Error('Fatal socket failure in Postgres driver');
      },
    };
    const req = {
      method: 'GET',
      url: '/api/certificates/verify?code=INSPIRE-CERT-2026-1001',
      headers: {},
    };
    const res = createMockRes();

    await verifyHandler(req, res, explodingDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.isValid, undefined);
    assert.match(res.body.error, /Internal server error occurred/i);
    assert.equal(res.body.error.includes('socket failure'), false);
  });
});
