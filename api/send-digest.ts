import { z } from 'zod';

import { addEmailLog } from '@/data/email-log-repository';
import { listJobs } from '@/data/job-repository';
import { getSettings } from '@/data/settings-repository';
import type { JobAnalysisStatus } from '@/types/job';
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

export const SendDigestBodySchema = z.object({
  test: z.boolean().optional(),
});

export interface DigestSelectionSettings {
  readonly min_score: number;
  readonly max_jobs: number;
  readonly include_unanalyzed: boolean;
}

export interface DigestJobCandidate {
  readonly id: string;
  readonly is_hidden: boolean;
  readonly analysis_status: JobAnalysisStatus;
  readonly final_score: number | null;
}

export function selectDigestJobs(
  jobs: readonly DigestJobCandidate[],
  settings: DigestSelectionSettings,
) {
  return jobs
    .filter((job) => !job.is_hidden)
    .filter((job) => {
      const isAnalyzed = job.analysis_status === 'done';
      if (!isAnalyzed) return settings.include_unanalyzed;
      return (job.final_score ?? 0) >= settings.min_score;
    })
    .slice(0, settings.max_jobs);
}

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

  const bodyResult = SendDigestBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const settings = await getSettings(authToken);
  const selectedJobs = selectDigestJobs(await listJobs(authToken), settings);
  const shouldSend = bodyResult.data.test || (selectedJobs.length > 0 && settings.email_enabled);
  const sentAt = shouldSend ? new Date().toISOString() : null;

  await addEmailLog(
    {
      owner_id: settings.owner_id,
      status: sentAt ? 'sent' : 'skipped',
      provider: 'preview',
      recipient_email: settings.email_recipient || 'pending@example.com',
      subject: bodyResult.data.test ? 'Buscampleo - email de prueba' : 'Buscampleo digest',
      jobs_included: selectedJobs.map((job) => job.id),
      payload: { selectedCount: selectedJobs.length },
      provider_message_id: null,
      error_message: sentAt ? null : 'No eligible jobs or digest disabled.',
      sent_at: sentAt,
    },
    authToken,
  );

  res.status(200).json({
    ok: true,
    selected: selectedJobs.length,
    sent: Boolean(sentAt),
  });
}
