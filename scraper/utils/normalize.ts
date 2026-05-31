import type { Job } from '@/types/job';

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim().replace(/\/$/, '');
  }
}

export function dedupeJobs(jobs: readonly Job[]): Job[] {
  const seen = new Set<string>();
  const deduped: Job[] = [];

  for (const job of jobs) {
    const fallbackKey = [
      job.normalized_url || normalizeUrl(job.url),
      job.company.trim().toLowerCase(),
      job.title.trim().toLowerCase(),
      job.location?.trim().toLowerCase() ?? '',
    ].join('::');

    if (seen.has(fallbackKey)) {
      continue;
    }

    seen.add(fallbackKey);
    deduped.push({
      ...job,
      normalized_url: job.normalized_url || normalizeUrl(job.url),
    });
  }

  return deduped;
}
