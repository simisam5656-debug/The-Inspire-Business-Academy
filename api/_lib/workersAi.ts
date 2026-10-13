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
export function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/SYNTHETIC_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/(?:Bearer\s+|token\s+|key\s+|secret\s+|password\s+)[^\s,;]+/gi, (m) => m.split(/\s+/)[0] + ' [REDACTED]')
    .replace(/(?:[a-zA-Z]:)?[\\/][a-zA-Z0-9_.-]+(?:[\\/][a-zA-Z0-9_.-]+)*\.(?:ts|js|json)/gi, '[REDACTED_PATH]')
    .replace(/internal\/[a-zA-Z0-9_.-]+/gi, '[REDACTED_PATH]');
}

/**
 * Executes a completion request using the available Cloudflare Workers AI interface.
 * Implements Task B1 model fallback sequence and error logging.
 */
export async function runWorkersAi(
  req: any,
  messages: WorkersAiMessage[],
  options: WorkersAiOptions = {}
): Promise<WorkersAiResponse> {
  const correlationId = 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
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

  // Model sequence order (Task B1):
  // [env CLOUDFLARE_AI_MODEL if valid, '@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.2-3b-instruct']
  const envModel = getEnv(req, 'CLOUDFLARE_AI_MODEL');
  const candidateList = [
    options.model && isValidWorkersAiModel(options.model) ? options.model.trim() : null,
    envModel && isValidWorkersAiModel(envModel) ? envModel.trim() : null,
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.2-3b-instruct',
  ].filter((m): m is string => Boolean(m));

  // Deduplicate preserving order
  const modelsToTry = Array.from(new Set(candidateList));

  const payload = {
    messages: boundedMessages,
    max_tokens: maxTokens,
    temperature,
  };

  const aiBinding = req?.ai || req?.env?.AI;
  const accountId = getEnv(req, 'CLOUDFLARE_ACCOUNT_ID');
  const apiToken = getEnv(req, 'CLOUDFLARE_API_TOKEN');
  const hasConfig = Boolean((aiBinding && typeof aiBinding.run === 'function') || (accountId && apiToken));

  if (!hasConfig) {
    return {
      ok: false,
      error: 'Cloudflare Workers AI is not configured. Please bind Workers AI in the Cloudflare Pages dashboard or provide server credentials.',
      configured: false,
      correlationId,
    };
  }

  let lastErrorReason: string | undefined = undefined;

  for (const currentModel of modelsToTry) {
    // Approach A: Cloudflare Workers AI Native Binding
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

      let result: any = null;
      let modelThrew = false;

      try {
        result = await aiBinding.run(currentModel, payload, { gateway: gatewayConfig });
      } catch (gatewayErr: any) {
        // Retry without gateway
        try {
          result = await aiBinding.run(currentModel, payload);
        } catch (directErr: any) {
          modelThrew = true;
          const err = directErr || gatewayErr;
          const errName = err?.name || 'Error';
          const rawMsg = typeof err?.message === 'string' ? err.message : String(err || '');
          const truncatedMsg = rawMsg.replace(/[\r\n]+/g, ' ').slice(0, 200);
          const sanitizedMsg = sanitizeErrorMessage(truncatedMsg);
          console.error(
            `[Workers AI Error] model=${currentModel} err.name=${errName} err.message=${sanitizedMsg}`
          );
          lastErrorReason = truncatedMsg;
        }
      }

      if (!modelThrew && result) {
        const text = extractTextFromAiResult(result);
        if (text) {
          return {
            ok: true,
            text,
            correlationId,
            modelUsed: currentModel,
            configured: true,
          };
        } else {
          console.error(
            `[Workers AI Error] model=${currentModel} err.name=EmptyResponseError err.message=Model returned an empty response`
          );
          lastErrorReason = 'Model returned empty response';
        }
      }
    } else if (accountId && apiToken && isValidCloudflareAccountId(accountId)) {
      // Approach B: REST API Fallback
      try {
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${currentModel}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errStatus = response.status;
          console.error(
            `[Workers AI REST Error] model=${currentModel} err.name=HttpError err.message=HTTP status ${errStatus}`
          );
          lastErrorReason = `REST HTTP status ${errStatus}`;
          continue;
        }

        const json: any = await response.json();
        const text = extractTextFromAiResult(json?.result || json);
        if (text) {
          return {
            ok: true,
            text,
            correlationId,
            modelUsed: currentModel,
            configured: true,
          };
        } else {
          console.error(
            `[Workers AI REST Error] model=${currentModel} err.name=EmptyResponseError err.message=REST returned empty response`
          );
          lastErrorReason = 'REST returned empty response';
        }
      } catch (restErr: any) {
        const errName = restErr?.name || 'FetchError';
        const rawMsg = typeof restErr?.message === 'string' ? restErr.message : String(restErr || '');
        const truncatedMsg = rawMsg.replace(/[\r\n]+/g, ' ').slice(0, 200);
        const sanitizedMsg = sanitizeErrorMessage(truncatedMsg);
        console.error(
          `[Workers AI REST Error] model=${currentModel} err.name=${errName} err.message=${sanitizedMsg}`
        );
        lastErrorReason = truncatedMsg;
      }
    }
  }

  // All models failed or returned empty
  const isDebug = getEnv(req, 'AI_DEBUG') === 'true';
  const finalResponse: WorkersAiResponse = {
    ok: false,
    error: 'All Workers AI models failed or returned empty responses.',
    correlationId,
    configured: true,
  };
  if (isDebug && lastErrorReason) {
    finalResponse.reason = lastErrorReason;
  }
  return finalResponse;
}

/**
 * Safely extracts textual answer from diverse Workers AI response payloads.
 * Supports: result.response, result.result.response, result.choices[0].message.content,
 * result.output_text, result.text, result.output, and array variants.
 */
export function extractTextFromAiResult(result: any): string {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  if (typeof result.response === 'string' && result.response.trim()) return result.response.trim();
  if (result.result && typeof result.result.response === 'string' && result.result.response.trim()) {
    return result.result.response.trim();
  }
  if (Array.isArray(result.choices) && result.choices[0]?.message?.content) {
    const content = result.choices[0].message.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
  }
  if (typeof result.output_text === 'string' && result.output_text.trim()) return result.output_text.trim();
  if (typeof result.text === 'string' && result.text.trim()) return result.text.trim();
  if (typeof result.output === 'string' && result.output.trim()) return result.output.trim();
  if (Array.isArray(result) && result.length > 0) {
    for (const item of result) {
      const extracted = extractTextFromAiResult(item);
      if (extracted) return extracted;
    }
  }
  if (typeof result.result === 'object' && result.result !== null) {
    const extracted = extractTextFromAiResult(result.result);
    if (extracted) return extracted;
  }
  return '';
}
