import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getJobStore } from '@/data/job-store';
import type { Job } from '@/types/job';
import type { JobFilters } from '@/types/filter';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function matchText(job: Job, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const haystack = [
    job.title,
    job.company,
    job.description ?? '',
    job.summary ?? '',
    job.location ?? '',
    job.source_name,
    job.detected_keywords.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function matchKeywords(job: Job, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }

  const haystack = [
    job.title,
    job.company,
    job.description ?? '',
    job.summary ?? '',
    job.detected_keywords.join(' '),
    job.positive_signals.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return keywords.every((keyword) => haystack.includes(keyword.toLowerCase()));
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  const left = a ?? -1;
  const right = b ?? -1;
  return left - right;
}

function sortJobs(jobs: Job[], filters: JobFilters): Job[] {
  const direction = filters.sort_dir === 'asc' ? 1 : -1;

  return [...jobs].sort((left, right) => {
    let result = 0;

    if (filters.sort === 'score') {
      result = compareNullableNumbers(left.final_score, right.final_score);
    } else if (filters.sort === 'company') {
      result = left.company.localeCompare(right.company);
    } else if (filters.sort === 'source') {
      result = left.source_name.localeCompare(right.source_name);
    } else if (filters.sort === 'modality') {
      result = left.modality.localeCompare(right.modality);
    } else {
      const leftDate = left.published_at ?? left.created_at;
      const rightDate = right.published_at ?? right.created_at;
      result = new Date(leftDate).getTime() - new Date(rightDate).getTime();
    }

    return result * direction;
  });
}

function applyFilters(jobs: Job[], filters: JobFilters): Job[] {
  return sortJobs(
    jobs.filter((job) => {
      if (!filters.show_hidden && job.is_hidden) {
        return false;
      }

      if (filters.unread_only && job.is_read) {
        return false;
      }

      if (filters.pending_analysis && job.analysis_status === 'done') {
        return false;
      }

      if (filters.source.length > 0 && !filters.source.includes(job.source_id)) {
        return false;
      }

      if (filters.modality.length > 0 && !filters.modality.includes(job.modality)) {
        return false;
      }

      if (filters.min_score !== null && (job.final_score ?? 0) < filters.min_score) {
        return false;
      }

      if (!matchText(job, filters.query)) {
        return false;
      }

      if (!matchKeywords(job, filters.keywords)) {
        return false;
      }

      return true;
    }),
    filters,
  );
}

export default function useJobs(filters: JobFilters): UseQueryResult<Job[]> {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      await delay(300);
      return applyFilters([...getJobStore()], filters);
    },
    placeholderData: (previousData) => previousData,
  });
}
