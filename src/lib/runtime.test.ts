import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedEmail } from '@/lib/runtime';

test('isAllowedEmail accepts matching addresses and rejects others', () => {
  assert.equal(isAllowedEmail('person@example.com', 'person@example.com'), true);
  assert.equal(isAllowedEmail('other@example.com', 'person@example.com'), false);
});
