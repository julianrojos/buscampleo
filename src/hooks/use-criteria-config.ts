import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCriteriaConfig,
  resetCriteriaConfig,
  saveCriteriaConfig,
} from '@/data/criteria-repository';
import type { CriteriaConfig } from '@/types/criteria';

export default function useCriteriaConfig() {
  const queryClient = useQueryClient();

  const criteriaQuery = useQuery({
    queryKey: ['criteria-config'],
    queryFn: getCriteriaConfig,
    placeholderData: (previousData) => previousData,
  });

  const saveMutation = useMutation({
    mutationFn: (nextCriteria: CriteriaConfig) => saveCriteriaConfig(nextCriteria),
    onSuccess: (nextCriteria) => {
      queryClient.setQueryData(['criteria-config'], nextCriteria);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetCriteriaConfig,
    onSuccess: (nextCriteria) => {
      queryClient.setQueryData(['criteria-config'], nextCriteria);
    },
  });

  return {
    ...criteriaQuery,
    saveCriteriaConfig: saveMutation.mutateAsync,
    resetCriteriaConfig: resetMutation.mutateAsync,
    isSaving: saveMutation.isPending || resetMutation.isPending,
  };
}
