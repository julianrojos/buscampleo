import {
  buildJobCriteriaHaystack,
  getActiveWeightedSignals,
  getMatchedHardExcludes,
  matchesCriterionPattern,
  normalizeSearchText,
} from './job-criteria';
import type { CriteriaConfig } from '../types/criteria';
import type { Job } from '../types/job';

export const JOB_SCORE_WEIGHTS = {
  source: 15,
  role: 20,
  maturity: 20,
  cssBridge: 20,
  culture: 10,
  match: 15,
} as const;

export type JobScoreComponentKey = keyof typeof JOB_SCORE_WEIGHTS;

export interface JobScoreComponent {
  readonly key: JobScoreComponentKey;
  readonly label: string;
  readonly weight: number;
  readonly score: number;
  readonly contribution: number;
  readonly reason: string;
}

export interface JobScoreBreakdown {
  readonly finalScore: number;
  readonly summary: string;
  readonly explanation: string;
  readonly components: readonly JobScoreComponent[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTerms(values: readonly string[]): string[] {
  return values.map((value) => normalizeSearchText(value));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildSourceScore(job: Job): JobScoreComponent {
  const score =
    job.source_quality_score ??
    ({
      'design-systems': 92,
      'design-engineering': 88,
      'niche-design': 84,
      remote: 76,
      newsletter: 70,
      community: 66,
      generalist: 60,
      'ats-direct': 68,
    } as const)[job.source_category as keyof Record<string, number>] ??
    60;

  const reason = job.source_quality_score
    ? `source_quality_score=${job.source_quality_score}.`
    : `source_category=${job.source_category} con score base ${score}.`;

  return {
    key: 'source',
    label: 'Fuente',
    weight: JOB_SCORE_WEIGHTS.source,
    score: clampScore(score),
    contribution: 0,
    reason,
  };
}

function buildRoleScore(job: Job, criteria: CriteriaConfig): JobScoreComponent {
  const haystack = buildJobCriteriaHaystack(job);
  const roles = criteria.target_roles.filter((role) => role.active);
  const matchedRoles = roles.filter((role) =>
    normalizeTerms([role.label]).some((needle) => haystack.includes(needle)),
  );

  const hasDesignerLanguage = haystack.includes('designer');
  const hasEngineerLanguage = haystack.includes('engineer');
  const sourceBoost =
    job.source_category === 'design-systems' || job.source_category === 'design-engineering'
      ? 6
      : 0;

  const score = clampScore(
    matchedRoles.length > 0
      ? 70 + matchedRoles.length * 10 + sourceBoost
      : hasDesignerLanguage || hasEngineerLanguage
        ? 60 + sourceBoost
        : 48 + sourceBoost,
  );

  const reason = matchedRoles.length > 0
    ? `Roles objetivo detectados: ${matchedRoles.map((role) => role.label).join(', ')}.`
    : hasDesignerLanguage || hasEngineerLanguage
      ? 'La oferta usa lenguaje de diseño/ingeniería, pero no clava un target role concreto.'
      : 'No hay señales fuertes de rol objetivo en el título o la descripción.';

  return {
    key: 'role',
    label: 'Rol',
    weight: JOB_SCORE_WEIGHTS.role,
    score,
    contribution: 0,
    reason,
  };
}

function buildMaturityScore(job: Job, criteria: CriteriaConfig): JobScoreComponent {
  const haystack = buildJobCriteriaHaystack(job);
  const positiveSignals = getActiveWeightedSignals(criteria).filter(
    (signal) =>
      (signal.category === 'maturity' || signal.category === 'collaboration') &&
      matchesCriterionPattern(haystack, signal.pattern),
  );
  const negativeSignals = getActiveWeightedSignals(criteria).filter(
    (signal) =>
      signal.weight < 0 &&
      (signal.category === 'maturity' || signal.category === 'modality' || signal.category === 'exclusion') &&
      matchesCriterionPattern(haystack, signal.pattern),
  );
  const hardExcludes = getMatchedHardExcludes(job, criteria);

  const score = clampScore(
    60 +
      positiveSignals.length * 8 -
      negativeSignals.length * 10 -
      hardExcludes.length * 22 -
      (job.description ? 0 : 8),
  );

  const reason = [
    positiveSignals.length > 0
      ? `Señales maduras: ${positiveSignals.map((signal) => signal.pattern).slice(0, 3).join(', ')}.`
      : 'Sin señales maduras fuertes.',
    negativeSignals.length > 0
      ? `Señales de ruido: ${negativeSignals.map((signal) => signal.pattern).slice(0, 3).join(', ')}.`
      : 'Sin señales negativas relevantes.',
    hardExcludes.length > 0
      ? `Exclusiones activas: ${hardExcludes.map((criterion) => criterion.pattern).join(', ')}.`
      : 'Sin exclusiones activas.',
  ].join(' ');

  return {
    key: 'maturity',
    label: 'Madurez',
    weight: JOB_SCORE_WEIGHTS.maturity,
    score,
    contribution: 0,
    reason,
  };
}

function buildCssBridgeScore(job: Job, criteria: CriteriaConfig): JobScoreComponent {
  const haystack = buildJobCriteriaHaystack(job);
  const positiveSignals = getActiveWeightedSignals(criteria).filter(
    (signal) =>
      signal.category === 'design-code' && matchesCriterionPattern(haystack, signal.pattern),
  );
  const directKeywords = unique([
    ...(haystack.includes('css') ? ['CSS'] : []),
    ...(haystack.includes('html') ? ['HTML'] : []),
    ...(haystack.includes('storybook') ? ['Storybook'] : []),
    ...(haystack.includes('design to code') || haystack.includes('developer handoff')
      ? ['design-to-code']
      : []),
  ]);

  const score = clampScore(
    42 + positiveSignals.length * 10 + directKeywords.length * 6 - (job.red_flags.length > 0 ? 4 : 0),
  );

  const reason = [
    positiveSignals.length > 0
      ? `Señales design-code: ${positiveSignals.map((signal) => signal.pattern).slice(0, 3).join(', ')}.`
      : 'No hay señales explícitas de diseño a código.',
    directKeywords.length > 0
      ? `Keywords puente CSS/HTML: ${directKeywords.join(', ')}.`
      : 'No hay keywords puente claras.',
  ].join(' ');

  return {
    key: 'cssBridge',
    label: 'Bisagra CSS',
    weight: JOB_SCORE_WEIGHTS.cssBridge,
    score,
    contribution: 0,
    reason,
  };
}

function buildCultureScore(job: Job, criteria: CriteriaConfig): JobScoreComponent {
  const haystack = buildJobCriteriaHaystack(job);
  const collaborationSignals = getActiveWeightedSignals(criteria).filter(
    (signal) => signal.category === 'collaboration' && matchesCriterionPattern(haystack, signal.pattern),
  );
  const directKeywords = unique([
    ...(haystack.includes('collaboration') ? ['collaboration'] : []),
    ...(haystack.includes('product') ? ['product'] : []),
    ...(haystack.includes('engineering') ? ['engineering'] : []),
    ...(haystack.includes('team') ? ['team'] : []),
    ...(haystack.includes('accessibility') ? ['accessibility'] : []),
  ]);

  const score = clampScore(
    48 +
      collaborationSignals.length * 10 +
      directKeywords.length * 4 -
      job.red_flags.length * 5 -
      (job.description ? 0 : 4),
  );

  const reason = [
    collaborationSignals.length > 0
      ? `Señales de colaboración: ${collaborationSignals.map((signal) => signal.pattern).slice(0, 3).join(', ')}.`
      : 'No hay señales fuertes de colaboración.',
    directKeywords.length > 0
      ? `Claves culturales: ${directKeywords.join(', ')}.`
      : 'No hay keywords culturales destacadas.',
    job.red_flags.length > 0 ? `Red flags: ${job.red_flags.slice(0, 3).join(', ')}.` : 'Sin red flags relevantes.',
  ].join(' ');

  return {
    key: 'culture',
    label: 'Cultura',
    weight: JOB_SCORE_WEIGHTS.culture,
    score,
    contribution: 0,
    reason,
  };
}

function buildMatchScore(job: Job): JobScoreComponent {
  const score = clampScore(job.profile_match_score ?? job.semantic_score ?? job.keyword_score ?? 0);
  const reason = job.profile_match_score !== null
    ? `profile_match_score=${job.profile_match_score}.`
    : job.semantic_score !== null
      ? `semantic_score=${job.semantic_score} como fallback de match.`
      : job.keyword_score !== null
        ? `keyword_score=${job.keyword_score} como fallback de match.`
        : 'Sin score de match disponible todavía.';

  return {
    key: 'match',
    label: 'Match',
    weight: JOB_SCORE_WEIGHTS.match,
    score,
    contribution: 0,
    reason,
  };
}

export function calculateJobScore(job: Job, criteria: CriteriaConfig): JobScoreBreakdown {
  const components = [
    buildSourceScore(job),
    buildRoleScore(job, criteria),
    buildMaturityScore(job, criteria),
    buildCssBridgeScore(job, criteria),
    buildCultureScore(job, criteria),
    buildMatchScore(job),
  ].map((component) => ({
    ...component,
    contribution: (component.score * component.weight) / 100,
  }));

  const finalScore = clampScore(
    components.reduce((total, component) => total + component.contribution, 0),
  );

  return {
    finalScore,
    summary: `Score final ${finalScore}/100 con foco en ${components
      .map((component) => `${component.label.toLowerCase()} ${component.score}`)
      .join(', ')}.`,
    explanation: components
      .map(
        (component) =>
          `${component.label} (${component.weight}%): ${component.score}/100. ${component.reason}`,
      )
      .join(' '),
    components,
  };
}
