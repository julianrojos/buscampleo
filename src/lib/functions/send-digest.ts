import { z } from 'zod';

import type { JobAnalysisStatus } from '../../types/job';

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
