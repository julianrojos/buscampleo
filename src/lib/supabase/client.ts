import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { hasSupabaseConfig, runtime } from '@/lib/runtime';
import type { Database } from '@/lib/supabase/database.types';

let browserClient: SupabaseClient<Database> | null = null;

export interface SupabaseClientOptions {
  readonly allowServiceRole?: boolean;
}

export function getSupabaseClient(
  authToken?: string | null,
  options: SupabaseClientOptions = {},
): SupabaseClient<Database> | null {
  if (typeof window !== 'undefined') {
    if (!hasSupabaseConfig()) {
      return null;
    }

    if (!browserClient) {
      browserClient = createClient<Database>(runtime.supabaseUrl, runtime.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }

    return browserClient;
  }

  if (!runtime.supabaseUrl) {
    return null;
  }

  const token = authToken?.trim() || null;

  if (token && runtime.supabaseAnonKey) {
    return createClient<Database>(runtime.supabaseUrl, runtime.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (options.allowServiceRole && runtime.supabaseServiceRoleKey) {
    return createClient<Database>(runtime.supabaseUrl, runtime.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (runtime.supabaseAnonKey) {
    return createClient<Database>(runtime.supabaseUrl, runtime.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return null;
}
