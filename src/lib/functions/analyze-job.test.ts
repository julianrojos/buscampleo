import assert from 'node:assert/strict';
import test from 'node:test';

import { AnalyzeJobBodySchema } from './analyze-job';

test('AnalyzeJobBodySchema validates the payload contract', () => {
  assert.equal(AnalyzeJobBodySchema.safeParse({ jobId: 'job-123' }).success, true);
  assert.equal(AnalyzeJobBodySchema.safeParse({}).success, false);
});
