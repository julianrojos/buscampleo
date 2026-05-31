import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addKeyword, listKeywords, removeKeyword, toggleKeyword } from '@/data/keyword-repository';

export default function useKeywords() {
  const queryClient = useQueryClient();

  const keywordsQuery = useQuery({
    queryKey: ['keywords'],
    queryFn: listKeywords,
    placeholderData: (previousData) => previousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['keywords'] });
  };

  const addMutation = useMutation({
    mutationFn: ({
      term,
      polarity,
    }: {
      readonly term: string;
      readonly polarity: 'positive' | 'negative';
    }) => addKeyword(term, polarity),
    onSuccess: (nextKeywords) => {
      queryClient.setQueryData(['keywords'], nextKeywords);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeKeyword,
    onSuccess: (nextKeywords) => {
      queryClient.setQueryData(['keywords'], nextKeywords);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleKeyword,
    onSuccess: (nextKeywords) => {
      if (nextKeywords) {
        queryClient.setQueryData(['keywords'], nextKeywords);
      } else {
        invalidate();
      }
    },
  });

  return {
    ...keywordsQuery,
    addKeyword: addMutation.mutateAsync,
    removeKeyword: removeMutation.mutateAsync,
    toggleKeyword: toggleMutation.mutateAsync,
    isSaving: addMutation.isPending || removeMutation.isPending || toggleMutation.isPending,
  };
}
