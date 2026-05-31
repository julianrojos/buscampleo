import assert from 'node:assert/strict';
import test from 'node:test';

import { corsHeaders } from '../../../supabase/functions/_shared/http.ts';

function createRequest(origin: string | null): Request {
  return new Request('https://example.com', {
    headers: origin ? { origin } : {},
  });
}

test('corsHeaders re-reads allowed origins for each request', () => {
  const previous = process.env.ALLOWED_ORIGIN;

  try {
    process.env.ALLOWED_ORIGIN = 'https://first.test';

    const first = corsHeaders(createRequest('https://first.test'));
    assert.equal(first['Access-Control-Allow-Origin'], 'https://first.test');

    process.env.ALLOWED_ORIGIN = 'https://second.test';

    const second = corsHeaders(createRequest('https://second.test'));
    assert.equal(second['Access-Control-Allow-Origin'], 'https://second.test');
  } finally {
    if (previous === undefined) {
      delete process.env.ALLOWED_ORIGIN;
    } else {
      process.env.ALLOWED_ORIGIN = previous;
    }
  }
});
