import assert from 'node:assert/strict';
import test from 'node:test';

import { SendDigestBodySchema, selectDigestJobs } from './send-digest';

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
    ['job-a', 'job-c'],
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

test('SendDigestBodySchema validates the payload contract', () => {
  assert.equal(SendDigestBodySchema.safeParse({ test: true }).success, true);
  assert.equal(SendDigestBodySchema.safeParse({ test: 'nope' }).success, false);
});
