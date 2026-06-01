import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AnalyzeJobBodySchema,
  buildAnalyzeJobPrompt,
  buildAnalyzeJobSystemPrompt,
  deriveJobAnalysis,
  mergeAnalysisIntoMatch,
} from './analyze-job';

test('AnalyzeJobBodySchema validates the payload contract', () => {
  assert.equal(AnalyzeJobBodySchema.safeParse({ jobId: 'job-123' }).success, true);
  assert.equal(AnalyzeJobBodySchema.safeParse({}).success, false);
});

test('deriveJobAnalysis extracts a stable summary and score', () => {
  const job = {
    id: 'job-123',
    title: 'Senior Design Systems Designer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'We are hiring a Design Systems designer with Figma, CSS, Storybook and engineering collaboration.',
    summary: null,
    location: 'Remote',
    modality: 'remote' as const,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority: null,
    language: 'en',
    source_id: 'source-123',
    source_name: 'Acme Careers',
    source_category: 'design-systems',
    published_at: null,
    first_seen_at: '2026-06-01T00:00:00.000Z',
    last_seen_at: '2026-06-01T00:00:00.000Z',
    scraped_at: null,
    status: 'new' as const,
    analysis_status: 'pending' as const,
    is_read: false,
    is_saved: false,
    is_hidden: false,
    source_quality_score: null,
    keyword_score: null,
    semantic_score: null,
    profile_match_score: null,
    final_score: null,
    positive_signals: ['Design Systems', 'Accessibility'],
    red_flags: ['equity only'],
    detected_skills: ['Figma'],
    detected_keywords: ['design systems'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const analysis = deriveJobAnalysis(job);

  assert.equal(analysis.role, 'Design Systems Designer');
  assert.equal(analysis.seniority, 'Senior');
  assert.ok(analysis.skills.includes('figma'));
  assert.ok(analysis.positive_signals.includes('Accessibility'));
  assert.deepEqual(analysis.red_flags, ['equity only']);
  assert.ok(analysis.analysis_score > 0);
  assert.match(analysis.summary, /Design Systems Designer/);
  assert.match(buildAnalyzeJobPrompt(job), /analysis_score/);
  assert.match(buildAnalyzeJobSystemPrompt(), /JSON válido/);
});

test('deriveJobAnalysis ignores previously analyzed fields once done', () => {
  const baseJob = {
    id: 'job-123',
    title: 'Senior Design Systems Designer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'We are hiring a Design Systems designer with Figma, CSS, Storybook and engineering collaboration.',
    summary: null,
    location: 'Remote',
    modality: 'remote' as const,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority: null,
    language: 'en',
    source_id: 'source-123',
    source_name: 'Acme Careers',
    source_category: 'design-systems',
    published_at: null,
    first_seen_at: '2026-06-01T00:00:00.000Z',
    last_seen_at: '2026-06-01T00:00:00.000Z',
    scraped_at: null,
    status: 'new' as const,
    analysis_status: 'pending' as const,
    is_read: false,
    is_saved: false,
    is_hidden: false,
    source_quality_score: null,
    keyword_score: null,
    semantic_score: null,
    profile_match_score: null,
    final_score: null,
    positive_signals: ['Design Systems', 'Accessibility'],
    red_flags: ['equity only'],
    detected_skills: ['Figma'],
    detected_keywords: ['design systems'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const analysisA = deriveJobAnalysis({
    ...baseJob,
    analysis_status: 'done',
    summary: 'Changed by analysis',
    seniority: 'Mid',
    positive_signals: ['Accessibility'],
    red_flags: ['equity only'],
    detected_skills: ['Accessibility', 'Tailwind'],
    detected_keywords: ['accessibility', 'tailwind'],
  });
  const analysisB = deriveJobAnalysis({
    ...baseJob,
    analysis_status: 'done',
    summary: 'Another analysis summary',
    seniority: 'Junior',
    positive_signals: ['Design Systems'],
    red_flags: ['rockstar culture', 'equity only'],
    detected_skills: ['Design Systems', 'CSS'],
    detected_keywords: ['design systems', 'css'],
  });

  assert.deepEqual(analysisB, analysisA);
});

test('buildAnalyzeJobPrompt includes scraper fields only on the first run', () => {
  const job = {
    id: 'job-123',
    title: 'Senior Design Systems Designer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'We are hiring a Design Systems designer with Figma, CSS, Storybook and engineering collaboration.',
    summary: null,
    location: 'Remote',
    modality: 'remote' as const,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority: 'Senior',
    language: 'en',
    source_id: 'source-123',
    source_name: 'Acme Careers',
    source_category: 'design-systems',
    published_at: null,
    first_seen_at: '2026-06-01T00:00:00.000Z',
    last_seen_at: '2026-06-01T00:00:00.000Z',
    scraped_at: null,
    status: 'new' as const,
    analysis_status: 'pending' as const,
    is_read: false,
    is_saved: false,
    is_hidden: false,
    source_quality_score: null,
    keyword_score: null,
    semantic_score: null,
    profile_match_score: null,
    final_score: null,
    positive_signals: ['Design Systems', 'Accessibility'],
    red_flags: ['equity only'],
    detected_skills: ['Figma'],
    detected_keywords: ['design systems'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const pendingPayload = buildAnalyzeJobPrompt(job).split('Oferta:\n')[1] ?? '';
  const donePayload = buildAnalyzeJobPrompt({
    ...job,
    analysis_status: 'done',
  }).split('Oferta:\n')[1] ?? '';

  assert.match(pendingPayload, /positive_signals/);
  assert.match(pendingPayload, /detected_skills/);
  assert.match(pendingPayload, /seniority/);
  assert.doesNotMatch(donePayload, /positive_signals/);
  assert.doesNotMatch(donePayload, /detected_skills/);
  assert.doesNotMatch(donePayload, /seniority/);
});

test('mergeAnalysisIntoMatch preserves previous comparison output', () => {
  const merged = mergeAnalysisIntoMatch(
    {
      summary: 'comparison summary',
      strengths: ['Design Systems'],
      gaps: ['Portfolio gap'],
      recommendations: ['Add a design-to-code example'],
      detected_keywords: ['design systems'],
      detected_skills: ['Figma'],
    },
    {
      role: 'Design Systems Designer',
      seniority: 'Senior',
      skills: ['figma', 'css'],
      positive_signals: ['Design Systems', 'Accessibility'],
      red_flags: ['equity only'],
      detected_keywords: ['design systems', 'css'],
      summary: 'analysis summary',
      analysis_score: 80,
      explanation: 'Analysis explanation.',
    },
  );

  assert.equal(merged.summary, 'analysis summary');
  assert.deepEqual(merged.strengths, ['Design Systems']);
  assert.deepEqual(merged.gaps, ['Portfolio gap']);
  assert.deepEqual(merged.recommendations, ['Add a design-to-code example']);
  assert.deepEqual(merged.detected_keywords, ['design systems', 'css']);
  assert.deepEqual(merged.detected_skills, ['figma', 'css']);
});
