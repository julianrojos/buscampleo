import { runtime } from '@/lib/runtime';

export function getSupabaseEdgeFunctionUrl(functionName: string): string {
  if (!runtime.supabaseUrl) {
    throw new Error('Supabase no está configurado.');
  }

  return new URL(`/functions/v1/${functionName}`, runtime.supabaseUrl).toString();
}
