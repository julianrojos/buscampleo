import assert from 'node:assert/strict';
import test from 'node:test';

import { MOCK_JOBS } from '@/data/mock-jobs';
import { dedupeJobs, normalizeUrl } from './normalize';

test('normalizeUrl strips query and hash fragments', () => {
  assert.equal(
    normalizeUrl('https://example.com/jobs/design-system/?utm_source=x#anchor'),
    'https://example.com/jobs/design-system',
  );
});

test('dedupeJobs removes duplicate normalized jobs', () => {
  const job = MOCK_JOBS[0];
  const duplicate = {
    ...job,
    id: 'job-duplicate',
    url: `${job.url}?utm_source=test`,
    normalized_url: job.normalized_url,
  };

  const deduped = dedupeJobs([job, duplicate]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.normalized_url, job.normalized_url);
});
