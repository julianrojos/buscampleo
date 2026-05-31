import assert from 'node:assert/strict';
import test from 'node:test';

import handler from './compare-job-profile';

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

test('compare-job-profile requires authorization', async () => {
  const { state, response } = createResponse();

  await handler({ method: 'POST', body: { jobId: 'job-123' }, headers: {} }, response);

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.body, { error: 'Unauthorized' });
});
