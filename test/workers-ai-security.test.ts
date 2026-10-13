import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import chatHandler, {
  checkChatRateLimit,
  resetChatRateLimiter,
  getChatRateLimiterSize,
  getTrustedClientIp,
  sanitizeClientIp,
  MAX_REQUESTS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS,
} from '../api/ai/chat';

import {
  runWorkersAi,
  isValidWorkersAiModel,
  isValidCloudflareAccountId,
  isValidCloudflareAiGatewayId,
  CF_AI_GATEWAY_ID_REGEX,
  DEFAULT_WORKERS_AI_MODEL,
} from '../api/_lib/workersAi';

import { handleCloudflareRequest, createNodeResponseMock } from '../functions/_adapter';

describe('Workers AI Security, Rate Limiting & Adapter Isolation Tests', () => {

  // =========================================================================
  // TASK A: Request-Scoped Environment and Adapter Safety
  // =========================================================================
  describe('Task A: Request-Scoped Environment and Adapter Safety', () => {
    test('A.1. Two simulated requests with distinct environment values and distinct AI bindings remain strictly isolated', async () => {
      let req1ObservedEnv = '';
      let req1ObservedAi = '';
      let req2ObservedEnv = '';
      let req2ObservedAi = '';

      const mockAi1 = {
        run: async () => ({ response: 'ai-output-request-1' }),
      };
      const mockAi2 = {
        run: async () => ({ response: 'ai-output-request-2' }),
      };

      const handler1 = async (req: any, res: any) => {
        req1ObservedEnv = req.env?.SECRET_TENANT_KEY;
        const aiRes = await req.ai.run();
        req1ObservedAi = aiRes.response;
        return res.status(200).json({ ok: true });
      };

      const handler2 = async (req: any, res: any) => {
        req2ObservedEnv = req.env?.SECRET_TENANT_KEY;
        const aiRes = await req.ai.run();
        req2ObservedAi = aiRes.response;
        return res.status(200).json({ ok: true });
      };

      const cfContext1 = {
        request: new Request('https://theinspirebusinessacademy.pages.dev/api/req1'),
        env: { SECRET_TENANT_KEY: 'tenant-alpha-secret-111', AI: mockAi1 },
      };

      const cfContext2 = {
        request: new Request('https://theinspirebusinessacademy.pages.dev/api/req2'),
        env: { SECRET_TENANT_KEY: 'tenant-beta-secret-222', AI: mockAi2 },
      };

      // Execute both requests concurrently
      await Promise.all([
        handleCloudflareRequest(cfContext1, handler1),
        handleCloudflareRequest(cfContext2, handler2),
      ]);

      // Request 1 observed only its own environment and AI
      assert.equal(req1ObservedEnv, 'tenant-alpha-secret-111');
      assert.equal(req1ObservedAi, 'ai-output-request-1');

      // Request 2 observed only its own environment and AI
      assert.equal(req2ObservedEnv, 'tenant-beta-secret-222');
      assert.equal(req2ObservedAi, 'ai-output-request-2');

      // Neither leaked into global process.env
      assert.notEqual((globalThis as any).process?.env?.SECRET_TENANT_KEY, 'tenant-alpha-secret-111');
      assert.notEqual((globalThis as any).process?.env?.SECRET_TENANT_KEY, 'tenant-beta-secret-222');
    });

    test('A.2. Adapter failures return safe 500 responses with correlation ID, never leaking stack trace', async () => {
      const crashingHandler = async () => {
        throw new Error('Fatal database connection string postgresql://user:super_secret_password@db.internal:5432/iba crashed');
      };

      const cfContext = {
        request: new Request('https://theinspirebusinessacademy.pages.dev/api/crash-test'),
        env: {},
      };

      const response = await handleCloudflareRequest(cfContext, crashingHandler);
      assert.equal(response.status, 500);

      const json = await response.json();
      assert.equal(json.ok, false);
      assert.equal(json.error, 'Internal server error in Cloudflare function adapter.');
      assert.ok(json.correlationId, 'Must return a sanitized correlation ID');

      // Must NEVER contain the secret password or internal database path
      const bodyText = JSON.stringify(json);
      assert.equal(bodyText.includes('super_secret_password'), false);
      assert.equal(bodyText.includes('postgresql://'), false);
    });
  });

  // =========================================================================
  // TASK B: Public Chatbot Rate Limiting & Trusted IP
  // =========================================================================
  describe('Task B: Public Chatbot Rate Limiting & Trusted IP', () => {
    test('B.1. Threshold enforcement: exactly 20 requests allowed per minute, 21st rejected with HTTP 429', async () => {
      resetChatRateLimiter();
      const testIp = '203.0.113.45';

      // First 20 requests must pass
      for (let i = 1; i <= MAX_REQUESTS_PER_MINUTE; i++) {
        const check = checkChatRateLimit(testIp);
        assert.equal(check.allowed, true, `Request ${i} should be allowed`);
      }

      // 21st request in same minute must be rejected
      const check21 = checkChatRateLimit(testIp);
      assert.equal(check21.allowed, false, 'Request 21 must be rejected by rate limiter');
      assert.equal(check21.remaining, 0);

      // Verify endpoint returns HTTP 429
      const res = createNodeResponseMock();
      const req = {
        method: 'POST',
        headers: { 'cf-connecting-ip': testIp },
        body: { message: 'Hello' },
      };
      await chatHandler(req, res);
      assert.equal(res._getStatusCode(), 429);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Too many requests/i);
    });

    test('B.2. Expiration and Cleanup: Timestamps after 60s expire and allow new requests', () => {
      resetChatRateLimiter();
      const testIp = '198.51.100.88';
      const baseTime = 1000000;

      // Fill quota at baseTime
      for (let i = 0; i < MAX_REQUESTS_PER_MINUTE; i++) {
        checkChatRateLimit(testIp, baseTime);
      }

      // At baseTime + 10s: still blocked
      const blockedCheck = checkChatRateLimit(testIp, baseTime + 10000);
      assert.equal(blockedCheck.allowed, false);

      // At baseTime + 61s: previous timestamps expired, request allowed
      const allowedCheck = checkChatRateLimit(testIp, baseTime + RATE_LIMIT_WINDOW_MS + 1000);
      assert.equal(allowedCheck.allowed, true);
    });

    test('B.3. Client IP extraction: cf-connecting-ip takes precedence over spoofed x-forwarded-for', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '198.51.100.12',
          'x-forwarded-for': '203.0.113.99, 10.0.0.1', // Attacker trying to spoof IP
        },
      };

      const extractedIp = getTrustedClientIp(req);
      assert.equal(extractedIp, '198.51.100.12', 'Must trust authoritative cf-connecting-ip over x-forwarded-for');
    });

    test('B.4. Malformed or missing IP is safely sanitized without crashing', () => {
      assert.equal(sanitizeClientIp(undefined), 'anonymous-client');
      assert.equal(sanitizeClientIp(''), 'sanitized-unknown-client');
      assert.equal(sanitizeClientIp('invalid_chars_drop_tables'), 'sanitized-unknown-client');
      assert.equal(sanitizeClientIp('192.168.1.1:8080'), '192.168.1.1'); // Strips port
      assert.equal(sanitizeClientIp('2001:db8::1'), '2001:db8::1'); // Valid IPv6
    });

    test('B.5. Memory ceiling eviction: Map does not grow unboundedly', () => {
      resetChatRateLimiter();
      const baseTime = Date.now();

      // Simulate tracking many different IPs
      for (let i = 0; i < 1100; i++) {
        checkChatRateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`, baseTime);
      }

      const size = getChatRateLimiterSize();
      assert.ok(size <= 1050, `Rate limiter size (${size}) must be bounded to prevent isolate memory leaks`);
    });
  });

  // =========================================================================
  // TASK C: Workers AI Configuration & REST Fallback
  // =========================================================================
  describe('Task C: Workers AI Model Validation and REST Fallback', () => {
    test('C.1. Validates model identifier against strict Cloudflare Workers AI regex format', () => {
      // Valid models
      assert.equal(isValidWorkersAiModel('@cf/meta/llama-3.1-8b-instruct'), true);
      assert.equal(isValidWorkersAiModel('@cf/mistral/mistral-7b-instruct-v0.1'), true);
      assert.equal(isValidWorkersAiModel('@cf/qwen/qwen1.5-7b-chat-awq'), true);
      assert.equal(isValidWorkersAiModel('@hf/thebloke/deepseek-coder-6.7b-instruct-awq'), true);

      // Malicious or invalid model names
      assert.equal(isValidWorkersAiModel('../../malicious/path'), false);
      assert.equal(isValidWorkersAiModel('@cf/meta/llama?query=injection'), false);
      assert.equal(isValidWorkersAiModel('@cf/meta/llama#hash'), false);
      assert.equal(isValidWorkersAiModel('@cf/meta/llama with spaces'), false);
      assert.equal(isValidWorkersAiModel('plain-name-without-prefix'), false);
      assert.equal(isValidWorkersAiModel(''), false);
      assert.equal(isValidWorkersAiModel(null), false);
    });

    test('C.2. Rejects invalid model format with safe error response', async () => {
      const mockReq = {
        ai: { run: async () => ({ response: 'ok' }) },
      };

      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'hello' }], {
        model: '../../invalid/path/traversal',
      });

      assert.equal(result.ok, false);
      assert.equal(result.error, 'Invalid Workers AI model identifier format.');
      assert.ok(result.correlationId);
    });

    test('C.3. Successful native-binding inference returns clean text response and passes third gateway argument defaulting to "default"', async () => {
      let receivedOptions: any = null;
      const mockAi = {
        run: async (model: string, input: any, options?: any) => {
          assert.equal(model, DEFAULT_WORKERS_AI_MODEL);
          assert.ok(Array.isArray(input.messages));
          receivedOptions = options;
          return { response: 'The Inspire Business Academy is in Sadiqabad.' };
        },
      };

      const mockReq = { ai: mockAi };
      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Where is the academy?' }]);

      assert.equal(result.ok, true);
      assert.equal(result.text, 'The Inspire Business Academy is in Sadiqabad.');
      assert.equal(result.configured, true);
      assert.ok(result.correlationId);
      assert.deepEqual(receivedOptions, { gateway: { id: 'default' } });
    });

    test('C.3b. Validates CLOUDFLARE_AI_GATEWAY_ID and passes custom gateway ID and positive cache TTL in third argument', async () => {
      let receivedOptions: any = null;
      const mockAi = {
        run: async (_model: string, _input: any, options?: any) => {
          receivedOptions = options;
          return { response: 'Gateway response.' };
        },
      };

      // Valid custom gateway ID and positive integer cache TTL
      const mockReq = {
        ai: mockAi,
        env: {
          CLOUDFLARE_AI_GATEWAY_ID: 'iba-production-gateway_01',
          CLOUDFLARE_AI_CACHE_TTL: '3600',
        },
      };

      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result.ok, true);
      assert.deepEqual(receivedOptions, {
        gateway: {
          id: 'iba-production-gateway_01',
          cacheTtl: 3600,
        },
      });
    });

    test('C.3c. Invalid gateway ID formats strictly fall back to "default", and non-positive cache TTL is omitted', async () => {
      // Validate gateway ID validator directly
      assert.equal(isValidCloudflareAiGatewayId('default'), true);
      assert.equal(isValidCloudflareAiGatewayId('my_gateway-123'), true);
      assert.equal(isValidCloudflareAiGatewayId(''), false);
      assert.equal(isValidCloudflareAiGatewayId('../../malicious/path'), false);
      assert.equal(isValidCloudflareAiGatewayId('has spaces in id'), false);
      assert.equal(isValidCloudflareAiGatewayId('special$character#id'), false);
      assert.equal(isValidCloudflareAiGatewayId('a'.repeat(65)), false, 'Max length 64 chars');
      assert.equal(isValidCloudflareAiGatewayId('a'.repeat(64)), true);

      let receivedOptions: any = null;
      const mockAi = {
        run: async (_model: string, _input: any, options?: any) => {
          receivedOptions = options;
          return { response: 'Fallback gateway response.' };
        },
      };

      // Invalid gateway ID format and negative cache TTL
      const mockReq = {
        ai: mockAi,
        env: {
          CLOUDFLARE_AI_GATEWAY_ID: '../../traversal-attempt',
          CLOUDFLARE_AI_CACHE_TTL: '-10',
        },
      };

      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result.ok, true);
      // Fallback to 'default' and omit cacheTtl
      assert.deepEqual(receivedOptions, {
        gateway: {
          id: 'default',
        },
      });
    });

    test('C.4a. Gateway failure then direct success: retries once without gateway and succeeds', async () => {
      const calls: any[] = [];
      const mockAi = {
        run: async (model: string, input: any, options?: any) => {
          calls.push({ model, input, options });
          if (calls.length === 1) {
            // First call has gateway option, simulate gateway failure
            assert.ok(options?.gateway, 'First call must pass gateway options');
            throw new Error('Cloudflare AI Gateway 502 Bad Gateway');
          }
          // Second retry call has NO third argument
          assert.equal(options, undefined, 'Retry call must have no third argument');
          return { response: 'Direct inference response after retry.' };
        },
      };

      const mockReq = { ai: mockAi };
      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Explain quantum computing' }]);

      assert.equal(calls.length, 2, 'Must have attempted initial call and one retry');
      assert.equal(result.ok, true);
      assert.equal(result.text, 'Direct inference response after retry.');
      assert.ok(result.correlationId);
    });

    test('C.4b. Both failing returns generic error without leaking message when AI_DEBUG is not true', async () => {
      let loggedError = '';
      const origConsoleError = console.error;
      console.error = (...args: any[]) => {
        loggedError += args.join(' ');
      };

      try {
        const secretMessage = 'Secret GPU error with connection token secret_key_12345';
        const mockAi = {
          run: async () => {
            throw new Error(secretMessage);
          },
        };

        const mockReq = {
          ai: mockAi,
          env: { AI_DEBUG: 'false' },
        };
        const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Secret prompt content' }]);

        assert.equal(result.ok, false);
        assert.equal(result.error, 'Workers AI inference failed.');
        assert.equal(result.reason, undefined, 'Reason must not be exposed when AI_DEBUG is not true');
        assert.ok(result.correlationId);

        // Verify logged error is sanitized one-line error containing correlationId, model, err.name, and err.message truncated
        assert.ok(loggedError.includes(result.correlationId), 'Must log correlationId');
        assert.ok(loggedError.includes('@cf/meta/llama-3.1-8b-instruct'), 'Must log model');
        assert.ok(loggedError.includes('Error'), 'Must log err.name');
        assert.ok(!loggedError.includes('Secret prompt content'), 'Never log user prompt');
      } finally {
        console.error = origConsoleError;
      }
    });

    test('C.4c. Reason present in returned error object when AI_DEBUG is true', async () => {
      const mockAi = {
        run: async () => {
          throw new Error('Internal GPU buffer timeout on node-cf-01');
        },
      };

      const mockReq = {
        ai: mockAi,
        env: { AI_DEBUG: 'true' },
      };
      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello' }]);

      assert.equal(result.ok, false);
      assert.equal(result.error, 'Workers AI inference failed.');
      assert.equal(result.reason, 'Internal GPU buffer timeout on node-cf-01');
      assert.ok(result.correlationId);
    });

    test('C.5. Missing binding / unconfigured provider triggers missing-binding error path with configured: false', async () => {
      // 1. Empty env / no binding
      const mockReq1 = { env: {} };
      const result1 = await runWorkersAi(mockReq1, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result1.ok, false);
      assert.equal(result1.configured, false);
      assert.match(result1.error || '', /Workers AI is not configured/i);
      assert.ok(result1.correlationId);

      // 2. Malformed binding (ai is an object but lacks run function)
      const mockReq2 = { ai: { notRun: 'invalid' } };
      const result2 = await runWorkersAi(mockReq2, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result2.ok, false);
      assert.equal(result2.configured, false);
      assert.match(result2.error || '', /Workers AI is not configured/i);
      assert.ok(result2.correlationId);

      // 3. Null binding
      const mockReq3 = { ai: null, env: { AI: null } };
      const result3 = await runWorkersAi(mockReq3, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result3.ok, false);
      assert.equal(result3.configured, false);
      assert.match(result3.error || '', /Workers AI is not configured/i);
      assert.ok(result3.correlationId);
    });

    test('C.6. REST fallback succeeds when valid account ID, token, and model are configured', async () => {
      const origFetch = globalThis.fetch;
      try {
        let requestedUrl = '';
        let authHeader = '';

        globalThis.fetch = async (url: any, init: any) => {
          requestedUrl = String(url);
          authHeader = init?.headers?.Authorization || '';
          return new Response(JSON.stringify({
            success: true,
            result: { response: 'REST API fallback answered successfully.' },
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        };

        const mockReq = {
          env: {
            CLOUDFLARE_ACCOUNT_ID: 'a1b2c3d4e5f678901234567890abcdef',
            CLOUDFLARE_API_TOKEN: 'valid_cf_api_token_xyz',
          },
        };

        const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello via REST' }]);

        assert.equal(result.ok, true);
        assert.equal(result.text, 'REST API fallback answered successfully.');
        assert.equal(result.configured, true);

        // Verify URL format: https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}
        assert.ok(requestedUrl.includes('/accounts/a1b2c3d4e5f678901234567890abcdef/ai/run/'));
        assert.equal(authHeader, 'Bearer valid_cf_api_token_xyz');
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    test('C.7. REST fallback non-success HTTP status returns safe error without leaking API token', async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          return new Response(JSON.stringify({
            success: false,
            errors: [{ code: 1000, message: 'Authentication error for token: valid_cf_api_token_xyz' }],
          }), { status: 403, headers: { 'content-type': 'application/json' } });
        };

        const mockReq = {
          env: {
            CLOUDFLARE_ACCOUNT_ID: 'a1b2c3d4e5f678901234567890abcdef',
            CLOUDFLARE_API_TOKEN: 'valid_cf_api_token_xyz',
          },
        };

        const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello via REST' }]);

        assert.equal(result.ok, false);
        assert.equal(result.error, 'Cloudflare Workers AI gateway returned an error.');
        assert.ok(result.correlationId);

        // Result object must NEVER leak the token
        assert.equal(JSON.stringify(result).includes('valid_cf_api_token_xyz'), false);
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    test('C.8. Invalid account ID format is rejected before making any network request', async () => {
      assert.equal(isValidCloudflareAccountId('invalid account id with spaces'), false);
      assert.equal(isValidCloudflareAccountId('../../bad_account'), false);
      assert.equal(isValidCloudflareAccountId('a1b2c3d4e5f678901234567890abcdef'), true);

      const mockReq = {
        env: {
          CLOUDFLARE_ACCOUNT_ID: '../../malicious_account_traversal',
          CLOUDFLARE_API_TOKEN: 'token',
        },
      };

      const result = await runWorkersAi(mockReq, [{ role: 'user', content: 'Hello' }]);
      assert.equal(result.ok, false);
      assert.match(result.error || '', /Invalid Cloudflare account ID format/i);
    });
  });
});
