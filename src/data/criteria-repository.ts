import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import { shouldUseMockFallback } from '@/lib/runtime';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import type { CriteriaConfig } from '@/types/criteria';

const STORAGE_KEY = 'buscampleo.criteria.v1';

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

export async function getCriteriaConfig(): Promise<CriteriaConfig> {
  if (shouldUseMockFallback()) {
    return readStoredValue(STORAGE_KEY, seedCriteria());
  }

  return readStoredValue(STORAGE_KEY, seedCriteria());
}

export function getCriteriaConfigSnapshot(): CriteriaConfig {
  return readStoredValue(STORAGE_KEY, seedCriteria());
}

export async function saveCriteriaConfig(criteria: CriteriaConfig): Promise<CriteriaConfig> {
  const nextCriteria = cloneCriteria(criteria);
  return writeStoredValue(STORAGE_KEY, nextCriteria);
}

export async function resetCriteriaConfig(): Promise<CriteriaConfig> {
  return saveCriteriaConfig(seedCriteria());
}
