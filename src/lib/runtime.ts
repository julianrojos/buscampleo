const metaEnv =
  (
    import.meta as ImportMeta & {
      readonly env?: Record<string, string | undefined>;
    }
  ).env ?? {};

const nodeEnv =
  typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : undefined;

function readEnv(...keys: readonly string[]): string {
  for (const key of keys) {
    const value = metaEnv[key] ?? nodeEnv?.[key];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

export const runtime = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL', 'SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  allowedEmail: readEnv('VITE_ALLOWED_EMAIL'),
  appMode: readEnv('VITE_APP_MODE') || 'auto',
  baseUrl: readEnv('BASE_URL') || '/',
} as const;

export function hasSupabaseConfig(): boolean {
  return Boolean(runtime.supabaseUrl && runtime.supabaseAnonKey);
}

export function shouldUseMockFallback(): boolean {
  return runtime.appMode === 'mock' || !hasSupabaseConfig();
}

export function shouldRequireAuth(): boolean {
  return hasSupabaseConfig();
}

export function getAllowedEmail(): string {
  return runtime.allowedEmail;
}

export function isAllowedEmail(email: string, allowedEmail = runtime.allowedEmail): boolean {
  const normalizedAllowedEmail = allowedEmail.trim().toLowerCase();
  if (!normalizedAllowedEmail) {
    return true;
  }

  return email.trim().toLowerCase() === normalizedAllowedEmail;
}
