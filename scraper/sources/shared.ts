import { MOCK_JOBS } from '@/data/mock-jobs';
import type { ParsedJobBundle } from '@/scraper/types';
import type { Source } from '@/types/source';

function cloneJobBundle(bundle: ParsedJobBundle): ParsedJobBundle {
  return {
    source: { ...bundle.source },
    job: {
      ...bundle.job,
      positive_signals: [...bundle.job.positive_signals],
      red_flags: [...bundle.job.red_flags],
      detected_skills: [...bundle.job.detected_skills],
      detected_keywords: [...bundle.job.detected_keywords],
      raw_payload: bundle.job.raw_payload ? { ...bundle.job.raw_payload } : null,
    },
  };
}

export async function parseMockJobsForSource(source: Source): Promise<readonly ParsedJobBundle[]> {
  return MOCK_JOBS.filter((job) => job.source_id === source.id).map((job) =>
    cloneJobBundle({
      source,
      job,
    }),
  );
}
