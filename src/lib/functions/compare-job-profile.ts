import { z } from 'zod';

import { normalizeSearchText } from '../job-criteria';
import { mergeUniqueStrings } from './job-match-merge';
import type { JobMatch, UserProfile } from '../../types/account';
import type { Job } from '../../types/job';

export const CompareJobProfileBodySchema = z.object({
  jobId: z.string().min(1),
});

export const JobProfileComparisonSchema = z.object({
  overall_score: z.coerce.number().min(0).max(100),
  hard_skills_score: z.coerce.number().min(0).max(100),
  design_systems_score: z.coerce.number().min(0).max(100),
  css_bridge_score: z.coerce.number().min(0).max(100),
  culture_score: z.coerce.number().min(0).max(100),
  location_score: z.coerce.number().min(0).max(100),
  seniority_score: z.coerce.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  detected_keywords: z.array(z.string()).default([]),
  detected_skills: z.array(z.string()).default([]),
  explanation: z.string().min(1),
});

export type JobProfileComparison = z.infer<typeof JobProfileComparisonSchema>;

export interface ComparisonMatchFields {
  readonly summary: string | null;
  readonly strengths: string[];
  readonly gaps: string[];
  readonly recommendations: string[];
  readonly detected_keywords: string[];
  readonly detected_skills: string[];
}

const HARD_SKILL_TERMS = [
  'figma',
  'design systems',
  'design tokens',
  'storybook',
  'css',
  'html',
  'accessibility',
  'wcag',
  'react',
  'typescript',
  'tailwind',
  'developer handoff',
  'design to code',
];

const DESIGN_SYSTEM_TERMS = [
  'design systems',
  'design tokens',
  'storybook',
  'components',
  'component library',
  'figma variables',
];

const CSS_BRIDGE_TERMS = ['css', 'html', 'react', 'typescript', 'design to code', 'developer handoff'];

const CULTURE_TERMS = ['collaboration', 'product', 'engineering', 'accessibility', 'team', 'ownership'];

const LOCATION_TERMS = ['remote', 'hybrid', 'onsite', 'on-site', 'relocation', 'europe', 'spain', 'madrid'];

const SENIORITY_LEVELS = [
  { keywords: ['staff', 'principal', 'lead', 'head'], label: 'Senior' },
  { keywords: ['senior', 'sr.'], label: 'Senior' },
  { keywords: ['mid', 'mid-level', 'semi senior', 'semisenior'], label: 'Mid' },
  { keywords: ['junior', 'jr.', 'entry', 'graduate', 'trainee'], label: 'Junior' },
];

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildProfileText(profile: UserProfile): string {
  return normalizeSearchText(
    [
      profile.headline,
      profile.summary,
      profile.skills_text,
      profile.linkedin_url,
      profile.linkedin_text,
      profile.cv_extracted_text ?? '',
    ].join(' '),
  );
}

function buildJobText(job: Job): string {
  return normalizeSearchText(
    [
      job.title,
      job.company,
      job.description ?? '',
      job.location ?? '',
      job.language ?? '',
    ].join(' '),
  );
}

function findMatchedTerms(haystack: string, terms: readonly string[]): string[] {
  return terms.filter((term) => haystack.includes(normalizeSearchText(term)));
}

function detectSeniority(job: Job, profileText: string): string | null {
  const jobText = buildJobText(job);

  for (const level of SENIORITY_LEVELS) {
    if (level.keywords.some((keyword) => jobText.includes(normalizeSearchText(keyword)))) {
      return level.label;
    }
  }

  for (const level of SENIORITY_LEVELS) {
    if (level.keywords.some((keyword) => profileText.includes(normalizeSearchText(keyword)))) {
      return level.label;
    }
  }

  return null;
}

function scoreHardSkills(jobText: string, profileText: string): { score: number; matches: string[] } {
  const matches = unique([
    ...findMatchedTerms(jobText, HARD_SKILL_TERMS),
    ...findMatchedTerms(profileText, HARD_SKILL_TERMS),
  ]);

  return {
    score: Math.max(0, Math.min(100, 35 + matches.length * 10)),
    matches,
  };
}

function scoreDesignSystems(jobText: string, profileText: string): { score: number; matches: string[] } {
  const matches = unique([
    ...findMatchedTerms(jobText, DESIGN_SYSTEM_TERMS),
    ...findMatchedTerms(profileText, DESIGN_SYSTEM_TERMS),
  ]);

  return {
    score: Math.max(0, Math.min(100, 30 + matches.length * 12)),
    matches,
  };
}

function scoreCssBridge(jobText: string, profileText: string): { score: number; matches: string[] } {
  const matches = unique([
    ...findMatchedTerms(jobText, CSS_BRIDGE_TERMS),
    ...findMatchedTerms(profileText, CSS_BRIDGE_TERMS),
  ]);

  return {
    score: Math.max(0, Math.min(100, 35 + matches.length * 10)),
    matches,
  };
}

function scoreCulture(job: Job, profileText: string): { score: number; matches: string[] } {
  const jobText = buildJobText(job);
  const matches = unique([
    ...findMatchedTerms(jobText, CULTURE_TERMS),
    ...findMatchedTerms(profileText, CULTURE_TERMS),
  ]);

  return {
    score: Math.max(0, Math.min(100, 45 + matches.length * 6)),
    matches,
  };
}

function scoreLocation(job: Job, profileText: string): { score: number; matches: string[] } {
  const jobText = buildJobText(job);
  const matches = unique([
    ...findMatchedTerms(jobText, LOCATION_TERMS),
    ...findMatchedTerms(profileText, LOCATION_TERMS),
  ]);

  const modalityBase =
    job.modality === 'remote' ? 80 : job.modality === 'hybrid' ? 68 : job.modality === 'onsite' ? 54 : 60;

  return {
    score: Math.max(0, Math.min(100, modalityBase + matches.length * 4)),
    matches,
  };
}

function scoreSeniority(job: Job, profileText: string): { score: number; label: string | null } {
  const jobSeniority = detectSeniority(job, profileText);

  if (!jobSeniority) {
    return {
      score: 60,
      label: null,
    };
  }

  const matchedProfile = SENIORITY_LEVELS.find((level) =>
    level.keywords.some((keyword) => profileText.includes(normalizeSearchText(keyword))),
  )?.label;

  if (!matchedProfile) {
    return {
      score: jobSeniority === 'Senior' ? 72 : jobSeniority === 'Mid' ? 66 : 62,
      label: jobSeniority,
    };
  }

  const aligned = matchedProfile === jobSeniority;
  const score = aligned ? 82 : jobSeniority === 'Senior' && matchedProfile === 'Junior' ? 44 : 58;

  return {
    score,
    label: jobSeniority,
  };
}

function buildStrengths(
  hardSkills: readonly string[],
  designSystems: readonly string[],
  cssBridge: readonly string[],
  culture: readonly string[],
  location: readonly string[],
): string[] {
  return unique([...hardSkills, ...designSystems, ...cssBridge, ...culture, ...location]).slice(0, 8);
}

function buildGaps(job: Job, profileText: string, matchedSkills: readonly string[]): string[] {
  const requiredSkills = unique([...HARD_SKILL_TERMS]);
  const matchedSkillKeys = new Set(matchedSkills.map((skill) => normalizeSearchText(skill)));

  return requiredSkills
    .filter((skill) => !profileText.includes(normalizeSearchText(skill)))
    .filter((skill) => !matchedSkillKeys.has(normalizeSearchText(skill)))
    .slice(0, 6);
}

function buildRecommendations(gaps: readonly string[], seniorityLabel: string | null): string[] {
  const recommendations = [
    gaps[0] ? `Refuerza el encaje con ${gaps[0]} en CV y portfolio.` : null,
    gaps[1] ? `Añade un ejemplo concreto de ${gaps[1]} a tu resumen profesional.` : null,
    seniorityLabel
      ? `Alinea tu resumen con un rol ${seniorityLabel.toLowerCase()} si ese es tu objetivo.`
      : null,
  ].filter((value): value is string => Boolean(value));

  return recommendations.length > 0
    ? recommendations
    : ['El encaje es razonable; prepara ejemplos concretos y métricas del trabajo previo.'];
}

function buildExplanation(
  hardSkills: { readonly score: number; readonly matches: readonly string[] },
  designSystems: { readonly score: number; readonly matches: readonly string[] },
  cssBridge: { readonly score: number; readonly matches: readonly string[] },
  culture: { readonly score: number; readonly matches: readonly string[] },
  location: { readonly score: number; readonly matches: readonly string[] },
  seniority: { readonly score: number; readonly label: string | null },
  overallScore: number,
): string {
  return [
    `Hard skills: ${hardSkills.score}/100 (${hardSkills.matches.slice(0, 4).join(', ') || 'sin coincidencias claras'}).`,
    `Design systems: ${designSystems.score}/100 (${designSystems.matches.slice(0, 4).join(', ') || 'sin señales fuertes'}).`,
    `Bisagra CSS: ${cssBridge.score}/100 (${cssBridge.matches.slice(0, 4).join(', ') || 'sin señales fuertes'}).`,
    `Cultura: ${culture.score}/100 (${culture.matches.slice(0, 4).join(', ') || 'sin señales culturales'}).`,
    `Ubicación: ${location.score}/100 (${location.matches.slice(0, 4).join(', ') || 'sin señales de ubicación'}).`,
    seniority.label ? `Seniority: ${seniority.label} (${seniority.score}/100).` : `Seniority: no explicitado (${seniority.score}/100).`,
    `Score global: ${overallScore}/100.`,
  ].join(' ');
}

export function deriveJobProfileComparison(job: Job, profile: UserProfile): JobProfileComparison {
  const jobText = buildJobText(job);
  const profileText = buildProfileText(profile);
  const hardSkills = scoreHardSkills(jobText, profileText);
  const designSystems = scoreDesignSystems(jobText, profileText);
  const cssBridge = scoreCssBridge(jobText, profileText);
  const culture = scoreCulture(job, profileText);
  const location = scoreLocation(job, profileText);
  const seniority = scoreSeniority(job, profileText);
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        hardSkills.score * 0.3 +
          designSystems.score * 0.2 +
          cssBridge.score * 0.2 +
          culture.score * 0.1 +
          location.score * 0.1 +
          seniority.score * 0.1,
      ),
    ),
  );

  const matchedSkills = unique([
    ...hardSkills.matches,
    ...designSystems.matches,
    ...cssBridge.matches,
    ...culture.matches,
    ...location.matches,
  ]);
  const strengths = buildStrengths(
    hardSkills.matches,
    designSystems.matches,
    cssBridge.matches,
    culture.matches,
    location.matches,
  );
  const gaps = buildGaps(job, profileText, matchedSkills);

  return JobProfileComparisonSchema.parse({
    overall_score: overallScore,
    hard_skills_score: hardSkills.score,
    design_systems_score: designSystems.score,
    css_bridge_score: cssBridge.score,
    culture_score: culture.score,
    location_score: location.score,
    seniority_score: seniority.score,
    summary:
      strengths.length > 0
        ? `Encaje de ${overallScore}/100 con foco en ${strengths.slice(0, 3).join(', ')}.`
        : `Encaje de ${overallScore}/100 con señales limitadas de coincidencia.`,
    strengths,
    gaps,
    recommendations: buildRecommendations(gaps, seniority.label),
    detected_keywords: unique([...hardSkills.matches, ...designSystems.matches, ...cssBridge.matches]),
    detected_skills: unique([...hardSkills.matches, ...designSystems.matches, ...cssBridge.matches]),
    explanation: buildExplanation(
      hardSkills,
      designSystems,
      cssBridge,
      culture,
      location,
      seniority,
      overallScore,
    ),
  });
}

export function mergeComparisonIntoMatch(
  existing: Pick<
    JobMatch,
    | 'summary'
    | 'strengths'
    | 'gaps'
    | 'recommendations'
    | 'detected_keywords'
    | 'detected_skills'
  > | null
  | undefined,
  comparison: JobProfileComparison,
): ComparisonMatchFields {
  return {
    summary: comparison.summary,
    strengths: mergeUniqueStrings(comparison.strengths, existing?.strengths ?? []),
    gaps: mergeUniqueStrings(comparison.gaps, existing?.gaps ?? []),
    recommendations: mergeUniqueStrings(comparison.recommendations, existing?.recommendations ?? []),
    detected_keywords: mergeUniqueStrings(comparison.detected_keywords, existing?.detected_keywords ?? []),
    detected_skills: mergeUniqueStrings(comparison.detected_skills, existing?.detected_skills ?? []),
  };
}

export function buildCompareJobProfileSystemPrompt(): string {
  return [
    'Eres un evaluador de encaje entre una oferta y un perfil profesional para Buscampleo.',
    'Debes comparar el CV/LinkedIn con la oferta y devolver exclusivamente JSON válido.',
    'No inventes datos y prioriza la trazabilidad de cada score.',
    'Usa lenguaje claro en español para summary y explanation.',
  ].join(' ');
}

export function buildCompareJobProfilePrompt(job: Job, profile: UserProfile): string {
  return [
    'Compara esta oferta con este perfil y devuelve JSON con las claves exactas:',
    '{"overall_score":0,"hard_skills_score":0,"design_systems_score":0,"css_bridge_score":0,"culture_score":0,"location_score":0,"seniority_score":0,"summary":"","strengths":[],"gaps":[],"recommendations":[],"detected_keywords":[],"detected_skills":[],"explanation":""}',
    'Reglas:',
    '- overall_score: score global de encaje de 0 a 100.',
    '- hard_skills_score: coincidencia de skills y experiencia técnica.',
    '- design_systems_score: encaje con sistemas de diseño, componentes y tokens.',
    '- css_bridge_score: encaje entre diseño y CSS/HTML/código.',
    '- culture_score: señales de colaboración, claridad y madurez organizativa.',
    '- location_score: encaje de modalidad y ubicación.',
    '- seniority_score: encaje de seniority.',
    '- strengths: coincidencias más relevantes.',
    '- gaps: huecos o dudas importantes.',
    '- recommendations: acciones concretas para mejorar el encaje.',
    '- detected_keywords / detected_skills: términos detectados y compartidos.',
    '- summary: resumen breve del encaje.',
    '- explanation: explicación clara y trazable de cada score.',
    'Oferta:',
    JSON.stringify(
      {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        modality: job.modality,
        language: job.language,
        source_name: job.source_name,
        source_category: job.source_category,
      },
      null,
      2,
    ),
    'Perfil:',
    JSON.stringify(
      {
        headline: profile.headline,
        summary: profile.summary,
        skills_text: profile.skills_text,
        linkedin_url: profile.linkedin_url,
        linkedin_text: profile.linkedin_text,
        cv_extracted_text: profile.cv_extracted_text,
      },
      null,
      2,
    ),
  ].join('\n');
}
