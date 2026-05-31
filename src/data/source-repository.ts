import { getSupabaseClient } from '@/lib/supabase/client';
import { MOCK_SOURCES } from '@/data/mock-sources';
import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed, type RemoteAccessOptions } from '@/data/remote-access';
import type { Source } from '@/types/source';

const STORAGE_KEY = 'buscampleo.sources.v1';

function cloneSources(sources: readonly Source[]): Source[] {
  return sources.map((source) => ({ ...source }));
}

function seedSources(): Source[] {
  return cloneSources(MOCK_SOURCES);
}

function loadLocalSources(): Source[] {
  return readStoredValue(STORAGE_KEY, seedSources());
}

function saveLocalSources(sources: readonly Source[]): Source[] {
  return writeStoredValue(STORAGE_KEY, cloneSources(sources));
}

async function readRemoteSources(options: RemoteAccessOptions = {}): Promise<Source[] | null> {
  const client = getSupabaseClient(undefined, options);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('sources').select('*').order('priority', {
    ascending: false,
  });

  if (error || !data) {
    if (shouldFailClosed(undefined, options)) {
      throw new Error(`db.sources.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return null;
  }

  return data as Source[];
}

export async function listSources(options: RemoteAccessOptions = {}): Promise<Source[]> {
  return (await readRemoteSources(options)) ?? loadLocalSources();
}

export async function getSourceById(
  id: string | undefined,
  options: RemoteAccessOptions = {},
): Promise<Source | undefined> {
  if (!id) {
    return undefined;
  }

  const sources = await listSources(options);
  return sources.find((source) => source.id === id);
}

export async function patchSource(
  id: string,
  patch: Partial<Source>,
  options: RemoteAccessOptions = {},
): Promise<Source | undefined> {
  const sources = await listSources(options);
  const nextSources = sources.map((source) =>
    source.id === id ? { ...source, ...patch } : source,
  );
  const updatedSource = nextSources.find((source) => source.id === id);

  const client = getSupabaseClient(undefined, options);
  if (!client) {
    saveLocalSources(nextSources);
    return updatedSource;
  }

  const { error } = await client.from('sources').update(patch).eq('id', id);
  if (error) {
    if (shouldFailClosed(undefined, options)) {
      throw new Error(`db.sources.update_failed: ${error.message}`);
    }
    return undefined;
  }

  return updatedSource;
}

export async function setSourceActive(
  id: string,
  active: boolean,
  options: RemoteAccessOptions = {},
): Promise<Source | undefined> {
  return patchSource(id, { active }, options);
}

export async function createSource(
  source: Omit<Source, 'id' | 'created_at' | 'updated_at'> & {
    readonly id?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
  },
  options: RemoteAccessOptions = {},
): Promise<Source[]> {
  const sources = await listSources(options);
  const timestamp = new Date().toISOString();
  const nextSource: Source = {
    ...source,
    id: source.id ?? createRecordId('source'),
    created_at: source.created_at ?? timestamp,
    updated_at: source.updated_at ?? timestamp,
  };
  const nextSources = [nextSource, ...sources.filter((item) => item.id !== nextSource.id)];

  return replaceSources(nextSources, options);
}

export async function deleteSource(
  id: string,
  options: RemoteAccessOptions = {},
): Promise<Source[]> {
  const sources = await listSources(options);
  const nextSources = sources.filter((source) => source.id !== id);

  const client = getSupabaseClient(undefined, options);
  if (!client) {
    saveLocalSources(nextSources);
    return nextSources;
  }

  const { error } = await client.from('sources').delete().eq('id', id);
  if (error) {
    if (shouldFailClosed(undefined, options)) {
      throw new Error(`db.sources.delete_failed: ${error.message}`);
    }

    throw { code: 'db.sources.delete_failed', message: error.message, cause: error };
  }

  return (await readRemoteSources(options)) ?? nextSources;
}

export async function updateSourceRunInfo(
  id: string,
  patch: Pick<
    Source,
    'last_success_at' | 'last_error_at' | 'consecutive_failures' | 'offers_found'
  >,
  options: RemoteAccessOptions = {},
): Promise<Source | undefined> {
  return patchSource(id, patch, options);
}

export async function replaceSources(
  sources: readonly Source[],
  options: RemoteAccessOptions = {},
): Promise<Source[]> {
  const nextSources = cloneSources(sources);

  const client = getSupabaseClient(undefined, options);
  if (!client) {
    saveLocalSources(nextSources);
    return nextSources;
  }

  const { error } = await client.from('sources').upsert(nextSources);
  if (error) {
    if (shouldFailClosed(undefined, options)) {
      throw new Error(`db.sources.replace_failed: ${error.message}`);
    }
    return saveLocalSources(nextSources);
  }

  return nextSources;
}
