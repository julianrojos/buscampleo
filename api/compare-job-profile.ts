import { z } from 'zod';

import { getJobById } from '@/data/job-repository';
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

const BodySchema = z.object({
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

  const bodyResult = BodySchema.safeParse(req.body);
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
  const fit = job.detected_skills.filter((skill) =>
    profile.skills_text.toLowerCase().includes(skill.toLowerCase()),
  ).length;

  res.status(200).json({
    jobId: job.id,
    profileId: profile.id,
    fitScore: Math.min(100, 70 + fit * 5),
    summary: job.summary ?? 'Sin resumen.',
  });
}
