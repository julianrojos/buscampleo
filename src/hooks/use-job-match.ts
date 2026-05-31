import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getJobMatchByJobId } from '@/data/job-match-repository';
import type { JobMatch } from '@/types/account';

export default function useJobMatch(
  jobId: string | undefined,
): UseQueryResult<JobMatch | undefined> {
  return useQuery({
    queryKey: ['job-match', jobId],
    enabled: Boolean(jobId),
    queryFn: async () => {
      if (!jobId) {
        return undefined;
      }

      return getJobMatchByJobId(jobId);
    },
  });
}
