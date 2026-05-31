import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveJobByIdRow } from './job-lookup';

test('resolveJobByIdRow returns undefined when maybeSingle() finds no row', () => {
  assert.equal(resolveJobByIdRow(null, null), undefined);
});

test('resolveJobByIdRow throws when Supabase returns an error', () => {
  assert.throws(() => resolveJobByIdRow(null, { message: 'boom' }), /db\.jobs\.read_failed/);
});
