import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import handlers & adapter
import chatHandler from '../api/ai/chat';
import adminAiHandler from '../api/admin/ai/generate';
import { handleCloudflareRequest, createNodeResponseMock } from '../functions/_adapter';
import { onRequest as chatFunctionHandler } from '../functions/api/ai/chat';
import { onRequest as adminAiFunctionHandler } from '../functions/api/admin/ai/generate';
import { runWorkersAi } from '../api/_lib/workersAi';

describe('Prompt 12 — Secure Cloudflare Workers AI Integration Tests', () => {

  // Helper mock for Workers AI binding
  const createMockAiBinding = (mockResponseText: string, onRun?: (model: string, input: any, options?: any) => void) => ({
    run: async (model: string, input: any, options?: any) => {
      if (onRun) onRun(model, input, options);
      return { response: mockResponseText };
    },
  });

  // Helper mock for authenticated Supabase client
  const createMockDbClient = (opts: { role?: 'super_admin' | 'manager' | 'online_student'; permissions?: string[] } = {}) => {
    const role = opts.role || 'super_admin';
    const permissions = opts.permissions || ['ai_tools'];
    const userId = 'usr-test-123';

    return {
      auth: {
        getUser: async (token: string) => {
          if (token === 'valid-staff-token') {
            return { data: { user: { id: userId, email: 'admin@iba.edu.pk' } }, error: null };
          }
          return { data: { user: null }, error: new Error('Invalid token') };
        },
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: userId, role, is_active: true, full_name: 'Test Admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'manager_permissions') {
          return {
            select: () => ({
              eq: (col: string, val: string) => ({
                eq: (col2: string, permKey: string) => ({
                  maybeSingle: async () => {
                    if (permissions.includes(permKey)) {
                      return { data: { id: 'p-1', permission_key: permKey }, error: null };
                    }
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: async () => ({ error: null }),
          };
        }
        return {
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        };
      },
    };
  };

  // ========================================================
  // SECTION 1: Public Chatbot API (/api/ai/chat)
  // ========================================================
  describe('1. Public Chatbot Endpoint (/api/ai/chat)', () => {
    test('1.1. Rejects unsupported methods with HTTP 405 and Allow header (GET is a diagnostics endpoint)', async () => {
      const res = createNodeResponseMock();
      await chatHandler({ method: 'PUT', body: {}, headers: {} }, res);
      assert.equal(res._getStatusCode(), 405);
      assert.equal(res._getHeaders()['allow'], 'GET, POST');
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.error, 'Method Not Allowed');
    });

    test('1.2. Rejects empty or missing message with HTTP 400', async () => {
      const res1 = createNodeResponseMock();
      await chatHandler({ method: 'POST', body: {}, headers: {} }, res1);
      assert.equal(res1._getStatusCode(), 400);
      assert.match(JSON.parse(res1._getBody()).error, /Message content is required/i);

      const res2 = createNodeResponseMock();
      await chatHandler({ method: 'POST', body: { message: '   ' }, headers: {} }, res2);
      assert.equal(res2._getStatusCode(), 400);
      assert.match(JSON.parse(res2._getBody()).error, /Message content is required/i);
    });

    test('1.3. Rejects message exceeding 1,000 characters limit with HTTP 400', async () => {
      const longMessage = 'A'.repeat(1001);
      const res = createNodeResponseMock();
      await chatHandler({ method: 'POST', body: { message: longMessage }, headers: {} }, res);
      assert.equal(res._getStatusCode(), 400);
      assert.match(JSON.parse(res._getBody()).error, /exceeds maximum length/i);
    });

    test('1.4. Valid request executes Workers AI inference via mock binding and passes third gateway argument', async () => {
      let receivedGatewayOptions: any = null;
      const mockAi = createMockAiBinding('Physical campus fee is Rs. 5,040 per month.', (_m, _i, opts) => {
        receivedGatewayOptions = opts;
      });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        body: { message: 'What is the physical package fee?' },
        headers: {},
        ai: mockAi,
      };

      await chatHandler(req, res);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.equal(json.reply, 'Physical campus fee is Rs. 5,040 per month.');
      assert.ok(json.correlationId, 'Must return correlation ID');
      assert.deepEqual(receivedGatewayOptions, { gateway: { id: 'default' } });
    });

    test('1.4b. Valid request respects custom CLOUDFLARE_AI_GATEWAY_ID and positive CLOUDFLARE_AI_CACHE_TTL', async () => {
      let receivedGatewayOptions: any = null;
      const mockAi = createMockAiBinding('Reply with gateway.', (_m, _i, opts) => {
        receivedGatewayOptions = opts;
      });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        body: { message: 'How long is the course?' },
        headers: {},
        ai: mockAi,
        env: {
          CLOUDFLARE_AI_GATEWAY_ID: 'custom-chat-gw-99',
          CLOUDFLARE_AI_CACHE_TTL: '600',
        },
      };

      await chatHandler(req, res);
      assert.equal(res._getStatusCode(), 200);
      assert.deepEqual(receivedGatewayOptions, {
        gateway: {
          id: 'custom-chat-gw-99',
          cacheTtl: 600,
        },
      });
    });

    test('1.4c. Invalid CLOUDFLARE_AI_GATEWAY_ID falls back to "default" without leaking gateway ID or secrets', async () => {
      let receivedGatewayOptions: any = null;
      const mockAi = createMockAiBinding('Safe fallback reply.', (_m, _i, opts) => {
        receivedGatewayOptions = opts;
      });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        body: { message: 'Test invalid gateway' },
        headers: {},
        ai: mockAi,
        env: {
          CLOUDFLARE_AI_GATEWAY_ID: '../../illegal-id-with-special!chars',
        },
      };

      await chatHandler(req, res);
      assert.equal(res._getStatusCode(), 200);
      assert.deepEqual(receivedGatewayOptions, {
        gateway: {
          id: 'default',
        },
      });
      const json = JSON.parse(res._getBody());
      assert.equal(JSON.stringify(json).includes('illegal-id'), false);
    });

    test('1.5. Unconfigured provider returns HTTP 200 with ok:false + friendlyReply (no red 500), never crashing', async () => {
      const res = createNodeResponseMock();
      const req = {
        method: 'POST',
        body: { message: 'Tell me about the courses' },
        headers: {},
        env: {}, // No AI binding, no credentials
      };

      await chatHandler(req, res);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.ok(typeof json.friendlyReply === 'string' && json.friendlyReply.length > 0);
      assert.ok(json.correlationId);
    });
  });

  // ========================================================
  // SECTION 2: Admin AI Services (/api/admin/ai/generate)
  // ========================================================
  describe('2. Admin AI Services (/api/admin/ai/generate)', () => {
    test('2.1. Unauthenticated requests without Bearer token are rejected with HTTP 401', async () => {
      const res = createNodeResponseMock();
      const db = createMockDbClient();
      await adminAiHandler({ method: 'POST', body: { action: 'draft_content' }, headers: {} }, res, db);
      assert.equal(res._getStatusCode(), 401);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Bearer authentication token is required/i);
    });

    test('2.2. Staff lacking the ai_tools permission are rejected with HTTP 403 Forbidden', async () => {
      // Manager WITHOUT 'ai_tools' permission
      const db = createMockDbClient({ role: 'manager', permissions: ['dashboard', 'students'] });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: { action: 'draft_content', payload: { topic: 'Testing' } },
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 403);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Forbidden.*ai_tools/i);
    });

    test('2.3. Super admin is authorized and can draft content via Workers AI', async () => {
      const db = createMockDbClient({ role: 'super_admin' });
      const mockAi = createMockAiBinding('Official Announcement: Admissions are now open for new batches.');
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'draft_content',
          payload: {
            contentType: 'announcement',
            topic: 'New Admissions',
            keyPoints: 'Physical batch B01 and G01 starting next month.',
          },
        },
        ai: mockAi,
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.equal(json.action, 'draft_content');
      assert.equal(json.resultText, 'Official Announcement: Admissions are now open for new batches.');
      assert.ok(json.correlationId);
    });

    test('2.4. Manager with explicit ai_tools permission is authorized', async () => {
      const db = createMockDbClient({ role: 'manager', permissions: ['ai_tools'] });
      const mockAi = createMockAiBinding('Refined text: Clear and professional.');
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'improve_text',
          payload: {
            originalText: 'rough text that needs polishing',
            goal: 'Fix grammar',
          },
        },
        ai: mockAi,
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.equal(json.action, 'improve_text');
      assert.equal(json.resultText, 'Refined text: Clear and professional.');
    });

    test('2.5. Rejects unsupported actions with HTTP 400', async () => {
      const db = createMockDbClient({ role: 'super_admin' });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'unauthorized_action_delete_data',
          payload: {},
        },
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Unsupported AI action/i);
    });

    test('2.6. Rejects payloads exceeding 3,000 characters limit with HTTP 400', async () => {
      const db = createMockDbClient({ role: 'super_admin' });
      const res = createNodeResponseMock();

      const hugePayload = { text: 'X'.repeat(3500) };
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'improve_text',
          payload: hugePayload,
        },
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Payload exceeds maximum length limit/i);
    });

    test('2.7. Admin AI passes third gateway argument to Workers AI binding with custom gateway ID and cache TTL', async () => {
      const db = createMockDbClient({ role: 'super_admin' });
      let receivedGatewayOptions: any = null;
      const mockAi = createMockAiBinding('Course outline response.', (_m, _i, opts) => {
        receivedGatewayOptions = opts;
      });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'draft_course_outline',
          payload: {
            courseTitle: 'Full Stack Development',
            targetAudience: 'Students',
            durationWeeks: 12,
            topics: 'React, Node, SQL',
          },
        },
        ai: mockAi,
        env: {
          CLOUDFLARE_AI_GATEWAY_ID: 'admin-curriculum-gw',
          CLOUDFLARE_AI_CACHE_TTL: '1800',
        },
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.deepEqual(receivedGatewayOptions, {
        gateway: {
          id: 'admin-curriculum-gw',
          cacheTtl: 1800,
        },
      });
      // Never return gateway ID or secrets to caller
      assert.equal(json.gatewayId, undefined);
      assert.equal(json.id, undefined);
    });

    test('2.8. Admin AI returns HTTP 503 safe response when Workers AI binding is missing', async () => {
      const db = createMockDbClient({ role: 'super_admin' });
      const res = createNodeResponseMock();

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-staff-token' },
        body: {
          action: 'draft_content',
          payload: {
            contentType: 'notice',
            topic: 'Holiday Notice',
          },
        },
        env: {}, // No ai binding, no REST credentials
      };

      await adminAiHandler(req, res, db);
      assert.equal(res._getStatusCode(), 503);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Workers AI is not configured/i);
      assert.ok(json.correlationId);
    });
  });

  // ========================================================
  // SECTION 3: Safe Logging & Synthetic Secrets Redaction
  // ========================================================
  describe('3. Safe Logging & Secrets Isolation', () => {
    test('3.1. Provider errors produce safe HTTP responses and redacts synthetic sentinel secrets from logs', async () => {
      const sentinelToken = 'SYNTHETIC_WORKERS_AI_KEY_SENTINEL_XYZ888';
      const originalConsoleError = console.error;
      const loggedLines: string[] = [];

      console.error = (...args: any[]) => {
        loggedLines.push(args.map((a) => String(a)).join(' '));
      };

      try {
        const failingAi = {
          run: async () => {
            throw new Error(`Inference engine crashed on server with token ${sentinelToken} at internal/cf.ts`);
          },
        };

        const res = createNodeResponseMock();
        const req = {
          method: 'POST',
          body: { message: 'Tell me about the courses' },
          headers: {
            authorization: `Bearer ${sentinelToken}`,
          },
          ai: failingAi,
        };

        await chatHandler(req, res);
        // Provider failures return HTTP 200 + ok:false + friendlyReply so the browser never shows a red 500
        assert.equal(res._getStatusCode(), 200);

        const json = JSON.parse(res._getBody());
        assert.equal(json.ok, false);
        assert.ok(typeof json.friendlyReply === 'string' && json.friendlyReply.length > 0);
        assert.ok(json.correlationId);

        // Client response must NEVER contain sentinel secret or internal paths
        const resText = JSON.stringify(json);
        assert.equal(resText.includes(sentinelToken), false, 'Response must not contain sentinel secret');
        assert.equal(resText.includes('internal/cf.ts'), false, 'Response must not contain internal paths');

        // Server logs must NEVER contain sentinel secret or internal paths
        const allLogs = loggedLines.join('\n');
        assert.equal(allLogs.includes(sentinelToken), false, 'Server logs must not contain sentinel secret');
        assert.equal(allLogs.includes('internal/cf.ts'), false, 'Server logs must not contain internal paths');
        assert.ok(allLogs.includes('Workers AI Error'));
      } finally {
        console.error = originalConsoleError;
      }
    });

    test('3.2. Workers AI binding is request-scoped on req.ai without mutating global state', async () => {
      const isolatedMockAi = createMockAiBinding('Isolated output');
      const req = {
        method: 'POST',
        ai: isolatedMockAi,
      };

      const result = await runWorkersAi(req, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result.ok, true);
      assert.equal(result.text, 'Isolated output');

      // Verify global state was NOT polluted
      assert.equal((globalThis as any).AI, undefined);
      assert.equal((globalThis as any).process?.env?.AI, undefined);
    });
  });

  // ========================================================
  // SECTION 4: Cloudflare Pages Functions Wrappers
  // ========================================================
  describe('4. Cloudflare Pages Functions Route Wrappers', () => {
    test('4.1. functions/api/ai/chat.ts wraps chat handler via adapter', async () => {
      const mockAi = createMockAiBinding('Cloudflare Pages Functions wrapper response');
      const req = new Request('https://theinspirebusinessacademy.pages.dev/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Campus location' }),
      });

      const response = await chatFunctionHandler({
        request: req,
        env: { AI: mockAi },
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'application/json');
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.reply, 'Cloudflare Pages Functions wrapper response');
    });

    test('4.2. functions/api/admin/ai/generate.ts rejects unauthenticated calls via Cloudflare wrapper', async () => {
      const req = new Request('https://theinspirebusinessacademy.pages.dev/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft_content' }),
      });

      const response = await adminAiFunctionHandler({
        request: req,
        env: {},
      });

      assert.equal(response.status, 401);
      const json = await response.json();
      assert.equal(json.ok, false);
      assert.match(json.error, /Bearer authentication token is required/i);
    });
  });
});
