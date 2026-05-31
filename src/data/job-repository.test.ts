import assert from 'node:assert/strict';
import test from 'node:test';

import {
  listJobs,
  replaceJobs,
  resolveRemoteJobById,
  saveJob,
  unsaveJob,
} from '@/data/job-repository';

test('job repository persists status changes in fallback mode', async (t) => {
  const originalJobs = await listJobs();
  const targetJob = originalJobs[0];

  assert.ok(targetJob, 'expected seeded jobs');

  t.after(async () => {
    await replaceJobs(originalJobs);
  });

  const savedJob = await saveJob(targetJob.id);
  assert.ok(savedJob);
  assert.equal(savedJob.is_saved, true);
  assert.equal(savedJob.status, 'saved');

  const unsavedJob = await unsaveJob(targetJob.id);
  assert.ok(unsavedJob);
  assert.equal(unsavedJob.is_saved, false);
  assert.equal(unsavedJob.status, 'seen');
});

test('resolveRemoteJobById fails closed when remote lookup returns no row under auth', () => {
  assert.throws(() => {
    resolveRemoteJobById(null, null, 'session-token');
  }, /db\.jobs\.read_failed/);
});
