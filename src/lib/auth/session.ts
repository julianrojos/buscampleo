import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import { getAllowedEmail, isAllowedEmail, shouldRequireAuth } from '@/lib/runtime';

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session;
}

export async function verifySupabaseSession(authToken?: string | null): Promise<boolean> {
  const client = getSupabaseClient(authToken);
  if (!client) {
    return false;
  }

  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}

export function useSession() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: getCurrentSession,
    enabled: shouldRequireAuth(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export async function signInWithOtp(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  if (!isAllowedEmail(email)) {
    const allowedEmail = getAllowedEmail();
    throw new Error(
      allowedEmail
        ? `Usa el email autorizado: ${allowedEmail}`
        : 'El email indicado no está autorizado.',
    );
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '') || ''}`
      : undefined;

  const { error } = await client.auth.signInWithOtp({
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}
