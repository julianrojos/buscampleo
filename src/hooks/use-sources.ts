import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listSources } from '@/data/source-repository';
import type { Source } from '@/types/source';

export default function useSources(): UseQueryResult<Source[]> {
  return useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
    placeholderData: (previousData) => previousData,
  });
}
