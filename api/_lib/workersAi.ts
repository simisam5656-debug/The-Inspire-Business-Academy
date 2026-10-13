/**
 * Reusable Cloudflare Workers AI Inference Service Layer
 *
 * Supports:
 * 1. Cloudflare Workers AI Native Binding (req.ai or context.env.AI) in Cloudflare Pages Functions
 * 2. Official Cloudflare Workers AI REST API Fallback (using server-only CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN)
 *
 * Security:
 * - Request-scoped execution (never mutates global state)
 * - Input & token length bounded
 * - Sanitized error logging with correlation IDs
 * - Zero secret leakage to clients or routine logs
 */

import { getEnv } from './env';

export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const MAX_INPUT_CHARS = 4000;
export const MAX_OUTPUT_TOKENS = 1024;

/**
 * Strict Cloudflare Workers AI model identifier validation.
 * Expected format: @cf/{provider}/{model-name} or @hf/{provider}/{model-name}
 * Strict boundaries prevent directory traversal, path injection, or unexpected URL modifications.
 */
const WORKERS_AI_MODEL_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/;
const CF_ACCOUNT_ID_REGEX = /^[a-zA-Z0-9_-]{16,64}$/;
export const CF_AI_GATEWAY_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidWorkersAiModel(model: unknown): model is string {
  if (typeof model !== 'string') return false;
  const trimmed = model.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return false;
  if (trimmed.includes('..') || trimmed.includes('//') || trimmed.includes('?') || trimmed.includes('#') || trimmed.includes('\\') || trimmed.includes(':') || /\s/.test(trimmed)) {
    return false;
  }
  return WORKERS_AI_MODEL_REGEX.test(trimmed);
}

export function isValidCloudflareAccountId(accountId: unknown): accountId is string {
  if (typeof accountId !== 'string') return false;
  const trimmed = accountId.trim();
  return CF_ACCOUNT_ID_REGEX.test(trimmed);
}

export function isValidCloudflareAiGatewayId(gatewayId: unknown): gatewayId is string {
  if (typeof gatewayId !== 'string') return false;
  const trimmed = gatewayId.trim();
  return CF_AI_GATEWAY_ID_REGEX.test(trimmed);
}

export interface WorkersAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WorkersAiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface WorkersAiResponse {
  ok: boolean;
  text?: string;
  error?: string;
  reason?: string;
  correlationId?: string;
  modelUsed?: string;
  configured?: boolean;
}

/**
 * Executes a completion request using the available Cloudflare Workers AI interface.
 */
export async function runWorkersAi(
  req: any,
  messages: WorkersAiMessage[],
  options: WorkersAiOptions = {}
): Promise<WorkersAiResponse> {
  const correlationId = 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const rawModel = options.model || getEnv(req, 'CLOUDFLARE_AI_MODEL') || DEFAULT_WORKERS_AI_MODEL;
  if (!isValidWorkersAiModel(rawModel)) {
    return {
      ok: false,
      error: 'Invalid Workers AI model identifier format.',
      correlationId,
    };
  }
  const model = rawModel;
  const maxTokens = Math.min(options.maxTokens || 512, MAX_OUTPUT_TOKENS);
  const temperature = options.temperature ?? 0.6;

  // 1. Sanitize & validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ok: false,
      error: 'Invalid request: messages array cannot be empty.',
      correlationId,
    };
  }

  const boundedMessages: WorkersAiMessage[] = [];
  for (const msg of messages) {
    if (!msg || typeof msg.content !== 'string') continue;
    const content = msg.content.trim().slice(0, MAX_INPUT_CHARS);
    if (!content) continue;
    boundedMessages.push({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  if (boundedMessages.length === 0) {
    return {
      ok: false,
      error: 'No valid message content provided.',
      correlationId,
    };
  }

  // 2. Approach A: Cloudflare Workers AI Native Binding (env.AI)
  const aiBinding = req?.ai || req?.env?.AI;
  if (aiBinding && typeof aiBinding.run === 'function') {
    const rawGatewayId = getEnv(req, 'CLOUDFLARE_AI_GATEWAY_ID');
    const gatewayId =
      rawGatewayId && isValidCloudflareAiGatewayId(rawGatewayId)
        ? rawGatewayId.trim()
        : 'default';

    const gatewayConfig: { id: string; cacheTtl?: number } = { id: gatewayId };
    const rawCacheTtl = getEnv(req, 'CLOUDFLARE_AI_CACHE_TTL');
    if (rawCacheTtl) {
      const parsedTtl = Number(rawCacheTtl);
      if (Number.isInteger(parsedTtl) && parsedTtl > 0) {
        gatewayConfig.cacheTtl = parsedTtl;
      }
    }

    const payload = {
      messages: boundedMessages,
      max_tokens: maxTokens,
      temperature,
    };

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/SYNTHETIC_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/(?:Bearer\s+|token\s+|key\s+|secret\s+|password\s+)[^\s,;]+/gi, (m) => m.split(/\s+/)[0] + ' [REDACTED]')
    .replace(/(?:[a-zA-Z]:)?[\\/][a-zA-Z0-9_.-]+(?:[\\/][a-zA-Z0-9_.-]+)*\.(?:ts|js|json)/gi, '[REDACTED_PATH]')
    .replace(/internal\/[a-zA-Z0-9_.-]+/gi, '[REDACTED_PATH]');
}

    let result: any;
    try {
      result = await aiBinding.run(model, payload, { gateway: gatewayConfig });
    } catch (gatewayErr: any) {
      // If the call with the gateway option fails, retry ONCE with the same payload and NO third argument (direct Workers AI)
      try {
        result = await aiBinding.run(model, payload);
      } catch (directErr: any) {
        // Only if both fail return the generic error
        const err = directErr || gatewayErr;
        const errName = err?.name || 'Error';
        const rawMsg = typeof err?.message === 'string' ? err.message : String(err || '');
        const truncatedMsg = rawMsg.replace(/[\r\n]+/g, ' ').slice(0, 200);
        const sanitizedMsg = sanitizeErrorMessage(truncatedMsg);

        console.error(
          `[Workers AI Error] correlationId=${correlationId} model=${model} err.name=${errName} err.message=${sanitizedMsg}`
        );

        const isDebug = getEnv(req, 'AI_DEBUG') === 'true';
        const errResponse: WorkersAiResponse = {
          ok: false,
          error: 'Workers AI inference failed.',
          correlationId,
        };
        if (isDebug) {
          errResponse.reason = truncatedMsg;
        }
        return errResponse;
      }
    }

    const text = extractTextFromAiResult(result);
    if (!text) {
      return {
        ok: false,
        error: 'Model returned an empty response.',
        correlationId,
      };
    }

    return {
      ok: true,
      text,
      correlationId,
      modelUsed: model,
      configured: true,
    };
  }

  // 3. Approach B: Official Cloudflare Workers AI REST API Fallback
  const accountId = getEnv(req, 'CLOUDFLARE_ACCOUNT_ID');
  const apiToken = getEnv(req, 'CLOUDFLARE_API_TOKEN');

  if (accountId && apiToken) {
    if (!isValidCloudflareAccountId(accountId)) {
      return {
        ok: false,
        error: 'Invalid Cloudflare account ID format for Workers AI REST API.',
        correlationId,
      };
    }

    try {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: boundedMessages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        console.error(`[Workers AI REST Error] id=${correlationId} status=${response.status}`);
        return {
          ok: false,
          error: 'Cloudflare Workers AI gateway returned an error.',
          correlationId,
        };
      }

      const json: any = await response.json();
      const text = extractTextFromAiResult(json?.result || json);
      if (!text) {
        return {
          ok: false,
          error: 'Model returned an empty response.',
          correlationId,
        };
      }

      return {
        ok: true,
        text,
        correlationId,
        modelUsed: model,
        configured: true,
      };
    } catch (err: any) {
      console.error(`[Workers AI REST Fetch Error] id=${correlationId} type=${err?.name || 'FetchError'}`);
      return {
        ok: false,
        error: 'Unable to communicate with Cloudflare Workers AI service.',
        correlationId,
      };
    }
  }

  // 4. Neither binding nor credentials configured
  return {
    ok: false,
    error: 'Cloudflare Workers AI is not configured. Please bind Workers AI in the Cloudflare Pages dashboard or provide server credentials.',
    configured: false,
    correlationId,
  };
}

/**
 * Safely extracts textual answer from diverse Workers AI response payloads.
 */
function extractTextFromAiResult(result: any): string {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  if (typeof result.response === 'string') return result.response.trim();
  if (typeof result.text === 'string') return result.text.trim();
  if (Array.isArray(result) && result[0]?.response) return String(result[0].response).trim();
  if (typeof result.output === 'string') return result.output.trim();
  return '';
}
