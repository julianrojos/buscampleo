import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSettings, saveSettings } from '@/data/settings-repository';
import type { UserSettings } from '@/types/account';

export default function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    placeholderData: (previousData) => previousData,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) => saveSettings(patch),
    onSuccess: (nextSettings) => {
      queryClient.setQueryData(['settings'], nextSettings);
    },
  });

  return {
    ...settingsQuery,
    saveSettings: updateSettingsMutation.mutateAsync,
    isSaving: updateSettingsMutation.isPending,
  };
}
