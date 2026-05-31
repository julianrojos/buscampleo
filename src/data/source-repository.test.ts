import assert from 'node:assert/strict';
import test from 'node:test';

import { MOCK_SOURCES } from '@/data/mock-sources';
import {
  createSource,
  deleteSource,
  getSourceById,
  listSources,
  replaceSources,
  setSourceActive,
  updateSourceRunInfo,
} from '@/data/source-repository';

test('source repository persists fallback mutations', async (t) => {
  const originalSources = await listSources();

  t.after(async () => {
    await replaceSources(originalSources);
  });

  const created = await createSource({
    name: 'Test Source',
    url: 'https://example.com/test',
    type: 'manual',
    category: 'generalist',
    active: true,
    priority: 1,
    parser_key: null,
    last_success_at: null,
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 0,
    notes: null,
  });
  assert.equal(created[0]?.name, 'Test Source');

  const toggled = await setSourceActive(created[0]!.id, false);
  assert.equal(toggled?.active, false);

  const updated = await updateSourceRunInfo(created[0]!.id, {
    last_success_at: '2026-05-29T00:00:00.000Z',
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 3,
  });
  assert.equal(updated?.offers_found, 3);

  const loaded = await getSourceById(created[0]!.id);
  assert.equal(loaded?.id, created[0]!.id);

  const remaining = await deleteSource(created[0]!.id);
  assert.ok(!remaining.some((source) => source.id === created[0]!.id));
  assert.equal(MOCK_SOURCES.length > 0, true);
});
