import {
  AnalyzeJobBodySchema,
  buildAnalyzeJobPrompt,
  buildAnalyzeJobSystemPrompt,
  deriveJobAnalysis,
  mergeAnalysisIntoMatch,
  JobAnalysisSchema,
} from '../../../src/lib/functions/analyze-job.ts';
import {
  getJobById,
  getCriteriaConfig,
  patchJob,
  getProfile,
  listJobMatches,
  upsertJobMatch,
  verifySupabaseSession,
} from '../_shared/data.ts';
import { generateStructuredCompletion } from '../_shared/llm.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';
import { calculateJobScore } from '../../../src/lib/job-scoring.ts';

type AnalyzeJobBody = {
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
    const criteria = await getCriteriaConfig(authToken);
    const fallbackAnalysis = deriveJobAnalysis(job);
    const existingMatch = (await listJobMatches(authToken)).find(
      (item) => item.job_id === job.id && item.profile_id === profile.id,
    );

    const llmResult = await generateStructuredCompletion({
      systemPrompt: buildAnalyzeJobSystemPrompt(),
      userPrompt: buildAnalyzeJobPrompt(job),
      schema: JobAnalysisSchema,
      maxTokens: 1200,
    }).catch((error) => {
      console.warn('[analyze-job] model fallback', error);
      return null;
    });

    const analysis = llmResult?.value ?? fallbackAnalysis;
    const model = llmResult ? `${llmResult.provider}:${llmResult.model}` : 'heuristic-fallback';
    const timestamp = new Date().toISOString();
    const mergedAnalysis = mergeAnalysisIntoMatch(existingMatch, analysis);
    const nextJob = {
      ...job,
      summary: mergedAnalysis.summary,
      positive_signals: analysis.positive_signals,
      red_flags: analysis.red_flags,
      detected_skills: analysis.skills,
      detected_keywords: analysis.detected_keywords,
      seniority: analysis.seniority ?? job.seniority,
      semantic_score: analysis.analysis_score,
      profile_match_score: job.profile_match_score ?? null,
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
        overall_score: analysis.analysis_score,
        semantic_score: analysis.analysis_score,
        profile_match_score: job.profile_match_score ?? null,
        summary: mergedAnalysis.summary,
        strengths: mergedAnalysis.strengths,
        gaps: mergedAnalysis.gaps,
        recommendations: mergedAnalysis.recommendations,
        detected_keywords: mergedAnalysis.detected_keywords,
        detected_skills: mergedAnalysis.detected_skills,
        model,
        raw_response: llmResult
          ? {
              provider: llmResult.provider,
              model: llmResult.model,
              raw_text: llmResult.rawText,
              analysis,
            }
          : {
              provider: 'heuristic-fallback',
              model: 'heuristic-fallback',
              raw_text: JSON.stringify(analysis),
            },
        created_at: timestamp,
        updated_at: timestamp,
      },
      authToken,
    );

    await patchJob(
      job.id,
      {
        analysis_status: 'done',
        summary: mergedAnalysis.summary,
        positive_signals: analysis.positive_signals,
        red_flags: analysis.red_flags,
        detected_skills: analysis.skills,
        detected_keywords: analysis.detected_keywords,
        seniority: analysis.seniority ?? job.seniority,
        semantic_score: analysis.analysis_score,
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
        analysis,
      },
      request,
    );
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
