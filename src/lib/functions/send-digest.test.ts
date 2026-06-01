import assert from 'node:assert/strict';
import test from 'node:test';

import { SendDigestBodySchema, buildDigestEmailSubject, renderDigestEmail, selectDigestJobs } from './send-digest';

test('selectDigestJobs filters by hidden, analysis state, score and max jobs', () => {
  const jobs = [
    {
      id: 'job-1',
      is_hidden: false,
      analysis_status: 'done',
      final_score: 88,
    },
    {
      id: 'job-2',
      is_hidden: false,
      analysis_status: 'pending',
      final_score: 95,
    },
    {
      id: 'job-3',
      is_hidden: true,
      analysis_status: 'done',
      final_score: 99,
    },
    {
      id: 'job-4',
      is_hidden: false,
      analysis_status: 'done',
      final_score: 76,
    },
  ] as const;

  const selected = selectDigestJobs(jobs, {
    min_score: 80,
    max_jobs: 2,
    include_unanalyzed: false,
  });

  assert.deepEqual(
    selected.map((job) => job.id),
    ['job-1'],
  );
});

test('selectDigestJobs includes unanalyzed jobs when enabled', () => {
  const jobs = [
    {
      id: 'job-1',
      is_hidden: false,
      analysis_status: 'pending',
      final_score: null,
    },
    {
      id: 'job-2',
      is_hidden: false,
      analysis_status: 'done',
      final_score: 85,
    },
  ] as const;

  const selected = selectDigestJobs(jobs, {
    min_score: 90,
    max_jobs: 10,
    include_unanalyzed: true,
  });

  assert.deepEqual(
    selected.map((job) => job.id),
    ['job-1'],
  );
});

test('selectDigestJobs includes unanalyzed jobs without requiring a score', () => {
  const jobs = [
    { id: 'job-a', is_hidden: false, analysis_status: 'pending', final_score: null },
    { id: 'job-b', is_hidden: false, analysis_status: 'done', final_score: 50 },
    { id: 'job-c', is_hidden: false, analysis_status: 'done', final_score: 85 },
  ] as const;

  const selected = selectDigestJobs(jobs, {
    min_score: 80,
    max_jobs: 10,
    include_unanalyzed: true,
  });

  assert.deepEqual(
    selected.map((job) => job.id),
    ['job-c', 'job-a'],
  );
});

test('selectDigestJobs excludes unanalyzed jobs when include_unanalyzed is false', () => {
  const jobs = [
    { id: 'job-a', is_hidden: false, analysis_status: 'pending', final_score: null },
    { id: 'job-b', is_hidden: false, analysis_status: 'done', final_score: 85 },
  ] as const;

  const selected = selectDigestJobs(jobs, {
    min_score: 80,
    max_jobs: 10,
    include_unanalyzed: false,
  });

  assert.deepEqual(
    selected.map((job) => job.id),
    ['job-b'],
  );
});

test('selectDigestJobs prioritizes higher scores before truncating', () => {
  const jobs = [
    { id: 'job-a', is_hidden: false, analysis_status: 'done', final_score: 60 },
    { id: 'job-b', is_hidden: false, analysis_status: 'done', final_score: 95 },
    { id: 'job-c', is_hidden: false, analysis_status: 'done', final_score: 80 },
    { id: 'job-d', is_hidden: false, analysis_status: 'done', final_score: 75 },
  ] as const;

  const selected = selectDigestJobs(jobs, {
    min_score: 0,
    max_jobs: 2,
    include_unanalyzed: false,
  });

  assert.deepEqual(
    selected.map((job) => job.id),
    ['job-b', 'job-c'],
  );
});

test('SendDigestBodySchema validates the payload contract', () => {
  assert.equal(SendDigestBodySchema.safeParse({ test: true }).success, true);
  assert.equal(SendDigestBodySchema.safeParse({ test: 'nope' }).success, false);
});

test('renderDigestEmail sorts jobs by score and builds a preview', () => {
  const jobs = [
    {
      id: 'job-1',
      title: 'Product Designer',
      company: 'Alpha',
      url: 'https://example.com/a',
      normalized_url: 'https://example.com/a',
      description: 'Design systems',
      summary: 'Alpha summary',
      location: 'Remote',
      modality: 'remote' as const,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      seniority: null,
      language: 'en',
      source_id: 'source-1',
      source_name: 'Alpha',
      source_category: 'design-systems',
      published_at: null,
      first_seen_at: '2026-06-01T00:00:00.000Z',
      last_seen_at: '2026-06-01T00:00:00.000Z',
      scraped_at: null,
      status: 'new' as const,
      analysis_status: 'done' as const,
      is_read: false,
      is_saved: false,
      is_hidden: false,
      source_quality_score: null,
      keyword_score: null,
      semantic_score: null,
      profile_match_score: null,
      final_score: 72,
      positive_signals: [],
      red_flags: [],
      detected_skills: [],
      detected_keywords: [],
      raw_payload: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'job-2',
      title: 'Senior UI Engineer',
      company: 'Beta',
      url: 'https://example.com/b',
      normalized_url: 'https://example.com/b',
      description: 'CSS and design to code',
      summary: 'Beta summary',
      location: 'Remote',
      modality: 'remote' as const,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      seniority: null,
      language: 'en',
      source_id: 'source-2',
      source_name: 'Beta',
      source_category: 'design-engineering',
      published_at: null,
      first_seen_at: '2026-06-01T00:00:00.000Z',
      last_seen_at: '2026-06-01T00:00:00.000Z',
      scraped_at: null,
      status: 'new' as const,
      analysis_status: 'done' as const,
      is_read: false,
      is_saved: false,
      is_hidden: false,
      source_quality_score: null,
      keyword_score: null,
      semantic_score: null,
      profile_match_score: null,
      final_score: 91,
      positive_signals: [],
      red_flags: [],
      detected_skills: [],
      detected_keywords: [],
      raw_payload: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
  ] as const;

  const digest = renderDigestEmail(jobs, {
    min_score: 70,
    max_jobs: 5,
    include_unanalyzed: false,
  });

  assert.equal(digest.subject, buildDigestEmailSubject(2, {
    min_score: 70,
    max_jobs: 5,
    include_unanalyzed: false,
  }));
  assert.equal(digest.jobs[0]?.id, 'job-2');
  assert.match(digest.text, /Senior UI Engineer/);
  assert.match(digest.html, /Alpha summary|Beta summary/);
});
