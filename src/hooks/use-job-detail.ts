import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getJobById } from '@/data/job-repository';
import type { Job } from '@/types/job';

export default function useJobDetail(id: string | undefined): UseQueryResult<Job | undefined> {
  return useQuery({
    queryKey: ['job', id],
    enabled: Boolean(id),
    queryFn: () => getJobById(id),
  });
}
