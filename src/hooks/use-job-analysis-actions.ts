import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/auth/session';
import { hasSupabaseConfig } from '@/lib/runtime';
import { getSupabaseEdgeFunctionUrl } from '@/lib/supabase/functions';

async function invokeJobEdgeFunction(
  functionName: 'analyze-job' | 'compare-job-profile',
  jobId: string,
  accessToken: string | undefined,
) {
  if (!hasSupabaseConfig() || !accessToken) {
    throw new Error('Las acciones de análisis requieren Supabase y una sesión activa.');
  }

  const response = await fetch(getSupabaseEdgeFunctionUrl(functionName), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { readonly error?: string } | null;
    throw new Error(body?.error ?? 'No se pudo ejecutar la acción de análisis.');
  }

  return (await response.json().catch(() => null)) as
    | {
        readonly ok?: boolean;
        readonly score?: number;
        readonly model?: string;
      }
    | null;
}

export default function useJobAnalysisActions(jobId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const accessToken = session?.access_token;

  const invalidate = async () => {
    if (!jobId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['job', jobId] }),
      queryClient.invalidateQueries({ queryKey: ['job-match', jobId] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    ]);
  };

  const analyzeMutation = useMutation({
    mutationFn: () => invokeJobEdgeFunction('analyze-job', jobId ?? '', accessToken),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const compareMutation = useMutation({
    mutationFn: () => invokeJobEdgeFunction('compare-job-profile', jobId ?? '', accessToken),
    onSuccess: async () => {
      await invalidate();
    },
  });

  return {
    canRun: hasSupabaseConfig() && Boolean(jobId && accessToken),
    analyze: analyzeMutation.mutateAsync,
    compare: compareMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    isComparing: compareMutation.isPending,
    error: analyzeMutation.error ?? compareMutation.error,
  };
}
