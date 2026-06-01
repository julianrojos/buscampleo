import { DEFAULT_CRITERIA_CONFIG, CriteriaConfigSchema } from '../lib/criteria-config';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { shouldUseMockFallback } from '@/lib/runtime';
import type { Json } from '@/lib/supabase/database.types';
import type { CriteriaConfig } from '@/types/criteria';
import type { RemoteAccessOptions } from '@/data/remote-access';

const STORAGE_KEY = 'buscampleo.criteria.v1';
const CRITERIA_SETTING_KEY = 'criteria_config';

function cloneCriteria(criteria: CriteriaConfig): CriteriaConfig {
  return {
    hard_excludes: criteria.hard_excludes.map((item) => ({ ...item })),
    weighted_signals: criteria.weighted_signals.map((item) => ({ ...item })),
    conditional_rules: criteria.conditional_rules.map((item) => ({ ...item })),
    target_roles: criteria.target_roles.map((item) => ({ ...item })),
  };
}

function seedCriteria(): CriteriaConfig {
  return cloneCriteria(DEFAULT_CRITERIA_CONFIG);
}

function loadLocalCriteria(): CriteriaConfig {
  return readStoredValue(STORAGE_KEY, seedCriteria());
}

function saveLocalCriteria(criteria: CriteriaConfig): CriteriaConfig {
  return writeStoredValue(STORAGE_KEY, cloneCriteria(criteria));
}

async function readRemoteCriteria(
  options: RemoteAccessOptions = {},
): Promise<CriteriaConfig | null> {
  const client = getSupabaseClient(undefined, options);
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('settings')
    .select('value')
    .eq('key', CRITERIA_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`db.criteria.read_failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const parsed = CriteriaConfigSchema.safeParse(data.value);
  if (!parsed.success) {
    console.warn('[criteria-repository] invalid remote criteria config', parsed.error);
    const seeded = seedCriteria();
    saveLocalCriteria(seeded);
    return seeded;
  }

  const nextCriteria = cloneCriteria(parsed.data);
  saveLocalCriteria(nextCriteria);
  return nextCriteria;
}

export async function getCriteriaConfig(
  options: RemoteAccessOptions = {},
): Promise<CriteriaConfig> {
  if (shouldUseMockFallback()) {
    return loadLocalCriteria();
  }

  const remoteCriteria = await readRemoteCriteria(options);
  if (remoteCriteria) {
    return remoteCriteria;
  }

  return loadLocalCriteria();
}

export function getCriteriaConfigSnapshot(): CriteriaConfig {
  return loadLocalCriteria();
}

export async function saveCriteriaConfig(
  criteria: CriteriaConfig,
  options: RemoteAccessOptions = {},
): Promise<CriteriaConfig> {
  const nextCriteria = cloneCriteria(criteria);

  if (shouldUseMockFallback()) {
    return saveLocalCriteria(nextCriteria);
  }

  const client = getSupabaseClient(undefined, options);
  if (!client) {
    return saveLocalCriteria(nextCriteria);
  }

  const { error } = await client.from('settings').upsert({
    key: CRITERIA_SETTING_KEY,
    value: nextCriteria as unknown as Json,
  });

  if (error) {
    throw new Error(`db.criteria.save_failed: ${error.message}`);
  }

  return saveLocalCriteria(nextCriteria);
}

export async function resetCriteriaConfig(
  options: RemoteAccessOptions = {},
): Promise<CriteriaConfig> {
  return saveCriteriaConfig(seedCriteria(), options);
}
