import { buildCorsHeaders, parseAllowedOrigins } from '../../../src/lib/supabase/cors.ts';

function readEnv(...keys: readonly string[]): string {
  for (const key of keys) {
    const denoValue = typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;
    const nodeValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    const value = denoValue ?? nodeValue;
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export function corsHeaders(request: Request): Record<string, string> {
  return buildCorsHeaders(
    request.headers.get('origin'),
    parseAllowedOrigins(readEnv('ALLOWED_ORIGIN', 'ALLOWED_ORIGINS')),
  );
}

export function optionsResponse(request: Request): Response {
  return new Response('ok', {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function jsonResponse(body: unknown, request: Request, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}
