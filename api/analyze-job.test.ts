import assert from 'node:assert/strict';
import test from 'node:test';

import handler, { AnalyzeJobBodySchema } from './analyze-job';

function createResponse() {
  const state: { statusCode: number | null; body: unknown } = {
    statusCode: null,
    body: null,
  };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
    },
  };

  return {
    state,
    response,
  };
}

test('AnalyzeJobBodySchema validates the payload contract', () => {
  assert.equal(AnalyzeJobBodySchema.safeParse({ jobId: 'job-123' }).success, true);
  assert.equal(AnalyzeJobBodySchema.safeParse({}).success, false);
});

test('analyze-job requires authorization', async () => {
  const { state, response } = createResponse();

  await handler({ method: 'POST', body: { jobId: 'job-123' }, headers: {} }, response);

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.body, { error: 'Unauthorized' });
});
