import {
  CompareJobProfileBodySchema,
  buildCompareJobProfilePrompt,
  buildCompareJobProfileSystemPrompt,
  deriveJobProfileComparison,
  mergeComparisonIntoMatch,
  JobProfileComparisonSchema,
} from '../../../src/lib/functions/compare-job-profile.ts';
import {
  getJobById,
  getCriteriaConfig,
  getProfile,
  listJobMatches,
  patchJob,
  upsertJobMatch,
  verifySupabaseSession,
} from '../_shared/data.ts';
import { generateStructuredCompletion } from '../_shared/llm.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';
import { calculateJobScore } from '../../../src/lib/job-scoring.ts';

type CompareJobProfileBody = {
  readonly jobId: string;
};

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

    const body = (await request.json().catch(() => null)) as CompareJobProfileBody | null;
    const bodyResult = CompareJobProfileBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return jsonResponse({ error: 'Invalid payload' }, request, { status: 400 });
    }

    const job = await getJobById(bodyResult.data.jobId, authToken);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, request, { status: 404 });
    }

    const profile = await getProfile(authToken);
    const criteria = await getCriteriaConfig(authToken);
    const fallbackComparison = deriveJobProfileComparison(job, profile);
    const existingMatch = (await listJobMatches(authToken)).find(
      (item) => item.job_id === job.id && item.profile_id === profile.id,
    );

    const llmResult = await generateStructuredCompletion({
      systemPrompt: buildCompareJobProfileSystemPrompt(),
      userPrompt: buildCompareJobProfilePrompt(job, profile),
      schema: JobProfileComparisonSchema,
      maxTokens: 1400,
    }).catch((error) => {
      console.warn('[compare-job-profile] model fallback', error);
      return null;
    });

    const comparison = llmResult?.value ?? fallbackComparison;
    const model = llmResult ? `${llmResult.provider}:${llmResult.model}` : 'heuristic-fallback';
    const timestamp = new Date().toISOString();
    const mergedComparison = mergeComparisonIntoMatch(existingMatch, comparison);
    const nextJob = {
      ...job,
      profile_match_score: comparison.overall_score,
      semantic_score: job.semantic_score ?? comparison.hard_skills_score,
      final_score: null,
    };
    const scoreBreakdown = calculateJobScore(nextJob, criteria);

    await upsertJobMatch(
      {
        id: `match-${crypto.randomUUID().slice(0, 8)}`,
        owner_id: profile.owner_id,
        job_id: job.id,
        profile_id: profile.id,
        analysis_status: 'done',
        overall_score: comparison.overall_score,
        semantic_score: comparison.hard_skills_score,
        profile_match_score: comparison.overall_score,
        summary: mergedComparison.summary,
        strengths: mergedComparison.strengths,
        gaps: mergedComparison.gaps,
        recommendations: mergedComparison.recommendations,
        detected_keywords: mergedComparison.detected_keywords,
        detected_skills: mergedComparison.detected_skills,
        model,
        raw_response: llmResult
          ? {
              provider: llmResult.provider,
              model: llmResult.model,
              raw_text: llmResult.rawText,
              comparison,
              previous_raw_response: existingMatch?.raw_response ?? null,
            }
          : {
              provider: 'heuristic-fallback',
              model: 'heuristic-fallback',
              raw_text: JSON.stringify(comparison),
              previous_raw_response: existingMatch?.raw_response ?? null,
            },
        created_at: timestamp,
        updated_at: timestamp,
      },
      authToken,
    );

    await patchJob(
      job.id,
      {
        profile_match_score: comparison.overall_score,
        semantic_score: job.semantic_score ?? comparison.hard_skills_score,
        final_score: scoreBreakdown.finalScore,
      },
      authToken,
    );

    return jsonResponse(
      {
        ok: true,
        jobId: job.id,
        profileId: profile.id,
        model,
        score: scoreBreakdown.finalScore,
        score_breakdown: scoreBreakdown,
        comparison,
      },
      request,
    );
  } catch (error) {
    console.error('[compare-job-profile] failed', error);
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
