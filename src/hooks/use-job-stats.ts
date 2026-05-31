import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listJobs } from '@/data/job-repository';
import type { Job } from '@/types/job';

export interface JobStats {
  readonly total: number;
  readonly newCount: number;
  readonly errorCount: number;
  readonly savedCount: number;
  readonly hiddenCount: number;
  readonly unreadCount: number;
  readonly latestUpdatedAt: string | null;
}

function computeStats(jobs: readonly Job[]): JobStats {
  const latestUpdatedAt =
    jobs.length > 0
      ? ([...jobs].sort(
          (left, right) =>
            new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
        )[0]?.updated_at ?? null)
      : null;

  return {
    total: jobs.length,
    newCount: jobs.filter((job) => job.status === 'new' && !job.is_hidden).length,
    errorCount: jobs.filter(
      (job) => job.analysis_status === 'error' || job.analysis_status === 'failed',
    ).length,
    savedCount: jobs.filter((job) => job.is_saved).length,
    hiddenCount: jobs.filter((job) => job.is_hidden).length,
    unreadCount: jobs.filter((job) => !job.is_read).length,
    latestUpdatedAt,
  };
}

export default function useJobStats(): UseQueryResult<JobStats> {
  return useQuery({
    queryKey: ['job-stats'],
    queryFn: async () => computeStats(await listJobs()),
    placeholderData: (previousData) => previousData,
  });
}
