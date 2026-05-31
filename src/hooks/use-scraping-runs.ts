import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listScrapingRuns } from '@/data/scraping-run-repository';
import type { ScrapingRun } from '@/types/scraping';

export default function useScrapingRuns(): UseQueryResult<ScrapingRun[]> {
  return useQuery({
    queryKey: ['scraping-runs'],
    queryFn: listScrapingRuns,
    placeholderData: (previousData) => previousData,
  });
}
