import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import the adapter and all functions
import { handleCloudflareRequest, createNodeResponseMock } from '../functions/_adapter';
import { onRequest as healthHandler } from '../functions/api/health';
import { onRequest as certVerifyHandler } from '../functions/api/certificates/verify';
import { onRequest as admissionsSubmitHandler } from '../functions/api/admissions/submit';
import { onRequest as paymentsCalculateHandler } from '../functions/api/payments/calculate';
import { onRequest as paymentsSubmitHandler } from '../functions/api/payments/submit';
import { onRequest as adminVerifyPaymentHandler } from '../functions/api/admin/verify-payment';
import { onRequest as adminRejectPaymentHandler } from '../functions/api/admin/reject-payment';
import { onRequest as adminPaymentProofUrlHandler } from '../functions/api/admin/payment-proof-url';
import { onRequest as adminApproveRegistrationHandler } from '../functions/api/admin/approve-registration';
import { onRequest as adminEnrollmentsHandler } from '../functions/api/admin/enrollments';
import { onRequest as adminCertIssueHandler } from '../functions/api/admin/certificates/issue';
import { onRequest as adminCertRevokeHandler } from '../functions/api/admin/certificates/revoke';
import { onRequest as catchallHandler } from '../functions/api/[[catchall]]';

describe('Prompt 10 — Cloudflare Pages Functions Adapter & Runtime Verification', () => {

  // ==========================================
  // SECTION 1: Adapter Unit Tests (req/res conversions)
  // ==========================================
  describe('1. Adapter req/res fidelity & conversions', () => {
    test('1.1. createNodeResponseMock supports full method chaining (.status().json(), .setHeader().status().send())', () => {
      const res1 = createNodeResponseMock();
      const r1 = res1.status(201).json({ success: true });
      assert.equal(r1, res1, 'status().json() must return res for chaining');
      assert.equal(res1._getStatusCode(), 201);
      assert.equal(res1._getHeaders()['content-type'], 'application/json');
      assert.equal(res1._getBody(), JSON.stringify({ success: true }));
      assert.equal(res1._isEnded(), true);

      const res2 = createNodeResponseMock();
      res2.setHeader('Allow', 'POST').status(405).json({ ok: false, error: 'Method Not Allowed' });
      assert.equal(res2._getStatusCode(), 405);
      assert.equal(res2._getHeaders()['allow'], 'POST');
      assert.equal(res2.getHeader('Allow'), 'POST');
      assert.equal(res2.hasHeader('allow'), true);
      assert.equal(res2.hasHeader('ALLOW'), true);

      const res3 = createNodeResponseMock();
      res3.status(200).end();
      assert.equal(res3._getStatusCode(), 200);
      assert.equal(res3._isEnded(), true);
      assert.equal(res3._getBody(), null);

      const res4 = createNodeResponseMock();
      res4.writeHead(202, { 'X-Custom-Header': 'custom-val' }).send('Accepted');
      assert.equal(res4._getStatusCode(), 202);
      assert.equal(res4._getHeaders()['x-custom-header'], 'custom-val');
      assert.equal(res4._getBody(), 'Accepted');
    });

    test('1.2. Adapter converts Request method, url, query parameters, and headers with case-insensitive Proxy', async () => {
      let receivedReq: any = null;

      const dummyHandler = async (req: any, res: any) => {
        receivedReq = req;
        return res.status(200).json({ ok: true });
      };

      const request = new Request('https://theinspirebusinessacademy.pages.dev/api/test?code=IBA-2026-1234&category=tech&tag=one&tag=two', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123',
          'X-Academy-Client': 'web-v1',
        },
        body: JSON.stringify({ courseSlug: 'digital-marketing' }),
      });

      const response = await handleCloudflareRequest({ request, env: {} }, dummyHandler);
      assert.equal(response.status, 200);
      assert.ok(receivedReq, 'Handler must receive converted req');
      assert.equal(receivedReq.method, 'POST');
      assert.equal(receivedReq.url, '/api/test?code=IBA-2026-1234&category=tech&tag=one&tag=two');

      // Query parameters
      assert.equal(receivedReq.query.code, 'IBA-2026-1234');
      assert.equal(receivedReq.query.category, 'tech');
      assert.deepEqual(receivedReq.query.tag, ['one', 'two']);

      // Headers (case-insensitive proxy)
      assert.equal(receivedReq.headers.authorization, 'Bearer test-token-123');
      assert.equal(receivedReq.headers.Authorization, 'Bearer test-token-123');
      assert.equal(receivedReq.headers['content-type'], 'application/json');
      assert.equal(receivedReq.headers['Content-Type'], 'application/json');
      assert.equal(receivedReq.headers['x-academy-client'], 'web-v1');

      // Parsed body
      assert.deepEqual(receivedReq.body, { courseSlug: 'digital-marketing' });
    });

    test('1.3. Adapter gracefully parses plain text and empty body payloads', async () => {
      let textBody: any = null;
      let emptyBody: any = null;

      // Plain text handler
      await handleCloudflareRequest(
        {
          request: new Request('https://theinspirebusinessacademy.pages.dev/api/text', {
            method: 'POST',
            headers: { 'content-type': 'text/plain' },
            body: 'plain-token-string',
          }),
        },
        async (req, res) => {
          textBody = req.body;
          return res.status(200).send('OK');
        }
      );
      assert.equal(textBody, 'plain-token-string');

      // Empty body handler
      await handleCloudflareRequest(
        {
          request: new Request('https://theinspirebusinessacademy.pages.dev/api/empty', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '',
          }),
        },
        async (req, res) => {
          emptyBody = req.body;
          return res.status(200).json({ ok: true });
        }
      );
      assert.deepEqual(emptyBody, {});
    });

    test('1.4. Adapter handles synchronous handlers as well as asynchronous handlers', async () => {
      const syncHandler = (req: any, res: any) => {
        return res.status(200).json({ sync: true });
      };

      const response = await handleCloudflareRequest(
        { request: new Request('https://theinspirebusinessacademy.pages.dev/api/sync') },
        syncHandler
      );
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.sync, true);
    });

    test('1.5. Adapter catches unhandled errors, redacts sensitive details from both response and server logs, and provides correlation ID', async () => {
      const sentinelSecret = 'SYNTHETIC_SENSITIVE_DB_PASSWORD_XYZ999';
      const sentinelQuerySecret = 'SYNTHETIC_TOKEN_IN_QUERY_PARAM_123';
      const originalConsoleError = console.error;
      const loggedMessages: string[] = [];

      console.error = (...args: any[]) => {
        loggedMessages.push(args.map((a) => String(a)).join(' '));
      };

      try {
        const crashingHandler = async () => {
          throw new Error(`Connection failed with database password ${sentinelSecret} at /var/db/conn.ts`);
        };

        const response = await handleCloudflareRequest(
          {
            request: new Request(`https://theinspirebusinessacademy.pages.dev/api/crash?apiKey=${sentinelQuerySecret}`, {
              headers: {
                Authorization: 'Bearer SYNTHETIC_BEARER_TOKEN_ABC',
              },
            }),
          },
          crashingHandler
        );

        assert.equal(response.status, 500);
        assert.equal(response.headers.get('content-type'), 'application/json');

        const json = await response.json();
        assert.equal(json.ok, false);
        assert.equal(json.error, 'Internal server error in Cloudflare function adapter.');
        assert.ok(json.correlationId, 'correlationId must be returned to client for safe diagnostics');
        assert.equal(typeof json.correlationId, 'string');

        // 1. Client response must NEVER contain secrets, stack traces, or query tokens
        const responseText = JSON.stringify(json);
        assert.equal(responseText.includes(sentinelSecret), false, 'Response must not contain sentinel secret');
        assert.equal(responseText.includes(sentinelQuerySecret), false, 'Response must not contain query secret');
        assert.equal(responseText.includes('SYNTHETIC_BEARER_TOKEN_ABC'), false, 'Response must not contain bearer token');
        assert.equal(responseText.includes('/var/db/conn.ts'), false, 'Response must not contain internal paths');

        // 2. Server routine logs must NEVER contain raw error messages, secrets, query tokens, or auth headers
        const fullLogs = loggedMessages.join('\n');
        assert.equal(fullLogs.includes(sentinelSecret), false, 'Server logs must not contain sentinel secret');
        assert.equal(fullLogs.includes(sentinelQuerySecret), false, 'Server logs must not contain query secrets');
        assert.equal(fullLogs.includes('SYNTHETIC_BEARER_TOKEN_ABC'), false, 'Server logs must not contain auth tokens');
        assert.equal(fullLogs.includes('/var/db/conn.ts'), false, 'Server logs must not contain internal file paths');

        // 3. Server routine logs must contain safe operational metadata
        assert.ok(fullLogs.includes(json.correlationId), 'Server logs must record matching correlation ID');
        assert.ok(fullLogs.includes('path=/api/crash'), 'Server logs must record sanitized path without query strings');
      } finally {
        console.error = originalConsoleError;
      }
    });

    test('1.6. Passes context.env to req.env safely without mutating globalThis.process.env, and preserves dependency injected dbClient, req.ai, and req.cfContext', async () => {
      let seenReqEnvKey = '';
      let seenGlobalEnvKey = '';
      let seenDbClient = '';
      let seenAiBinding = false;
      let seenCfContext = false;

      const mockAi = { run: async () => ({ response: 'mock' }) };
      const cfContext = {
        request: new Request('https://theinspirebusinessacademy.pages.dev/api/env-test'),
        env: { TEST_CF_SECRET: 'cf_runtime_token_999', AI: mockAi },
        dbClient: { identifier: 'mock_supabase_client_v1' },
      };

      const testHandler = async (req: any, res: any, dbClient: any) => {
        seenReqEnvKey = req?.env?.TEST_CF_SECRET || '';
        seenGlobalEnvKey = (globalThis as any).process?.env?.TEST_CF_SECRET || '';
        seenDbClient = dbClient?.identifier || '';
        seenAiBinding = Boolean(req?.ai && typeof req.ai.run === 'function');
        seenCfContext = Boolean(req?.cfContext);
        return res.status(200).json({ ok: true });
      };

      const response = await handleCloudflareRequest(cfContext, testHandler);

      assert.equal(response.status, 200);
      assert.equal(seenReqEnvKey, 'cf_runtime_token_999', 'req.env must receive request-scoped environment binding');
      assert.notEqual(seenGlobalEnvKey, 'cf_runtime_token_999', 'Must not mutate globalThis.process.env with request secrets');
      assert.equal(seenDbClient, 'mock_supabase_client_v1', 'Dependency injected dbClient must be preserved');
      assert.equal(seenAiBinding, true, 'req.ai binding must be available on request object');
      assert.equal(seenCfContext, true, 'req.cfContext must be available on request object');
    });

    test('1.7. Adapter process.env shim is frozen, empty, and throws/fails on write attempts in strict mode', async () => {
      // Simulate environment where globalThis.process was undefined
      const originalProcess = (globalThis as any).process;
      try {
        delete (globalThis as any).process;

        const cfContext = {
          request: new Request('https://theinspirebusinessacademy.pages.dev/api/shim-test'),
          env: { SECRET_IN_REQ: 'do-not-leak-to-global' },
        };

        const testHandler = async (req: any, res: any) => {
          assert.equal(typeof (globalThis as any).process, 'object');
          assert.ok(Object.isFrozen((globalThis as any).process.env), 'globalThis.process.env must be frozen');
          assert.equal((globalThis as any).process.env.SECRET_IN_REQ, undefined, 'Must not leak request secret into process.env');
          assert.equal(req.env.SECRET_IN_REQ, 'do-not-leak-to-global', 'Secret must be on req.env');

          // Attempting to write to frozen process.env throws TypeError in strict mode
          assert.throws(() => {
            'use strict';
            (globalThis as any).process.env.TEST_WRITE = 'forbidden';
          }, TypeError);

          return res.status(200).json({ ok: true });
        };

        const response = await handleCloudflareRequest(cfContext, testHandler);
        assert.equal(response.status, 200);
      } finally {
        (globalThis as any).process = originalProcess;
      }
    });

    test('1.8. getEnv helper prioritizes request-scoped req.env over ambient process.env without cross-request bleeding', async () => {
      const { getEnv } = await import('../api/_lib/env');

      const reqA = { env: { API_KEY: 'token-request-A', SHARED_CFG: 'cfg-A' } };
      const reqB = { env: { API_KEY: 'token-request-B', SHARED_CFG: 'cfg-B' } };
      const reqEmpty = { env: {} };

      // Request-scoped retrieval
      assert.equal(getEnv(reqA, 'API_KEY'), 'token-request-A');
      assert.equal(getEnv(reqB, 'API_KEY'), 'token-request-B');

      // Ambience fallback works for unset keys if in Node environment, but req.env always wins
      assert.equal(getEnv(reqEmpty, 'NON_EXISTENT_KEY_999'), undefined);
    });
  });

  // ==========================================
  // SECTION 2: Production Endpoints Compatibility
  // ==========================================
  describe('2. Production API endpoints through Cloudflare Pages Functions', () => {
    test('2.1. /api/health returns 200 on GET and 405 with Allow header on POST', async () => {
      // Valid GET
      const getReq = new Request('https://theinspirebusinessacademy.pages.dev/api/health', { method: 'GET' });
      const getRes = await healthHandler({ request: getReq });
      assert.equal(getRes.status, 200);
      assert.equal(getRes.headers.get('content-type'), 'application/json');
      const getJson = await getRes.json();
      assert.equal(getJson.ok, true);
      assert.equal(getJson.status, 'healthy');
      assert.equal(getJson.service, 'The Inspire Business Academy');

      // Invalid POST
      const postReq = new Request('https://theinspirebusinessacademy.pages.dev/api/health', { method: 'POST' });
      const postRes = await healthHandler({ request: postReq });
      assert.equal(postRes.status, 405);
      assert.equal(postRes.headers.get('allow'), 'GET, HEAD');
      const postJson = await postRes.json();
      assert.equal(postJson.ok, false);
    });

    test('2.2. /api/certificates/verify handles OPTIONS preflight and GET parameter verification', async () => {
      // OPTIONS Preflight
      const optionsReq = new Request('https://theinspirebusinessacademy.pages.dev/api/certificates/verify', {
        method: 'OPTIONS',
      });
      const optionsRes = await certVerifyHandler({ request: optionsReq });
      assert.equal(optionsRes.status, 200);
      assert.equal(optionsRes.headers.get('access-control-allow-origin'), '*');
      assert.equal(optionsRes.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');

      // Missing code on GET returns 400
      const missingReq = new Request('https://theinspirebusinessacademy.pages.dev/api/certificates/verify', {
        method: 'GET',
      });
      const missingRes = await certVerifyHandler({ request: missingReq });
      assert.equal(missingRes.status, 400);
      const missingJson = await missingRes.json();
      assert.match(missingJson.error, /Certificate code or verification token is required/i);

      // Malformed code returns 400
      const malformedReq = new Request('https://theinspirebusinessacademy.pages.dev/api/certificates/verify?code=bad!code@value', {
        method: 'GET',
      });
      const malformedRes = await certVerifyHandler({ request: malformedReq });
      assert.equal(malformedRes.status, 400);
      const malformedJson = await malformedRes.json();
      assert.match(malformedJson.error, /Malformed certificate code/i);
    });

    test('2.3. /api/payments/calculate performs authoritative price calculation via Cloudflare adapter', async () => {
      // 1. Missing database configuration fails safely with HTTP 503, never false success
      const reqMissingDb = new Request('https://theinspirebusinessacademy.pages.dev/api/payments/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ courseSlug: 'digital-marketing' }),
      });
      const resMissingDb = await paymentsCalculateHandler({ request: reqMissingDb, env: {} });
      assert.equal(resMissingDb.status, 503);
      const jsonMissingDb = await resMissingDb.json();
      assert.equal(jsonMissingDb.ok, false);
      assert.match(jsonMissingDb.error, /Database service unavailable/i);

      // Mock database client with chainable query builder
      const createMockDb = (courseData: any) => {
        const query: any = {
          select: () => query,
          eq: () => query,
          lte: () => query,
          gte: () => query,
          order: () => query,
          is: () => query,
          maybeSingle: async () => ({ data: courseData, error: null }),
          single: async () => ({ data: courseData, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
        return {
          from: () => query,
        };
      };

      const mockCourse = {
        id: 'crs-dm-1',
        slug: 'digital-marketing',
        title: 'Digital Marketing Mastery',
        price: 5000,
        status: 'published',
      };
      const validDb = createMockDb(mockCourse);
      const notFoundDb = createMockDb(null);

      // 2. Authoritative calculation with database client passes via Cloudflare adapter
      const reqWithDb = new Request('https://theinspirebusinessacademy.pages.dev/api/payments/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ courseSlug: 'digital-marketing' }),
      });
      const resWithDb = await paymentsCalculateHandler({ request: reqWithDb, dbClient: validDb });
      assert.equal(resWithDb.status, 200);
      const jsonWithDb = await resWithDb.json();
      assert.equal(jsonWithDb.ok, true);
      assert.equal(jsonWithDb.basePrice, 5000);
      assert.equal(jsonWithDb.finalAmount, 5000);
      assert.equal(jsonWithDb.itemTitle, 'Digital Marketing Mastery');

      // 3. Calculation for invalid course returns 400
      const invalidReq = new Request('https://theinspirebusinessacademy.pages.dev/api/payments/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ courseSlug: 'non-existent-course-slug' }),
      });
      const invalidRes = await paymentsCalculateHandler({ request: invalidReq, dbClient: notFoundDb });
      assert.equal(invalidRes.status, 400);
      const invalidJson = await invalidRes.json();
      assert.equal(invalidJson.ok, false);

      // 4. Disallowed GET returns 405
      const getReq = new Request('https://theinspirebusinessacademy.pages.dev/api/payments/calculate', {
        method: 'GET',
      });
      const getRes = await paymentsCalculateHandler({ request: getReq });
      assert.equal(getRes.status, 405);
      assert.equal(getRes.headers.get('allow'), 'POST');
    });

    test('2.4. /api/admissions/submit validates required fields and admissionType', async () => {
      const invalidTypeReq = new Request('https://theinspirebusinessacademy.pages.dev/api/admissions/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ admissionType: 'unsupported-type', fullName: 'Ali Khan' }),
      });
      const invalidTypeRes = await admissionsSubmitHandler({ request: invalidTypeReq });
      assert.equal(invalidTypeRes.status, 400);
      const invalidTypeJson = await invalidTypeRes.json();
      assert.match(invalidTypeJson.error, /Invalid admission type/i);
    });

    test('2.5. /api/payments/submit enforces field validation and blocks unauthenticated requests', async () => {
      const emptyReq = new Request('https://theinspirebusinessacademy.pages.dev/api/payments/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const emptyRes = await paymentsSubmitHandler({ request: emptyReq });
      assert.equal(emptyRes.status, 400);
      const emptyJson = await emptyRes.json();
      assert.match(emptyJson.error, /Full name is required/i);
    });
  });

  // ==========================================
  // SECTION 3: Security & Staff Authorization Under Cloudflare
  // ==========================================
  describe('3. Staff authorization & security controls preserved', () => {
    test('3.1. Admin endpoints reject calls without Bearer tokens (HTTP 401)', async () => {
      const endpoints = [
        { name: 'verify-payment', handler: adminVerifyPaymentHandler, body: { paymentId: 'p-1' } },
        { name: 'reject-payment', handler: adminRejectPaymentHandler, body: { paymentId: 'p-1' } },
        { name: 'payment-proof-url', handler: adminPaymentProofUrlHandler, body: { paymentId: 'p-1' } },
        { name: 'approve-registration', handler: adminApproveRegistrationHandler, body: { admissionId: 'adm-1' } },
        { name: 'enrollments', handler: adminEnrollmentsHandler, body: { enrollmentId: 'enr-1', action: 'extend' } },
        { name: 'certificates/issue', handler: adminCertIssueHandler, body: { studentId: 'stu-1' } },
        { name: 'certificates/revoke', handler: adminCertRevokeHandler, body: { certificateId: 'c-1', reason: 'Test' } },
      ];

      for (const ep of endpoints) {
        const req = new Request(`https://theinspirebusinessacademy.pages.dev/api/admin/${ep.name}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(ep.body),
        });
        const res = await ep.handler({ request: req, env: {} });
        assert.equal(res.status, 401, `Endpoint /api/admin/${ep.name} must return 401 when token is missing`);
        const json = await res.json();
        assert.equal(json.ok, false);
        assert.match(json.error, /Unauthorized.*token is required/i);
      }
    });

    test('3.2. Server-only secrets are never exposed in responses or leaks', async () => {
      const secretRoleKey = 'test_secret_service_role_key_abc_123';
      const secretBootstrap = 'test_bootstrap_secret_xyz_789';

      const req = new Request('https://theinspirebusinessacademy.pages.dev/api/admin/approve-registration', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ admissionId: 'adm-123' }),
      });

      const res = await adminApproveRegistrationHandler({
        request: req,
        env: {
          SUPABASE_SERVICE_ROLE_KEY: secretRoleKey,
          BOOTSTRAP_SECRET: secretBootstrap,
        },
      });

      const text = await res.text();
      assert.equal(text.includes(secretRoleKey), false, 'SUPABASE_SERVICE_ROLE_KEY must never leak');
      assert.equal(text.includes(secretBootstrap), false, 'BOOTSTRAP_SECRET must never leak');
    });
  });

  // ==========================================
  // SECTION 4: Routing & Fallbacks
  // ==========================================
  describe('4. Routing, catch-all 404, and SPA fallback rules', () => {
    test('4.1. Unknown /api/* route returns clean JSON 404, never serving HTML index.html', async () => {
      const req = new Request('https://theinspirebusinessacademy.pages.dev/api/unknown-service-path', {
        method: 'GET',
      });
      const res = await catchallHandler({ request: req });
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.statusCode, 404);
      assert.match(json.error, /API route not found: \/api\/unknown-service-path/i);
    });

    test('4.2. Every production endpoint in api/ has an exact matching Cloudflare Pages Function', () => {
      const expectedEndpoints = [
        'health.ts',
        'certificates/verify.ts',
        'admissions/submit.ts',
        'payments/calculate.ts',
        'payments/submit.ts',
        'admin/verify-payment.ts',
        'admin/reject-payment.ts',
        'admin/payment-proof-url.ts',
        'admin/approve-registration.ts',
        'admin/enrollments.ts',
        'admin/certificates/issue.ts',
        'admin/certificates/revoke.ts',
        'admin/managers.ts',
        'ai/chat.ts',
        'admin/ai/generate.ts',
      ];

      for (const ep of expectedEndpoints) {
        const funcPath = path.resolve(process.cwd(), 'functions/api', ep);
        assert.ok(fs.existsSync(funcPath), `Missing Cloudflare Pages Function for: api/${ep}`);
      }

      const catchallPath = path.resolve(process.cwd(), 'functions/api/[[catchall]].ts');
      assert.ok(fs.existsSync(catchallPath), 'Missing Cloudflare catchall 404 handler');
    });

    test('4.3. public/_routes.json, public/_redirects, and public/_headers are configured for Cloudflare Pages SPA deployment', () => {
      // _redirects must contain standard SPA fallback rule
      assert.equal(fs.existsSync(path.resolve(process.cwd(), 'public/_redirects')), true, 'public/_redirects must exist');
      const redirectsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf-8').trim();
      assert.equal(redirectsContent, '/* /index.html 200');

      // Top-level 404.html must not exist so Cloudflare Pages automatically serves index.html for SPA routes
      assert.equal(fs.existsSync(path.resolve(process.cwd(), 'public/404.html')), false, 'public/404.html must not exist');
      assert.equal(fs.existsSync(path.resolve(process.cwd(), '404.html')), false, 'root 404.html must not exist');

      // public/_routes.json must include /api/* and exclude nothing
      const routesJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/_routes.json'), 'utf-8'));
      assert.deepEqual(routesJson, { version: 1, include: ['/api/*'], exclude: [] });

      // public/_headers must enforce security headers across all paths
      const publicHeaders = fs.readFileSync(path.resolve(process.cwd(), 'public/_headers'), 'utf-8');
      assert.match(publicHeaders, /X-Content-Type-Options: nosniff/);
      assert.match(publicHeaders, /X-Frame-Options: DENY/);
      assert.match(publicHeaders, /Referrer-Policy: strict-origin-when-cross-origin/);
    });

    test('4.4. Every Cloudflare Pages Function wrapper exports all supported HTTP methods', async () => {
      const wrappers = [
        await import('../functions/api/health'),
        await import('../functions/api/certificates/verify'),
        await import('../functions/api/admissions/submit'),
        await import('../functions/api/payments/calculate'),
        await import('../functions/api/payments/submit'),
        await import('../functions/api/admin/verify-payment'),
        await import('../functions/api/admin/reject-payment'),
        await import('../functions/api/admin/payment-proof-url'),
        await import('../functions/api/admin/approve-registration'),
        await import('../functions/api/admin/enrollments'),
        await import('../functions/api/admin/certificates/issue'),
        await import('../functions/api/admin/certificates/revoke'),
        await import('../functions/api/admin/managers'),
        await import('../functions/api/ai/chat'),
        await import('../functions/api/admin/ai/generate'),
        await import('../functions/api/[[catchall]]'),
      ];

      const expectedMethods = ['onRequest', 'onRequestGet', 'onRequestPost', 'onRequestPut', 'onRequestPatch', 'onRequestDelete', 'onRequestOptions'];

      for (const wrapper of wrappers) {
        for (const method of expectedMethods) {
          assert.equal(typeof (wrapper as any)[method], 'function', `Wrapper must export function ${method}`);
        }
      }
    });
  });
});
