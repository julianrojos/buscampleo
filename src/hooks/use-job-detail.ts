import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getJobById } from '@/data/job-store';
import type { Job } from '@/types/job';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function useJobDetail(id: string | undefined): UseQueryResult<Job | undefined> {
  return useQuery({
    queryKey: ['job', id],
    enabled: Boolean(id),
    queryFn: async () => {
      await delay(150);
      return getJobById(id);
    },
  });
}
