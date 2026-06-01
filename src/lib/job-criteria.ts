import type { CriteriaConfig, HardExcludeCriterion, WeightedSignalCriterion } from '../types/criteria';
import type { Job } from '../types/job';

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function splitCriterionPattern(pattern: string): string[] {
  return normalizeSearchText(pattern)
    .split(/\s*[/|]\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildJobCriteriaHaystack(job: Job): string {
  return normalizeSearchText(
    [
      job.title,
      job.company,
      job.description ?? '',
      job.summary ?? '',
      job.location ?? '',
      job.seniority ?? '',
      job.language ?? '',
      job.source_name,
      job.source_category,
      job.positive_signals.join(' '),
      job.red_flags.join(' '),
      job.detected_skills.join(' '),
      job.detected_keywords.join(' '),
    ].join(' '),
  );
}

function buildSourceHaystack(job: Job): string {
  return normalizeSearchText(
    [
      job.title,
      job.company,
      job.description ?? '',
      job.summary ?? '',
      job.location ?? '',
      job.seniority ?? '',
      job.language ?? '',
      job.source_name,
      job.source_category,
      job.detected_keywords.join(' '),
    ].join(' '),
  );
}

export function matchesCriterionPattern(haystack: string, pattern: string): boolean {
  const normalizedHaystack = normalizeSearchText(haystack);
  return splitCriterionPattern(pattern).some((needle) => normalizedHaystack.includes(needle));
}

export function getActiveWeightedSignals(criteria: CriteriaConfig): WeightedSignalCriterion[] {
  return criteria.weighted_signals.filter((signal) => signal.active);
}

export function findWeightedSignalById(
  id: string,
  criteria: CriteriaConfig,
): WeightedSignalCriterion | undefined {
  return criteria.weighted_signals.find((signal) => signal.active && signal.id === id);
}

export function findWeightedSignalByExactPattern(
  keyword: string,
  criteria: CriteriaConfig,
): WeightedSignalCriterion | undefined {
  const normalizedKeyword = normalizeSearchText(keyword);

  return criteria.weighted_signals.find(
    (signal) => signal.active && normalizeSearchText(signal.pattern) === normalizedKeyword,
  );
}

export function findWeightedSignalByKeyword(
  keyword: string,
  criteria: CriteriaConfig,
): WeightedSignalCriterion | undefined {
  const normalizedKeyword = normalizeSearchText(keyword);

  return criteria.weighted_signals.find(
    (signal) =>
      signal.active &&
      (normalizeSearchText(signal.pattern) === normalizedKeyword ||
        splitCriterionPattern(signal.pattern).includes(normalizedKeyword)),
  );
}

export function getMatchedHardExcludes(
  job: Job,
  criteria: CriteriaConfig,
): HardExcludeCriterion[] {
  const haystack = buildSourceHaystack(job);

  return criteria.hard_excludes.filter(
    (criterion) => criterion.active && matchesCriterionPattern(haystack, criterion.pattern),
  );
}

export function shouldHideJobByCriteria(job: Job, criteria: CriteriaConfig): boolean {
  return getMatchedHardExcludes(job, criteria).length > 0;
}
