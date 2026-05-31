import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearProfileCv, getProfile, saveProfile } from '@/data/profile-repository';
import type { UserProfile } from '@/types/account';

export default function useProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    placeholderData: (previousData) => previousData,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (patch: Partial<UserProfile>) => saveProfile(patch),
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(['profile'], nextProfile);
    },
  });

  const clearCvMutation = useMutation({
    mutationFn: clearProfileCv,
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(['profile'], nextProfile);
    },
  });

  return {
    ...profileQuery,
    saveProfile: updateProfileMutation.mutateAsync,
    clearCv: clearCvMutation.mutateAsync,
    isSaving: updateProfileMutation.isPending || clearCvMutation.isPending,
  };
}
