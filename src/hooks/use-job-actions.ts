import { useQueryClient } from '@tanstack/react-query';

import { applyJob, hideJob, markJobRead, saveJob, unsaveJob } from '@/data/job-repository';
import type { Job } from '@/types/job';

interface UseJobActionsReturn {
  readonly save: (id: string) => void;
  readonly unsave: (id: string) => void;
  readonly hide: (id: string) => void;
  readonly apply: (id: string) => void;
  readonly markRead: (id: string) => void;
}

async function updateJobInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patcher: () => Promise<Job | undefined>,
  options: { readonly invalidateLists?: boolean } = {},
) {
  try {
    const updatedJob = await patcher();

    if (options.invalidateLists) {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } else if (updatedJob) {
      queryClient.setQueriesData<Job[]>(
        { queryKey: ['jobs'], exact: false },
        (currentJobs) => currentJobs?.map((job) => (job.id === id ? updatedJob : job)) ?? [],
      );
    }

    if (updatedJob) {
      queryClient.setQueryData<Job | undefined>(['job', id], updatedJob);
    }
  } catch (error) {
    console.error('[job-action] failed', { id, error });
  }
}

export default function useJobActions(): UseJobActionsReturn {
  const queryClient = useQueryClient();

  function save(id: string) {
    void updateJobInCache(queryClient, id, () => saveJob(id), { invalidateLists: true });
  }

  function unsave(id: string) {
    void updateJobInCache(queryClient, id, () => unsaveJob(id));
  }

  function hide(id: string) {
    void updateJobInCache(queryClient, id, () => hideJob(id), { invalidateLists: true });
  }

  function apply(id: string) {
    void updateJobInCache(queryClient, id, () => applyJob(id), { invalidateLists: true });
  }

  function markRead(id: string) {
    void updateJobInCache(queryClient, id, () => markJobRead(id), { invalidateLists: true });
  }

  return {
    save,
    unsave,
    hide,
    apply,
    markRead,
  };
}
