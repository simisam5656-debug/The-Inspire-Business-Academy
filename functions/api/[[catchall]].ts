export async function onRequest(context: any) {
  const url = new URL(context.request.url);
  return new Response(
    JSON.stringify({
      ok: false,
      error: `API route not found: ${url.pathname}`,
      statusCode: 404,
    }),
    {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store',
      },
    }
  );
}

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestPatch = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
export const onRequestHead = onRequest;
