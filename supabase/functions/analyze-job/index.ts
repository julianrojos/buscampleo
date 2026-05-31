import { AnalyzeJobBodySchema } from '../../../src/lib/functions/analyze-job.ts';
import {
  getJobById,
  patchJob,
  getProfile,
  upsertJobMatch,
  verifySupabaseSession,
} from '../_shared/data.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';

type AnalyzeJobBody = {
  readonly jobId: string;
};

function computeScore(job: Awaited<ReturnType<typeof getJobById>>) {
  if (!job) {
    return 0;
  }

  return Math.min(100, Math.round((job.final_score ?? 60) + 2));
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, request, { status: 405 });
  }

  try {
    const authToken = getBearerToken(request);
    if (!authToken || !(await verifySupabaseSession(authToken))) {
      return jsonResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as AnalyzeJobBody | null;
    const bodyResult = AnalyzeJobBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return jsonResponse({ error: 'Invalid payload' }, request, { status: 400 });
    }

    const job = await getJobById(bodyResult.data.jobId, authToken);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, request, { status: 404 });
    }

    const profile = await getProfile(authToken);
    const score = computeScore(job);
    const matchId = `match-${crypto.randomUUID().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    await upsertJobMatch(
      {
        id: matchId,
        owner_id: profile.owner_id,
        job_id: job.id,
        profile_id: profile.id,
        analysis_status: 'done',
        overall_score: score,
        semantic_score: job.semantic_score ?? score - 2,
        profile_match_score: job.profile_match_score ?? score - 3,
        summary: job.summary ?? `Análisis generado para ${job.title}.`,
        strengths: job.positive_signals.slice(0, 4),
        gaps: job.red_flags.slice(0, 3),
        recommendations: ['Revisar encaje y preparar portfolio focalizado.'],
        detected_keywords: job.detected_keywords,
        detected_skills: job.detected_skills,
        model: 'local-rules',
        raw_response: { source: 'deterministic-fallback' },
        created_at: timestamp,
        updated_at: timestamp,
      },
      authToken,
    );

    await patchJob(
      job.id,
      {
        analysis_status: 'done',
        semantic_score: job.semantic_score ?? score - 2,
        profile_match_score: job.profile_match_score ?? score - 3,
        final_score: score,
      },
      authToken,
    );

    return jsonResponse({ ok: true, score }, request);
  } catch (error) {
    console.error('[analyze-job] failed', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      request,
      { status: 500 },
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
