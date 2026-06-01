import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import { JOB_SCORE_WEIGHTS, calculateJobScore } from '@/lib/job-scoring';

test('calculateJobScore returns the expected weighted components', () => {
  const job = {
    id: 'job-123',
    title: 'Senior Design Systems Designer',
    company: 'Acme Studio',
    url: 'https://example.com/jobs/123',
    normalized_url: 'https://example.com/jobs/123',
    description:
      'We are hiring a Design Systems designer with Figma, CSS, Storybook and engineering collaboration.',
    summary: 'Builds UI infrastructure and component libraries.',
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
    keyword_score: 80,
    semantic_score: 84,
    profile_match_score: 79,
    final_score: null,
    positive_signals: ['Design Systems', 'Accessibility'],
    red_flags: ['equity only'],
    detected_skills: ['Figma', 'CSS'],
    detected_keywords: ['design systems'],
    raw_payload: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const score = calculateJobScore(job, DEFAULT_CRITERIA_CONFIG);

  assert.equal(score.components.length, 6);
  assert.equal(score.components.reduce((total, component) => total + component.weight, 0), 100);
  assert.equal(score.components[0]?.key, 'source');
  assert.equal(score.components[score.components.length - 1]?.key, 'match');
  assert.ok(score.finalScore > 0);
  assert.ok(score.explanation.includes('Fuente'));
  assert.equal(JOB_SCORE_WEIGHTS.match, 15);
});
