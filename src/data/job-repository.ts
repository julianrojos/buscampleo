import { getSupabaseClient } from '@/lib/supabase/client';
import { MOCK_JOBS } from '@/data/mock-jobs';
import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed, type RemoteAccessOptions } from '@/data/remote-access';
import type { Job, JobAnalysisStatus, JobStatus, JobModality } from '@/types/job';

const STORAGE_KEY = 'buscampleo.jobs.v1';

type JobRow = Job;

function cloneJobs(jobs: readonly Job[]): Job[] {
  return jobs.map((job) => ({
    ...job,
    positive_signals: [...job.positive_signals],
    red_flags: [...job.red_flags],
    detected_skills: [...job.detected_skills],
    detected_keywords: [...job.detected_keywords],
    raw_payload: job.raw_payload ? { ...job.raw_payload } : null,
  }));
}

function seedJobs(): Job[] {
  return cloneJobs(MOCK_JOBS);
}

function normalizeJob(job: Job): Job {
  return {
    ...job,
    positive_signals: [...job.positive_signals],
    red_flags: [...job.red_flags],
    detected_skills: [...job.detected_skills],
    detected_keywords: [...job.detected_keywords],
    raw_payload: job.raw_payload ? { ...job.raw_payload } : null,
  };
}

function loadLocalJobs(): Job[] {
  return readStoredValue(STORAGE_KEY, seedJobs()).map(normalizeJob);
}

function saveLocalJobs(jobs: readonly Job[]): Job[] {
  return writeStoredValue(STORAGE_KEY, cloneJobs(jobs));
}

function mapRowToJob(row: JobRow): Job {
  return normalizeJob(row);
}

function mergePatch(job: Job, patch: Partial<Job>): Job {
  return normalizeJob({
    ...job,
    ...patch,
    positive_signals: patch.positive_signals ?? job.positive_signals,
    red_flags: patch.red_flags ?? job.red_flags,
    detected_skills: patch.detected_skills ?? job.detected_skills,
    detected_keywords: patch.detected_keywords ?? job.detected_keywords,
    raw_payload: patch.raw_payload ?? job.raw_payload,
  });
}

export function resolveRemoteJobById(
  data: JobRow | null | undefined,
  error: { readonly message: string } | null,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Job | undefined {
  if (error) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(`db.jobs.read_failed: ${error.message}`);
    }
    return undefined;
  }

  if (!data) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error('db.jobs.read_failed: job not found or blocked');
    }
    return undefined;
  }

  return mapRowToJob(data);
}

export async function listJobs(
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job[]> {
  const client = getSupabaseClient(authToken, options);
  if (!client) {
    return loadLocalJobs();
  }

  const { data, error } = await client.from('jobs').select('*').order('updated_at', {
    ascending: false,
  });

  if (error || !data) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(`db.jobs.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return loadLocalJobs();
  }

  return (data as JobRow[]).map(mapRowToJob);
}

export async function getJobById(
  id: string | undefined,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  if (!id) {
    return undefined;
  }

  const client = getSupabaseClient(authToken, options);
  if (!client) {
    return loadLocalJobs().find((job) => job.id === id);
  }

  const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle();
  const remoteJob = resolveRemoteJobById(
    data as JobRow | null | undefined,
    error ? { message: error.message } : null,
    authToken,
    options,
  );
  if (!remoteJob) {
    return loadLocalJobs().find((job) => job.id === id);
  }

  return remoteJob;
}

export async function patchJob(
  id: string,
  patch: Partial<Job>,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  const currentJob = await getJobById(id, authToken, options);
  if (!currentJob) {
    return undefined;
  }

  const nextJob = mergePatch(currentJob, patch);

  const client = getSupabaseClient(authToken, options);
  if (!client) {
    const jobs = loadLocalJobs().map((job) => (job.id === id ? nextJob : job));
    saveLocalJobs(jobs);
    return nextJob;
  }

  const { error } = await client.from('jobs').update(nextJob).eq('id', id);
  if (error) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(`db.jobs.update_failed: ${error.message}`);
    }
    return undefined;
  }

  return nextJob;
}

export async function saveJob(
  id: string,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  return patchJob(
    id,
    {
      is_saved: true,
      is_read: true,
      status: 'saved',
      updated_at: new Date().toISOString(),
    },
    authToken,
    options,
  );
}

export async function unsaveJob(
  id: string,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  return patchJob(
    id,
    {
      is_saved: false,
      status: 'seen',
      updated_at: new Date().toISOString(),
    },
    authToken,
    options,
  );
}

export async function hideJob(
  id: string,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  return patchJob(
    id,
    {
      is_hidden: true,
      status: 'hidden',
      updated_at: new Date().toISOString(),
    },
    authToken,
    options,
  );
}

export async function applyJob(
  id: string,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  return patchJob(
    id,
    {
      is_read: true,
      is_saved: true,
      status: 'applied',
      updated_at: new Date().toISOString(),
    },
    authToken,
    options,
  );
}

export async function markJobRead(
  id: string,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job | undefined> {
  return patchJob(
    id,
    {
      is_read: true,
      status: 'seen',
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    authToken,
    options,
  );
}

export async function replaceJobs(
  jobs: readonly Job[],
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job[]> {
  const nextJobs = cloneJobs(jobs);

  const client = getSupabaseClient(authToken, options);
  if (!client) {
    saveLocalJobs(nextJobs);
    return nextJobs;
  }

  const { error } = await client.from('jobs').upsert(nextJobs);
  if (error) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(`db.jobs.replace_failed: ${error.message}`);
    }
    return saveLocalJobs(nextJobs);
  }

  return nextJobs;
}

export async function upsertJob(
  job: Job,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<Job> {
  const currentJobs = await listJobs(authToken, options);
  const existingIndex = currentJobs.findIndex((item) => item.id === job.id);
  const nextJob = normalizeJob(job);

  if (existingIndex >= 0) {
    currentJobs[existingIndex] = nextJob;
  } else {
    currentJobs.unshift(nextJob);
  }

  await replaceJobs(currentJobs, authToken, options);
  return nextJob;
}

export function createLocalJobPatch(
  job: Job,
  patch: Partial<Job>,
  overrides: {
    readonly status?: JobStatus;
    readonly analysis_status?: JobAnalysisStatus;
    readonly modality?: JobModality;
  } = {},
): Job {
  return mergePatch(job, {
    ...patch,
    ...(overrides.status ? { status: overrides.status } : {}),
    ...(overrides.analysis_status ? { analysis_status: overrides.analysis_status } : {}),
    ...(overrides.modality ? { modality: overrides.modality } : {}),
    updated_at: new Date().toISOString(),
  });
}

export function createJobId(): string {
  return createRecordId('job');
}
