import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import useSources from '@/hooks/use-sources';
import type { JobFilters, SortDir, SortField, UseJobFiltersReturn } from '@/types/filter';
import type { JobModality } from '@/types/job';

export const DEFAULT_FILTERS: JobFilters = {
  query: '',
  source: [],
  modality: [],
  min_score: null,
  keywords: [],
  unread_only: false,
  pending_analysis: false,
  show_hidden: false,
  sort: 'date',
  sort_dir: 'desc',
};

const VALID_MODALITIES: readonly JobModality[] = ['remote', 'hybrid', 'onsite', 'unknown'];
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
): JobFilters {
  const sort = searchParams.get('sort');
  const sortDir = searchParams.get('sort_dir');

  return {
    query: searchParams.get('q')?.trim() ?? '',
    source: parseArray(searchParams.getAll('source'), allowedSourceIds),
    modality: parseArray(searchParams.getAll('modality'), VALID_MODALITIES) as JobModality[],
    min_score: parseNumber(searchParams.get('min_score')),
    keywords: parseArray(searchParams.getAll('keywords')),
    unread_only: parseBoolean(searchParams.get('unread_only')),
    pending_analysis: parseBoolean(searchParams.get('pending_analysis')),
    show_hidden: parseBoolean(searchParams.get('show_hidden')),
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

  const activeSourceIds = useMemo(() => {
    if (isSourcesLoading || !sources) {
      return undefined;
    }

    return sources.filter((source) => source.active).map((source) => source.id);
  }, [isSourcesLoading, sources]);

  const filters = useMemo(
    () => parseFilters(searchParams, activeSourceIds),
    [activeSourceIds, searchParams],
  );

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

  function toggleFilter(key: 'modality' | 'source' | 'keywords', value: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      const currentValues = next.getAll(key);

      if (currentValues.includes(value)) {
        const remainingValues = currentValues.filter((currentValue) => currentValue !== value);
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
    toggleFilter,
    removeFilter,
    resetFilters,
  };
}
