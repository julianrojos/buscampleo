import { CompareJobProfileBodySchema } from '../../../src/lib/functions/compare-job-profile.ts';
import { getJobById, getProfile, verifySupabaseSession } from '../_shared/data.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';

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
    const fit = job.detected_skills.filter((skill) =>
      profile.skills_text.toLowerCase().includes(skill.toLowerCase()),
    ).length;

    return jsonResponse(
      {
        jobId: job.id,
        profileId: profile.id,
        fitScore: Math.min(100, 70 + fit * 5),
        summary: job.summary ?? 'Sin resumen.',
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
