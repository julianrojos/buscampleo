import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CompareJobProfileBodySchema,
  buildCompareJobProfilePrompt,
  buildCompareJobProfileSystemPrompt,
  deriveJobProfileComparison,
  mergeComparisonIntoMatch,
} from './compare-job-profile';

test('CompareJobProfileBodySchema validates the payload contract', () => {
  assert.equal(CompareJobProfileBodySchema.safeParse({ jobId: 'job-123' }).success, true);
  assert.equal(CompareJobProfileBodySchema.safeParse({}).success, false);
});

test('deriveJobProfileComparison produces a transparent match breakdown', () => {
  const job = {
    id: 'job-123',
    title: 'Senior UI Engineer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'Looking for a UI Engineer with Design Systems, CSS, HTML, Storybook and design to code collaboration.',
    summary: 'Builds UI infrastructure and component libraries.',
    location: 'Remote',
    modality: 'remote' as const,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority: 'Senior',
    language: 'en',
    source_id: 'source-123',
    source_name: 'Acme Careers',
    source_category: 'design-engineering',
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
    positive_signals: ['Design Systems', 'Engineering collaboration', 'Storybook'],
    red_flags: [],
    detected_skills: ['Figma', 'CSS', 'HTML'],
    detected_keywords: ['design systems', 'storybook'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const profile = {
    id: 'profile-123',
    owner_id: 'owner-123',
    headline: 'Senior UI / Design Systems',
    summary: 'Figma, Design Systems, CSS, HTML, React, collaboration with engineering.',
    skills_text: 'Figma, Design Systems, CSS, HTML, React, TypeScript',
    linkedin_url: 'https://linkedin.com/in/example',
    linkedin_text: 'Design systems and design-to-code work with teams.',
    cv_file_name: null,
    cv_storage_path: null,
    cv_extracted_text: 'Worked on component libraries, Storybook and CSS architecture.',
    cv_uploaded_at: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const comparison = deriveJobProfileComparison(job, profile);

  assert.ok(comparison.overall_score > 0);
  assert.ok(comparison.hard_skills_score >= comparison.design_systems_score - 30);
  assert.ok(comparison.strengths.length > 0);
  assert.ok(comparison.detected_skills.includes('figma'));
  assert.ok(comparison.summary.includes(String(comparison.overall_score)));
  assert.match(buildCompareJobProfilePrompt(job, profile), /overall_score/);
  assert.match(buildCompareJobProfileSystemPrompt(), /JSON válido/);
});

test('mergeComparisonIntoMatch preserves previously analyzed fields', () => {
  const merged = mergeComparisonIntoMatch(
    {
      summary: 'analysis summary',
      strengths: ['Design Systems', 'Figma'],
      gaps: ['No salary listed'],
      recommendations: ['Review compensation'],
      detected_keywords: ['design systems'],
      detected_skills: ['Figma'],
    },
    {
      overall_score: 82,
      hard_skills_score: 76,
      design_systems_score: 88,
      css_bridge_score: 84,
      culture_score: 70,
      location_score: 90,
      seniority_score: 68,
      summary: 'comparison summary',
      strengths: ['CSS'],
      gaps: ['Portfolio gap'],
      recommendations: ['Add a design-to-code example'],
      detected_keywords: ['css'],
      detected_skills: ['CSS'],
      explanation: 'Transparent breakdown.',
    },
  );

  assert.equal(merged.summary, 'comparison summary');
  assert.deepEqual(merged.strengths, ['CSS', 'Design Systems', 'Figma']);
  assert.deepEqual(merged.gaps, ['Portfolio gap', 'No salary listed']);
  assert.deepEqual(merged.recommendations, ['Add a design-to-code example', 'Review compensation']);
  assert.deepEqual(merged.detected_keywords, ['css', 'design systems']);
  assert.deepEqual(merged.detected_skills, ['CSS', 'Figma']);
});

test('mergeComparisonIntoMatch deduplicates terms canonically', () => {
  const merged = mergeComparisonIntoMatch(
    {
      summary: null,
      strengths: ['Design Systems'],
      gaps: [],
      recommendations: [],
      detected_keywords: ['design systems'],
      detected_skills: ['Figma'],
    },
    {
      overall_score: 55,
      hard_skills_score: 50,
      design_systems_score: 60,
      css_bridge_score: 52,
      culture_score: 48,
      location_score: 50,
      seniority_score: 49,
      summary: 'comparison summary',
      strengths: ['design systems', 'CSS', 'css'],
      gaps: [],
      recommendations: [],
      detected_keywords: ['Design Systems', 'css'],
      detected_skills: ['figma', 'CSS'],
      explanation: 'Transparent breakdown.',
    },
  );

  assert.deepEqual(merged.strengths, ['design systems', 'CSS']);
  assert.deepEqual(merged.detected_keywords, ['Design Systems', 'css']);
  assert.deepEqual(merged.detected_skills, ['figma', 'CSS']);
});

test('mergeComparisonIntoMatch avoids canonical gap duplicates', () => {
  const merged = mergeComparisonIntoMatch(
    {
      summary: null,
      strengths: [],
      gaps: ['portfolio gap'],
      recommendations: [],
      detected_keywords: [],
      detected_skills: [],
    },
    {
      overall_score: 60,
      hard_skills_score: 55,
      design_systems_score: 58,
      css_bridge_score: 56,
      culture_score: 54,
      location_score: 52,
      seniority_score: 51,
      summary: 'comparison summary',
      strengths: [],
      gaps: ['Portfolio Gap', 'CSS'],
      recommendations: [],
      detected_keywords: [],
      detected_skills: [],
      explanation: 'Transparent breakdown.',
    },
  );

  assert.deepEqual(merged.gaps, ['Portfolio Gap', 'CSS']);
});

test('deriveJobProfileComparison ignores mutable analysis fields from the job', () => {
  const baseJob = {
    id: 'job-123',
    title: 'Senior UI Engineer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'Looking for a UI Engineer with Design Systems, CSS, HTML, Storybook and design to code collaboration.',
    summary: 'Builds UI infrastructure and component libraries.',
    location: 'Remote',
    modality: 'remote' as const,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority: 'Senior',
    language: 'en',
    source_id: 'source-123',
    source_name: 'Acme Careers',
    source_category: 'design-engineering',
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
    positive_signals: ['Design Systems', 'Engineering collaboration', 'Storybook'],
    red_flags: ['equity only'],
    detected_skills: ['Figma', 'CSS', 'HTML'],
    detected_keywords: ['design systems', 'storybook'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const profile = {
    id: 'profile-123',
    owner_id: 'owner-123',
    headline: 'Senior UI / Design Systems',
    summary: 'Figma, Design Systems, CSS, HTML, React, collaboration with engineering.',
    skills_text: 'Figma, Design Systems, CSS, HTML, React, TypeScript',
    linkedin_url: 'https://linkedin.com/in/example',
    linkedin_text: 'Design systems and design-to-code work with teams.',
    cv_file_name: null,
    cv_storage_path: null,
    cv_extracted_text: 'Worked on component libraries, Storybook and CSS architecture.',
    cv_uploaded_at: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const comparisonA = deriveJobProfileComparison(baseJob, profile);
  const comparisonB = deriveJobProfileComparison(
    {
      ...baseJob,
      summary: 'Changed by analysis',
      seniority: 'Mid',
      positive_signals: ['Accessibility'],
      red_flags: ['rockstar culture', 'equity only'],
      detected_skills: ['Accessibility', 'Tailwind'],
      detected_keywords: ['accessibility', 'tailwind'],
    },
    profile,
  );

  assert.deepEqual(comparisonB, comparisonA);
});
