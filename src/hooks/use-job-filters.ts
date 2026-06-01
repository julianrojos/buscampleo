import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import useSources from '@/hooks/use-sources';
import type { JobFilters, SortDir, SortField, UseJobFiltersReturn } from '@/types/filter';
import type { JobModality, JobStatus } from '@/types/job';
import type { CriteriaConfig } from '@/types/criteria';
import useCriteriaConfig from '@/hooks/use-criteria-config';
import {
  findWeightedSignalByExactPattern,
  getActiveWeightedSignals,
} from '@/lib/job-criteria';

export const DEFAULT_FILTERS: JobFilters = {
  query: '',
  source: [],
  modality: [],
  status: [],
  min_score: null,
  keywords: [],
  criteria: [],
  pending_analysis: false,
  show_hidden: false,
  show_criteria_hidden: false,
  sort: 'date',
  sort_dir: 'desc',
};

const VALID_MODALITIES: readonly JobModality[] = ['remote', 'hybrid', 'onsite', 'unknown'];
const VALID_STATUSES: readonly JobStatus[] = ['new', 'seen', 'saved', 'hidden', 'applied'];
const VALID_SORT_FIELDS: readonly SortField[] = ['date', 'score', 'company', 'source', 'modality'];
const VALID_SORT_DIRS: readonly SortDir[] = ['asc', 'desc'];

function parseBoolean(value: string | null): boolean {
  return value === 'true' || value === '1';
}

function parseNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArray(values: string[], allowed?: readonly string[]): string[] {
  const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  if (!allowed) {
    return uniqueValues;
  }

  return uniqueValues.filter((value) => allowed.includes(value));
}

export function parseFilters(
  searchParams: URLSearchParams,
  allowedSourceIds?: readonly string[],
  criteriaConfig?: CriteriaConfig,
): JobFilters {
  const sort = searchParams.get('sort');
  const sortDir = searchParams.get('sort_dir');
  const status = parseArray(searchParams.getAll('status'), VALID_STATUSES) as JobStatus[];
  const unreadOnly = parseBoolean(searchParams.get('unread_only'));
  const rawKeywords = parseArray(searchParams.getAll('keywords'));
  const activeSignals = criteriaConfig ? getActiveWeightedSignals(criteriaConfig) : [];
  const explicitCriteria = criteriaConfig
    ? parseArray(searchParams.getAll('criteria'), activeSignals.map((signal) => signal.id))
    : parseArray(searchParams.getAll('criteria'));
  const migratedCriteria = criteriaConfig
    ? Array.from(
        new Set(
          rawKeywords
            .map((keyword) => findWeightedSignalByExactPattern(keyword, criteriaConfig))
            .filter((signal): signal is NonNullable<typeof signal> => Boolean(signal))
            .map((signal) => signal.id),
        ),
      )
    : [];
  const criteria = Array.from(new Set([...explicitCriteria, ...migratedCriteria]));
  const keywords = criteriaConfig
    ? rawKeywords.filter((keyword) => !findWeightedSignalByExactPattern(keyword, criteriaConfig))
    : rawKeywords;

  return {
    query: searchParams.get('q')?.trim() ?? '',
    source: parseArray(searchParams.getAll('source'), allowedSourceIds),
    modality: parseArray(searchParams.getAll('modality'), VALID_MODALITIES) as JobModality[],
    status: status.length > 0 ? status : unreadOnly ? ['new'] : [],
    min_score: parseNumber(searchParams.get('min_score')),
    keywords,
    criteria,
    pending_analysis: parseBoolean(searchParams.get('pending_analysis')),
    show_hidden: parseBoolean(searchParams.get('show_hidden')),
    show_criteria_hidden: parseBoolean(searchParams.get('show_criteria_hidden')),
    sort: VALID_SORT_FIELDS.includes(sort as SortField)
      ? (sort as SortField)
      : DEFAULT_FILTERS.sort,
    sort_dir: VALID_SORT_DIRS.includes(sortDir as SortDir)
      ? (sortDir as SortDir)
      : DEFAULT_FILTERS.sort_dir,
  };
}

function setArrayValues(searchParams: URLSearchParams, key: string, values: string[]) {
  searchParams.delete(key);
  values.forEach((value) => searchParams.append(key, value));
}

export default function useJobFilters(): UseJobFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sources, isLoading: isSourcesLoading } = useSources();
  const { data: criteria } = useCriteriaConfig();

  const activeSourceIds = useMemo(() => {
    if (isSourcesLoading || !sources) {
      return undefined;
    }

    return sources.filter((source) => source.active).map((source) => source.id);
  }, [isSourcesLoading, sources]);

  const activeCriteriaConfig = useMemo(
    () => criteria ?? undefined,
    [criteria],
  );

  const filters = useMemo(
    () => parseFilters(searchParams, activeSourceIds, activeCriteriaConfig),
    [activeCriteriaConfig, activeSourceIds, searchParams],
  );

  useEffect(() => {
    if (!activeCriteriaConfig) {
      return;
    }

    const activeCriteriaIds = getActiveWeightedSignals(activeCriteriaConfig).map((signal) => signal.id);
    const currentKeywords = searchParams.getAll('keywords');
    const currentCriteria = searchParams.getAll('criteria');
    const migratedEntries = currentKeywords
      .map((keyword) => findWeightedSignalByExactPattern(keyword, activeCriteriaConfig))
      .filter((signal): signal is NonNullable<typeof signal> => Boolean(signal));

    if (migratedEntries.length === 0) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    const remainingKeywords = currentKeywords.filter(
      (keyword) => !findWeightedSignalByExactPattern(keyword, activeCriteriaConfig),
    );
    const nextCriteria = Array.from(
      new Set([...currentCriteria, ...migratedEntries.map((signal) => signal.id)]),
    ).filter((id) => activeCriteriaIds.includes(id));

    next.delete('keywords');
    remainingKeywords.forEach((keyword) => next.append('keywords', keyword));
    next.delete('criteria');
    nextCriteria.forEach((id) => next.append('criteria', id));

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeCriteriaConfig, searchParams, setSearchParams]);

  function setFilter<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      if (Array.isArray(value)) {
        if (value.length === 0) {
          next.delete(String(key));
        } else {
          setArrayValues(next, String(key), value.map(String));
        }
        return next;
      }

      if (typeof value === 'boolean') {
        if (value === DEFAULT_FILTERS[key]) {
          next.delete(String(key));
        } else {
          next.set(String(key), String(value));
        }
        return next;
      }

      if (value === null || value === '' || value === DEFAULT_FILTERS[key]) {
        next.delete(String(key));
        return next;
      }

      next.set(String(key), String(value));
      return next;
    });
  }

  function toggleFilterValues(
    key: 'modality' | 'source' | 'status' | 'keywords' | 'criteria',
    value: string,
  ) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      const currentValues = next.getAll(key);
      const compareCurrent =
        key === 'keywords' ? currentValues.map((currentValue) => currentValue.toLowerCase()) : currentValues;
      const compareValue = key === 'keywords' ? value.toLowerCase() : value;

      if (compareCurrent.includes(compareValue)) {
        const remainingValues = currentValues.filter(
          (currentValue) =>
            (key === 'keywords' ? currentValue.toLowerCase() : currentValue) !== compareValue,
        );
        if (remainingValues.length === 0) {
          next.delete(key);
        } else {
          setArrayValues(next, key, remainingValues);
        }
        return next;
      }

      next.append(key, value);
      return next;
    });
  }

  function removeFilter<K extends keyof JobFilters>(key: K) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(String(key));
      return next;
    });
  }

  function resetFilters() {
    setSearchParams({});
  }

  return {
    filters,
    setFilter,
    toggleFilter: toggleFilterValues,
    removeFilter,
    resetFilters,
  };
}
