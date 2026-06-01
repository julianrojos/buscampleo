import { z } from 'zod';

import { mergeUniqueStrings } from './job-match-merge';
import type { Job } from '../../types/job';

export const AnalyzeJobBodySchema = z.object({
  jobId: z.string().min(1),
});

export const JobAnalysisSchema = z.object({
  role: z.string().min(1),
  seniority: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  positive_signals: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  detected_keywords: z.array(z.string()).default([]),
  summary: z.string().min(1),
  analysis_score: z.coerce.number().min(0).max(100),
  explanation: z.string().min(1),
});

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

const ROLE_PATTERNS = [
  { pattern: ['design systems', 'design-system', 'design system'], role: 'Design Systems Designer' },
  { pattern: ['design engineer', 'design engineering'], role: 'Design Engineer' },
  { pattern: ['ui engineer', 'ui engineering'], role: 'UI Engineer' },
  { pattern: ['product designer', 'product design'], role: 'Product Designer' },
  { pattern: ['ui designer'], role: 'UI Designer' },
  { pattern: ['ux designer', 'ux/ui'], role: 'UX Designer' },
  { pattern: ['design ops', 'design operations'], role: 'Design Ops' },
];

const SKILL_PATTERNS = [
  'figma',
  'design systems',
  'design tokens',
  'tokens',
  'storybook',
  'css',
  'html',
  'accessibility',
  'wcag',
  'react',
  'typescript',
  'tailwind',
  'component library',
  'developer handoff',
  'design to code',
  'collaboration',
  'product',
];

const SENIORITY_PATTERNS = [
  { pattern: ['staff', 'principal', 'lead', 'head'], label: 'Senior' },
  { pattern: ['senior', 'sr.'], label: 'Senior' },
  { pattern: ['mid', 'mid-level', 'semi senior', 'semisenior'], label: 'Mid' },
  { pattern: ['junior', 'jr.', 'entry', 'graduate', 'trainee'], label: 'Junior' },
];

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function includesAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function isFirstAnalysisPass(job: Job): boolean {
  return job.analysis_status === 'pending';
}

function detectRole(job: Job): string {
  const text = normalizeText(
    [
      job.title,
      job.description ?? '',
      ...(isFirstAnalysisPass(job) ? [job.seniority ?? ''] : []),
    ].join(' '),
  );

  for (const candidate of ROLE_PATTERNS) {
    if (includesAny(text, candidate.pattern.map((pattern) => normalizeText(pattern)))) {
      return candidate.role;
    }
  }

  if (text.includes('designer')) {
    return 'Designer';
  }

  return 'Oferta de diseño';
}

function detectSeniority(job: Job): string | null {
  const text = normalizeText(
    [job.title, job.description ?? '', ...(isFirstAnalysisPass(job) ? [job.seniority ?? ''] : [])].join(' '),
  );

  for (const candidate of SENIORITY_PATTERNS) {
    if (includesAny(text, candidate.pattern.map((pattern) => normalizeText(pattern)))) {
      return candidate.label;
    }
  }

  return null;
}

function detectSkills(job: Job): string[] {
  const haystack = normalizeText(
    [
      job.title,
      job.description ?? '',
      ...(isFirstAnalysisPass(job) ? [job.detected_skills.join(' '), job.detected_keywords.join(' ')] : []),
    ].join(' '),
  );

  return unique([
    ...(isFirstAnalysisPass(job) ? [...job.detected_skills] : []),
    ...SKILL_PATTERNS.filter((pattern) => haystack.includes(normalizeText(pattern))),
  ]);
}

function detectPositiveSignals(job: Job, role: string): string[] {
  return unique([
    ...(isFirstAnalysisPass(job) ? [...job.positive_signals] : []),
    ...(role !== 'Oferta de diseño' ? [role] : []),
  ]);
}

function detectRedFlags(job: Job): string[] {
  return unique([
    ...(isFirstAnalysisPass(job) ? [...job.red_flags] : []),
    ...(job.description ? [] : ['Descripción incompleta']),
  ]);
}

function calculateAnalysisScore(positiveSignals: readonly string[], redFlags: readonly string[]): number {
  const score = 55 + positiveSignals.length * 4 - redFlags.length * 7;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildAnalysisSummary(
  job: Job,
  role: string,
  seniority: string | null,
  skills: readonly string[],
  redFlags: readonly string[],
): string {
  const skillSnippet = skills.slice(0, 3).join(', ');
  const flagSnippet = redFlags.slice(0, 2).join(', ');

  const parts = [
    `${role}${seniority ? ` (${seniority})` : ''} en ${job.company}.`,
    skillSnippet ? `Señales clave: ${skillSnippet}.` : null,
    flagSnippet ? `Alertas: ${flagSnippet}.` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

function buildAnalysisExplanation(
  role: string,
  seniority: string | null,
  skills: readonly string[],
  positiveSignals: readonly string[],
  redFlags: readonly string[],
  analysisScore: number,
): string {
  const fragments = [
    `Rol probable: ${role}.`,
    seniority ? `Seniority probable: ${seniority}.` : 'Seniority no explicitado.',
    skills.length > 0 ? `Skills detectadas: ${skills.slice(0, 6).join(', ')}.` : 'No hay skills explícitas.',
    positiveSignals.length > 0
      ? `Señales positivas: ${positiveSignals.slice(0, 4).join(', ')}.`
      : 'No hay señales positivas destacadas.',
    redFlags.length > 0
      ? `Red flags: ${redFlags.slice(0, 4).join(', ')}.`
      : 'No hay red flags relevantes.',
    `Score de análisis: ${analysisScore}/100.`,
  ];

  return fragments.join(' ');
}

export function deriveJobAnalysis(job: Job): JobAnalysis {
  const role = detectRole(job);
  const seniority = detectSeniority(job);
  const skills = detectSkills(job);
  const positiveSignals = detectPositiveSignals(job, role);
  const redFlags = detectRedFlags(job);
  const detectedKeywords = unique([
    ...(isFirstAnalysisPass(job) ? [...job.detected_keywords] : []),
    ...skills,
  ]);
  const analysisScore = calculateAnalysisScore(positiveSignals, redFlags);

  return JobAnalysisSchema.parse({
    role,
    seniority,
    skills,
    positive_signals: positiveSignals,
    red_flags: redFlags,
    detected_keywords: detectedKeywords,
    summary: buildAnalysisSummary(job, role, seniority, skills, redFlags),
    analysis_score: analysisScore,
    explanation: buildAnalysisExplanation(
      role,
      seniority,
      skills,
      positiveSignals,
      redFlags,
      analysisScore,
    ),
  });
}

export function mergeAnalysisIntoMatch(
  existing: {
    readonly summary: string | null;
    readonly strengths: readonly string[];
    readonly gaps: readonly string[];
    readonly recommendations: readonly string[];
    readonly detected_keywords: readonly string[];
    readonly detected_skills: readonly string[];
  } | null
  | undefined,
  analysis: JobAnalysis,
): {
  readonly summary: string;
  readonly strengths: string[];
  readonly gaps: string[];
  readonly recommendations: string[];
  readonly detected_keywords: string[];
  readonly detected_skills: string[];
  } {
  return {
    summary: analysis.summary,
    strengths: [...(existing?.strengths ?? [])],
    gaps: [...(existing?.gaps ?? [])],
    recommendations: [...(existing?.recommendations ?? [])],
    detected_keywords: mergeUniqueStrings(analysis.detected_keywords, existing?.detected_keywords ?? []),
    detected_skills: mergeUniqueStrings(analysis.skills, existing?.detected_skills ?? []),
  };
}

export function buildAnalyzeJobSystemPrompt(): string {
  return [
    'Eres un analista de ofertas de trabajo para Buscampleo.',
    'Debes extraer señales observables de una oferta y devolver exclusivamente JSON válido.',
    'No inventes datos que no estén en la oferta.',
    'Usa lenguaje claro en español para summary y explanation.',
  ].join(' ');
}

export function buildAnalyzeJobPrompt(job: Job): string {
  return [
    'Analiza esta oferta y devuelve JSON con las claves exactas:',
    '{"role":"","seniority":null,"skills":[],"positive_signals":[],"red_flags":[],"detected_keywords":[],"summary":"","analysis_score":0,"explanation":""}',
    'Reglas:',
    '- role: rol principal detectado en la oferta.',
    '- seniority: Junior, Mid, Senior o null si no está claro.',
    '- skills: lista breve de skills explícitas o inferibles de forma segura.',
    '- positive_signals: señales positivas relevantes.',
    '- red_flags: alertas u observaciones negativas.',
    '- detected_keywords: keywords relevantes detectadas.',
    '- summary: resumen de una o dos frases.',
    '- analysis_score: puntuación de 0 a 100 sobre la calidad/claridad de la oferta.',
    '- explanation: justificación breve y transparente.',
    'Oferta:',
    JSON.stringify(
      {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        modality: job.modality,
        ...(job.analysis_status === 'pending'
          ? {
              seniority: job.seniority,
              positive_signals: job.positive_signals,
              red_flags: job.red_flags,
              detected_skills: job.detected_skills,
              detected_keywords: job.detected_keywords,
            }
          : {}),
        language: job.language,
        source_name: job.source_name,
        source_category: job.source_category,
      },
      null,
      2,
    ),
  ].join('\n');
}
