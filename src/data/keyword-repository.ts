import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { shouldUseMockFallback } from '@/lib/runtime';
import type { Database } from '@/lib/supabase/database.types';
import type { KeywordEntry, KeywordPolarity } from '@/types/account';
import type { RemoteAccessOptions } from '@/data/remote-access';

const STORAGE_KEY = 'buscampleo.keywords.v1';
const OWNER_ID = 'local-user';

type KeywordRow = Database['public']['Tables']['keywords']['Row'];
type KeywordInsert = Database['public']['Tables']['keywords']['Insert'];

function nowIso(): string {
  return new Date().toISOString();
}

function seedKeywords(): KeywordEntry[] {
  const timestamp = nowIso();

  return [
    {
      id: createRecordId('keyword'),
      owner_id: OWNER_ID,
      term: 'design systems',
      polarity: 'positive',
      category: 'design-systems',
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: createRecordId('keyword'),
      owner_id: OWNER_ID,
      term: 'css',
      polarity: 'positive',
      category: 'design-code',
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: createRecordId('keyword'),
      owner_id: OWNER_ID,
      term: 'equity only',
      polarity: 'negative',
      category: 'exclusion',
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

function cloneKeywords(keywords: readonly KeywordEntry[]): KeywordEntry[] {
  return keywords.map((keyword) => ({ ...keyword }));
}

function loadLocalKeywords(): KeywordEntry[] {
  return readStoredValue(STORAGE_KEY, seedKeywords());
}

function saveLocalKeywords(keywords: readonly KeywordEntry[]): KeywordEntry[] {
  return writeStoredValue(STORAGE_KEY, cloneKeywords(keywords));
}

function getKeywordType(polarity: KeywordPolarity): KeywordRow['type'] {
  return polarity === 'positive' ? 'include' : 'exclude';
}

function getKeywordPolarity(type: KeywordRow['type']): KeywordPolarity {
  return type === 'include' ? 'positive' : 'negative';
}

function encodeCategory(category: string): string {
  return JSON.stringify({ category });
}

function decodeCategory(notes: string | null, fallback: string): string {
  if (!notes) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(notes) as { readonly category?: unknown };
    return typeof parsed.category === 'string' && parsed.category.trim()
      ? parsed.category
      : fallback;
  } catch {
    return fallback;
  }
}

export function mapKeywordRowToEntry(row: KeywordRow): KeywordEntry {
  return {
    id: row.id,
    owner_id: OWNER_ID,
    term: row.term,
    polarity: getKeywordPolarity(row.type),
    category: decodeCategory(row.notes, row.type === 'include' ? 'custom-positive' : 'custom-negative'),
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapKeywordEntryToRow(keyword: KeywordEntry): KeywordInsert {
  return {
    id: keyword.id,
    term: keyword.term,
    type: getKeywordType(keyword.polarity),
    weight: keyword.polarity === 'positive' ? 1 : -1,
    active: keyword.active,
    notes: encodeCategory(keyword.category),
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
  };
}

async function readRemoteKeywords(
  options: RemoteAccessOptions = {},
): Promise<KeywordEntry[] | null> {
  const client = getSupabaseClient(undefined, options);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('keywords').select('*').order('term', {
    ascending: true,
  });

  if (error) {
    throw new Error(`db.keywords.read_failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const nextKeywords = data.map((row) => mapKeywordRowToEntry(row as KeywordRow));
  saveLocalKeywords(nextKeywords);
  return nextKeywords;
}

export async function listKeywords(options: RemoteAccessOptions = {}): Promise<KeywordEntry[]> {
  if (shouldUseMockFallback()) {
    return loadLocalKeywords();
  }

  return (await readRemoteKeywords(options)) ?? loadLocalKeywords();
}

export async function saveKeywords(
  keywords: readonly KeywordEntry[],
  options: RemoteAccessOptions = {},
): Promise<KeywordEntry[]> {
  const nextKeywords = cloneKeywords(keywords);

  if (shouldUseMockFallback()) {
    return saveLocalKeywords(nextKeywords);
  }

  const client = getSupabaseClient(undefined, options);
  if (!client) {
    return saveLocalKeywords(nextKeywords);
  }

  const currentKeywords = await listKeywords(options);
  const nextIds = new Set(nextKeywords.map((keyword) => keyword.id));
  const staleIds = currentKeywords.map((keyword) => keyword.id).filter((id) => !nextIds.has(id));

  const { error: upsertError } = await client.from('keywords').upsert(
    nextKeywords.map((keyword) => mapKeywordEntryToRow(keyword)),
  );
  if (upsertError) {
    throw new Error(`db.keywords.save_failed: ${upsertError.message}`);
  }

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from('keywords').delete().in('id', staleIds);
    if (deleteError) {
      throw new Error(`db.keywords.delete_failed: ${deleteError.message}`);
    }
  }

  return saveLocalKeywords(nextKeywords);
}

export async function addKeyword(
  term: string,
  polarity: KeywordPolarity,
  options: RemoteAccessOptions = {},
): Promise<KeywordEntry[]> {
  const keywords = await listKeywords(options);
  const timestamp = nowIso();
  const nextKeywords = [
    ...keywords,
    {
      id: createRecordId('keyword'),
      owner_id: OWNER_ID,
      term,
      polarity,
      category: polarity === 'positive' ? 'custom-positive' : 'custom-negative',
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];

  return saveKeywords(nextKeywords, options);
}

export async function removeKeyword(
  id: string,
  options: RemoteAccessOptions = {},
): Promise<KeywordEntry[]> {
  const keywords = await listKeywords(options);
  return saveKeywords(
    keywords.filter((keyword) => keyword.id !== id),
    options,
  );
}

export async function toggleKeyword(
  id: string,
  options: RemoteAccessOptions = {},
): Promise<KeywordEntry[] | undefined> {
  const keywords = await listKeywords(options);
  const nextKeywords = keywords.map((keyword) =>
    keyword.id === id
      ? {
          ...keyword,
          active: !keyword.active,
          updated_at: nowIso(),
        }
      : keyword,
  );

  return saveKeywords(nextKeywords, options);
}
