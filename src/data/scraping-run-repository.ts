import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed, type RemoteAccessOptions } from '@/data/remote-access';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { ScrapingRun } from '@/types/scraping';

const STORAGE_KEY = 'buscampleo.scraping-runs.v1';

type ScrapingRunRow = Database['public']['Tables']['scraping_runs']['Row'];
type ScrapingRunInsert = Database['public']['Tables']['scraping_runs']['Insert'];

function seedRuns(): ScrapingRun[] {
  return [
    {
      id: 'run-001',
      started_at: '2026-05-29T08:00:00.000Z',
      finished_at: '2026-05-29T08:04:00.000Z',
      status: 'success',
      total_sources: 9,
      successful_sources: 9,
      failed_sources: 0,
      jobs_found: 42,
      jobs_inserted: 8,
      jobs_updated: 11,
      error_summary: null,
      duration_ms: 240000,
      created_at: '2026-05-29T08:05:00.000Z',
    },
    {
      id: 'run-002',
      started_at: '2026-05-28T08:00:00.000Z',
      finished_at: '2026-05-28T08:05:00.000Z',
      status: 'partial',
      total_sources: 9,
      successful_sources: 8,
      failed_sources: 1,
      jobs_found: 35,
      jobs_inserted: 6,
      jobs_updated: 9,
      error_summary: 'Fallback HTML parser triggered for Lever Direct.',
      duration_ms: 300000,
      created_at: '2026-05-28T08:06:00.000Z',
    },
    {
      id: 'run-003',
      started_at: '2026-05-27T08:00:00.000Z',
      finished_at: '2026-05-27T08:08:00.000Z',
      status: 'failed',
      total_sources: 9,
      successful_sources: 6,
      failed_sources: 3,
      jobs_found: 11,
      jobs_inserted: 2,
      jobs_updated: 3,
      error_summary: 'Several sources returned 429 after rate limiting.',
      duration_ms: 480000,
      created_at: '2026-05-27T08:08:30.000Z',
    },
  ] satisfies ScrapingRun[];
}

function cloneRuns(runs: readonly ScrapingRun[]): ScrapingRun[] {
  return runs.map((run) => ({ ...run }));
}

function loadLocalRuns(): ScrapingRun[] {
  return readStoredValue(STORAGE_KEY, seedRuns());
}

function saveLocalRuns(runs: readonly ScrapingRun[]): ScrapingRun[] {
  return writeStoredValue(STORAGE_KEY, cloneRuns(runs));
}

function durationFromRow(row: ScrapingRunRow): number | null {
  if (!row.finished_at) {
    return null;
  }

  const duration = new Date(row.finished_at).getTime() - new Date(row.started_at).getTime();
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function mapRowToRun(row: ScrapingRunRow): ScrapingRun {
  return {
    id: row.id,
    started_at: row.started_at,
    finished_at: row.finished_at,
    status: row.status,
    total_sources: row.total_sources,
    successful_sources: row.successful_sources,
    failed_sources: row.failed_sources,
    jobs_found: row.jobs_found,
    jobs_inserted: row.jobs_inserted,
    jobs_updated: row.jobs_updated,
    error_summary: row.error_summary,
    duration_ms: durationFromRow(row),
    created_at: row.created_at,
  };
}

async function readRemoteRuns(
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<ScrapingRun[] | null> {
  const client = getSupabaseClient(authToken, options);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('scraping_runs').select('*').order('started_at', {
    ascending: false,
  });

  if (error || !data) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(`db.scraping_runs.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return null;
  }

  return data.map((row) => mapRowToRun(row as ScrapingRunRow));
}

export async function listScrapingRuns(
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<ScrapingRun[]> {
  return (await readRemoteRuns(authToken, options)) ?? loadLocalRuns();
}

export async function addScrapingRun(
  run: Omit<ScrapingRun, 'id' | 'created_at'>,
  authToken?: string | null,
  options: RemoteAccessOptions = {},
): Promise<ScrapingRun[]> {
  const runs = await listScrapingRuns(authToken, options);
  const timestamp = new Date().toISOString();
  const nextRun: ScrapingRun = {
    ...run,
    id: createRecordId('run'),
    created_at: timestamp,
  };

  const client = getSupabaseClient(authToken, options);
  if (!client) {
    return saveLocalRuns([nextRun, ...runs]);
  }

  const insertPayload: ScrapingRunInsert = {
    started_at: run.started_at,
    finished_at: run.finished_at,
    status: run.status,
    total_sources: run.total_sources,
    successful_sources: run.successful_sources,
    failed_sources: run.failed_sources,
    jobs_found: run.jobs_found,
    jobs_inserted: run.jobs_inserted,
    jobs_updated: run.jobs_updated,
    error_summary: run.error_summary,
  };

  const insertResult = await client
    .from('scraping_runs')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken, options)) {
      throw new Error(
        `db.scraping_runs.save_failed: ${insertResult.error?.message ?? 'unknown error'}`,
      );
    }
    return saveLocalRuns([nextRun, ...runs]);
  }

  const insertedRun = mapRowToRun(insertResult.data as ScrapingRunRow);
  return [insertedRun, ...runs];
}
