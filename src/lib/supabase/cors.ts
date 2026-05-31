export const defaultAllowedOrigins = [
  'https://julianrojos.github.io',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
] as const;

export function parseAllowedOrigins(value: string | null | undefined): string[] {
  const parsed = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parsed || parsed.length === 0) {
    return [...defaultAllowedOrigins];
  }

  return Array.from(new Set(parsed));
}

export function isAllowedOrigin(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
) {
  if (!origin) {
    return false;
  }

  return allowedOrigins.includes(origin);
}

export function buildCorsHeaders(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (isAllowedOrigin(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers.Vary = 'Origin';
  }

  return headers;
}
