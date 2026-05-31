import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCorsHeaders,
  defaultAllowedOrigins,
  isAllowedOrigin,
  parseAllowedOrigins,
} from './cors';

test('parseAllowedOrigins falls back to the default allowlist', () => {
  assert.deepEqual(parseAllowedOrigins(''), [...defaultAllowedOrigins]);
  assert.deepEqual(parseAllowedOrigins(undefined), [...defaultAllowedOrigins]);
});

test('parseAllowedOrigins trims and de-duplicates entries', () => {
  assert.deepEqual(parseAllowedOrigins(' https://a.test , https://b.test,https://a.test '), [
    'https://a.test',
    'https://b.test',
  ]);
});

test('isAllowedOrigin accepts only exact matches', () => {
  assert.equal(isAllowedOrigin('https://a.test', ['https://a.test']), true);
  assert.equal(isAllowedOrigin('https://a.test', ['https://b.test']), false);
});

test('buildCorsHeaders only emits allow-origin for allowed requests', () => {
  const headers = buildCorsHeaders('https://a.test', ['https://a.test']);

  assert.equal(headers['Access-Control-Allow-Origin'], 'https://a.test');
  assert.equal(headers.Vary, 'Origin');
  assert.equal(headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('buildCorsHeaders does not open CORS for disallowed origins', () => {
  const headers = buildCorsHeaders('https://evil.test', ['https://a.test']);

  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});
