import type { JobModality } from './job';

export type SortField = 'date' | 'score' | 'company' | 'source' | 'modality';

export type SortDir = 'asc' | 'desc';

export interface JobFilters {
  readonly query: string;
  readonly source: string[];
  readonly modality: JobModality[];
  readonly min_score: number | null;
  readonly keywords: string[];
  readonly unread_only: boolean;
  readonly pending_analysis: boolean;
  readonly show_hidden: boolean;
  readonly sort: SortField;
  readonly sort_dir: SortDir;
}

export interface UseJobFiltersReturn {
  readonly filters: JobFilters;
  setFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  toggleFilter: (
    key: 'modality' | 'source' | 'keywords',
    value: string,
  ) => void;
  removeFilter: <K extends keyof JobFilters>(key: K) => void;
  resetFilters: () => void;
}
