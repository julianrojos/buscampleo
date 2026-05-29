import { MOCK_JOBS } from '@/data/mock-jobs';
import type { Job } from '@/types/job';

function cloneJob(job: Job): Job {
  return {
    ...job,
    positive_signals: [...job.positive_signals],
    red_flags: [...job.red_flags],
    detected_skills: [...job.detected_skills],
    detected_keywords: [...job.detected_keywords],
    raw_payload: job.raw_payload ? { ...job.raw_payload } : null,
  };
}

function cloneJobs(jobs: readonly Job[]): Job[] {
  return jobs.map(cloneJob);
}

let jobStore: Job[] = cloneJobs(MOCK_JOBS);

export function getJobStore(): readonly Job[] {
  return jobStore;
}

export function getJobById(id: string | undefined): Job | undefined {
  if (!id) {
    return undefined;
  }

  return jobStore.find((job) => job.id === id);
}

export function updateJobStore(id: string, patch: Partial<Job>): Job | undefined {
  let updatedJob: Job | undefined;

  jobStore = jobStore.map((job) => {
    if (job.id !== id) {
      return job;
    }

    updatedJob = { ...job, ...patch };
    return updatedJob;
  });

  return updatedJob;
}
