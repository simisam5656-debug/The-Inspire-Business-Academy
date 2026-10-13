/**
 * Cloudflare Pages Functions Adapter for The Inspire Business Academy.
 *
 * Bridges Cloudflare's standard Web API Request/Response model to existing
 * Node-style (req, res, dbClient) API route handlers.
 *
 * Preserves all server-side access controls, manager permissions, authoritative
 * pricing, certificate verification, and secret protections without code duplication.
 */

/**
 * Creates a high-fidelity Node-compatible Response mock.
 * Supports chaining (.status().json(), .setHeader().status().send(), .status().end()),
 * case-insensitive header management, and standard response serialization.
 */
export function createNodeResponseMock() {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let responseEnded = false;
  let bodyData: any = null;

  const res: any = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(val: number) {
      statusCode = val;
    },
    get headersSent() {
      return responseEnded;
    },

    setHeader(key: string, val: string | number) {
      if (typeof key === 'string') {
        headers[key.toLowerCase()] = String(val);
      }
      return res;
    },

    getHeader(key: string) {
      if (typeof key === 'string') {
        return headers[key.toLowerCase()];
      }
      return undefined;
    },

    getHeaders() {
      return { ...headers };
    },

    hasHeader(key: string) {
      return typeof key === 'string' && key.toLowerCase() in headers;
    },

    removeHeader(key: string) {
      if (typeof key === 'string') {
        delete headers[key.toLowerCase()];
      }
      return res;
    },

    writeHead(code: number, newHeaders?: Record<string, string>) {
      statusCode = code;
      if (newHeaders && typeof newHeaders === 'object') {
        for (const [k, v] of Object.entries(newHeaders)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
      return res;
    },

    status(code: number) {
      statusCode = code;
      return res;
    },

    json(data: any) {
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
      }
      bodyData = JSON.stringify(data);
      responseEnded = true;
      return res;
    },

    send(data: any) {
      if (data !== null && typeof data === 'object') {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
        bodyData = JSON.stringify(data);
      } else {
        bodyData = String(data ?? '');
      }
      responseEnded = true;
      return res;
    },

    end(data?: any) {
      if (data !== undefined && data !== null) {
        if (typeof data === 'object') {
          if (!headers['content-type']) {
            headers['content-type'] = 'application/json';
          }
          bodyData = JSON.stringify(data);
        } else {
          bodyData = String(data);
        }
      }
      responseEnded = true;
      return res;
    },

    write(chunk: any) {
      if (bodyData === null) {
        bodyData = '';
      }
      bodyData += typeof chunk === 'string' ? chunk : String(chunk);
      return res;
    },

    // Adapter internal inspection helpers
    _getStatusCode: () => statusCode,
    _getHeaders: () => ({ ...headers }),
    _getBody: () => bodyData,
    _isEnded: () => responseEnded,
  };

  return res;
}

/**
 * Adapts a standard Cloudflare Pages Function context to an existing
 * Node-style (req, res, dbClient) handler, returning a standard Web Response.
 */
export async function handleCloudflareRequest(
  context: { request: Request; env?: Record<string, any>; dbClient?: any; data?: any; [key: string]: any },
  handler: (req: any, res: any, dbClient?: any) => Promise<any> | any,
  dbClient?: any,
  aiClient?: any
): Promise<Response> {
  const request = context.request;
  const url = new URL(request.url);

  // Guarantee globalThis.process exists for libraries that expect it, without mutating global env
  // RATIONALE: Certain isomorphic dependencies (e.g., Supabase client, jwt libraries) check process.env
  // without guarding with `typeof process !== 'undefined'`. In Cloudflare Pages Functions isolates,
  // `process` is undefined by default, leading to unhandled ReferenceErrors.
  // SECURITY INVARIANT:
  // - Object.freeze({}) ensures immutability.
  // - No Cloudflare request secrets or environment variables are ever written to global state.
  // - All request secrets remain strictly scoped to `req.env`.
  if (typeof (globalThis as any).process === 'undefined') {
    (globalThis as any).process = { env: Object.freeze({}) };
  }

  // Parse request body for methods that transmit payloads
  let body: any = null;
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      const text = await request.text();
      if (text && text.trim().length > 0) {
        const contentType = request.headers.get('content-type') || '';
        const trimmed = text.trim();
        if (
          contentType.toLowerCase().includes('application/json') ||
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        } else {
          body = text;
        }
      } else {
        body = {};
      }
    } catch {
      body = {};
    }
  }

  // Build a case-insensitive headers lookup
  const rawHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    rawHeaders[key.toLowerCase()] = value;
  });

  const reqHeaders = new Proxy(rawHeaders, {
    get(target, prop) {
      if (typeof prop === 'string') {
        return target[prop.toLowerCase()];
      }
      return (target as any)[prop];
    },
    has(target, prop) {
      if (typeof prop === 'string') {
        return prop.toLowerCase() in target;
      }
      return prop in target;
    },
  });

  // Query parameter parsing supporting both single and repeated keys
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key in query) {
      const existing = query[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing as string, value];
      }
    } else {
      query[key] = value;
    }
  }

  const effectiveAi = aiClient || context.env?.AI || (context as any).ai || (context.data && context.data.ai);

  const nodeReq = {
    method,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    headers: reqHeaders,
    body,
    query,
    env: { ...((globalThis as any).process?.env || {}), ...(context.env || {}) },
    ai: effectiveAi,
    cfContext: context,
  };

  const nodeRes = createNodeResponseMock();
  const effectiveDbClient = dbClient || context.dbClient || (context.data && context.data.dbClient);

  try {
    // Execute handler (supports both synchronous and asynchronous handlers)
    await handler(nodeReq, nodeRes, effectiveDbClient);

    const status = nodeRes._getStatusCode();
    const resHeaders = nodeRes._getHeaders();
    const rawBody = nodeRes._getBody();

    // Headers assembly
    const responseHeaders = new Headers();
    for (const [k, v] of Object.entries(resHeaders)) {
      responseHeaders.set(k, v as string);
    }

    // Default Content-Type for JSON payloads if not explicitly set
    if (!responseHeaders.has('content-type') && rawBody !== null && rawBody !== undefined && rawBody !== '') {
      responseHeaders.set('content-type', 'application/json');
    }

    // 204 No Content and 304 Not Modified must not have a response body
    if (status === 204 || status === 304 || rawBody === null || rawBody === undefined) {
      return new Response(null, {
        status,
        headers: responseHeaders,
      });
    }

    return new Response(rawBody, {
      status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    // Generate an opaque, unique correlation ID for operational tracing
    const correlationId = 'cf_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    const errorType = (typeof err === 'object' && err !== null && typeof err.name === 'string') ? err.name : 'AdapterException';

    // Log only safe operational metadata — NEVER log raw exception message, stack trace, headers, bodies, or query params
    console.error(`[Cloudflare Adapter Error] id=${correlationId} type=${errorType} method=${method} path=${url.pathname}`);

    // Return sanitized JSON 500 error; never expose secrets, internal paths, SQL details, or stack traces
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Internal server error in Cloudflare function adapter.',
        correlationId,
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
