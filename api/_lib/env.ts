/**
 * Request-Scoped Environment Helper
 *
 * Safely accesses configuration and secrets for a specific request without
 * mutating globalThis.process.env or relying on shared singleton state.
 *
 * Order of Precedence:
 * 1. req.env[key] (Cloudflare runtime context bindings or explicit request bindings)
 * 2. process.env[key] (Read-only fallback for Node.js test runner / local dev server)
 */

export function getEnv(req: any, key: string): string | undefined {
  if (req?.env && typeof req.env[key] === 'string' && req.env[key].length > 0) {
    return req.env[key];
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string' && process.env[key].length > 0) {
    return process.env[key];
  }
  return undefined;
}

export function getRequiredEnv(req: any, key: string): string {
  const val = getEnv(req, key);
  if (!val) {
    throw new Error(`Environment variable "${key}" is not configured for this request.`);
  }
  return val;
}
