import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import type { KeywordEntry, KeywordPolarity } from '@/types/account';

const STORAGE_KEY = 'buscampleo.keywords.v1';
const OWNER_ID = 'local-user';

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

export async function listKeywords(): Promise<KeywordEntry[]> {
  return readStoredValue(STORAGE_KEY, seedKeywords());
}

export async function saveKeywords(keywords: readonly KeywordEntry[]): Promise<KeywordEntry[]> {
  return writeStoredValue(
    STORAGE_KEY,
    keywords.map((keyword) => ({ ...keyword })),
  );
}

export async function addKeyword(term: string, polarity: KeywordPolarity): Promise<KeywordEntry[]> {
  const keywords = await listKeywords();
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

  return saveKeywords(nextKeywords);
}

export async function removeKeyword(id: string): Promise<KeywordEntry[]> {
  const keywords = await listKeywords();
  return saveKeywords(keywords.filter((keyword) => keyword.id !== id));
}

export async function toggleKeyword(id: string): Promise<KeywordEntry[] | undefined> {
  const keywords = await listKeywords();
  const nextKeywords = keywords.map((keyword) =>
    keyword.id === id
      ? {
          ...keyword,
          active: !keyword.active,
          updated_at: nowIso(),
        }
      : keyword,
  );

  return saveKeywords(nextKeywords);
}
