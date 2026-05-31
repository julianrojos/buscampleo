import assert from 'node:assert/strict';
import test from 'node:test';

import { CompareJobProfileBodySchema } from './compare-job-profile';

test('CompareJobProfileBodySchema validates the payload contract', () => {
  assert.equal(CompareJobProfileBodySchema.safeParse({ jobId: 'job-123' }).success, true);
  assert.equal(CompareJobProfileBodySchema.safeParse({}).success, false);
});
