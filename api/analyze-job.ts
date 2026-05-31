import { z } from 'zod';

import { getJobById, patchJob } from '@/data/job-repository';
import { createJobMatchId, upsertJobMatch } from '@/data/job-match-repository';
import { getProfile } from '@/data/profile-repository';
import { verifySupabaseSession } from '@/lib/auth/session';

type VercelRequest = {
  readonly method?: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export const AnalyzeJobBodySchema = z.object({
  jobId: z.string().min(1),
});

function getBearerToken(headers?: Record<string, string | string[] | undefined>): string | null {
  const authHeader = headers?.authorization ?? headers?.Authorization;
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  return bearer?.startsWith('Bearer ') ? bearer.slice(7) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authToken = getBearerToken(req.headers);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!authToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!(await verifySupabaseSession(authToken))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const bodyResult = AnalyzeJobBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const job = await getJobById(bodyResult.data.jobId, authToken);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const profile = await getProfile(authToken);
  const score = Math.min(100, Math.round((job.final_score ?? 60) + 2));
  const matchId = createJobMatchId();
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

  res.status(200).json({ ok: true, score });
}
