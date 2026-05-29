import { updateJobStore } from '@/data/job-store';
import { useQueryClient } from '@tanstack/react-query';

import type { Job } from '@/types/job';

interface UseJobActionsReturn {
  readonly save: (id: string) => void;
  readonly unsave: (id: string) => void;
  readonly hide: (id: string) => void;
  readonly apply: (id: string) => void;
  readonly markRead: (id: string) => void;
}

function nowIso() {
  return new Date().toISOString();
}

function updateJobInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Job>,
  options: { readonly invalidateLists?: boolean } = {},
) {
  const updatedJob = updateJobStore(id, patch);

  if (options.invalidateLists) {
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
  } else {
    queryClient.setQueriesData<Job[]>(
      { queryKey: ['jobs'], exact: false },
      (currentJobs) =>
        currentJobs?.map((job) => (job.id === id ? (updatedJob ?? { ...job, ...patch }) : job)) ??
        [],
    );
  }

  queryClient.setQueryData<Job | undefined>(['job', id], (currentJob) =>
    currentJob ? (updatedJob ?? { ...currentJob, ...patch }) : currentJob,
  );
}

export default function useJobActions(): UseJobActionsReturn {
  const queryClient = useQueryClient();

  function save(id: string) {
    updateJobInCache(
      queryClient,
      id,
      {
        is_saved: true,
        is_read: true,
        status: 'saved',
        updated_at: nowIso(),
      },
      { invalidateLists: true },
    );
  }

  function unsave(id: string) {
    updateJobInCache(queryClient, id, {
      is_saved: false,
      status: 'seen',
      updated_at: nowIso(),
    });
  }

  function hide(id: string) {
    updateJobInCache(
      queryClient,
      id,
      {
        is_hidden: true,
        status: 'hidden',
        updated_at: nowIso(),
      },
      { invalidateLists: true },
    );
  }

  function apply(id: string) {
    updateJobInCache(
      queryClient,
      id,
      {
        is_read: true,
        is_saved: true,
        status: 'applied',
        updated_at: nowIso(),
      },
      { invalidateLists: true },
    );
  }

  function markRead(id: string) {
    updateJobInCache(
      queryClient,
      id,
      {
        is_read: true,
        status: 'seen',
        last_seen_at: nowIso(),
        updated_at: nowIso(),
      },
      { invalidateLists: true },
    );
  }

  return {
    save,
    unsave,
    hide,
    apply,
    markRead,
  };
}
