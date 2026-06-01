import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listJobs } from '@/data/job-repository';
import { getCriteriaConfigSnapshot } from '@/data/criteria-repository';
import useCriteriaConfig from '@/hooks/use-criteria-config';
import { applyJobFilters } from '@/lib/job-filtering';
import type { Job } from '@/types/job';
import type { JobFilters } from '@/types/filter';

export default function useJobs(filters: JobFilters): UseQueryResult<Job[]> {
  const { data: criteria } = useCriteriaConfig();
  const criteriaConfig = criteria ?? getCriteriaConfigSnapshot();

  return useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    select: (jobs) => applyJobFilters(jobs, filters, criteriaConfig),
    placeholderData: (previousData) => previousData,
  });
}
