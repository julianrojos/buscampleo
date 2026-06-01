import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addKeyword,
  listKeywords,
  mapKeywordEntryToRow,
  mapKeywordRowToEntry,
  removeKeyword,
  saveKeywords,
  toggleKeyword,
} from '@/data/keyword-repository';

test('keyword repository persists fallback mutations', async (t) => {
  const original = await listKeywords();

  t.after(async () => {
    await saveKeywords(original);
  });

  const added = await addKeyword('motion design', 'positive');
  const createdKeyword = added.find((keyword) => keyword.term === 'motion design');

  assert.ok(createdKeyword);
  assert.equal(createdKeyword?.polarity, 'positive');
  assert.equal(createdKeyword?.active, true);

  const toggled = await toggleKeyword(createdKeyword!.id);
  const toggledKeyword = toggled.find((keyword) => keyword.id === createdKeyword!.id);

  assert.ok(toggledKeyword);
  assert.equal(toggledKeyword?.active, false);

  const removed = await removeKeyword(createdKeyword!.id);
  assert.ok(!removed.some((keyword) => keyword.id === createdKeyword!.id));
});

test('keyword repository maps rows and entries consistently', () => {
  const entry = {
    id: 'keyword-test',
    owner_id: 'local-user',
    term: 'figma variables',
    polarity: 'negative' as const,
    category: 'design-systems',
    active: false,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  const row = mapKeywordEntryToRow(entry);
  const roundTrip = mapKeywordRowToEntry({
    id: row.id,
    term: row.term,
    type: row.type,
    weight: row.weight ?? 0,
    active: row.active ?? false,
    notes: row.notes,
    created_at: row.created_at ?? entry.created_at,
    updated_at: row.updated_at ?? entry.updated_at,
  });

  assert.equal(row.type, 'exclude');
  assert.equal(row.weight, -1);
  assert.equal(roundTrip.term, entry.term);
  assert.equal(roundTrip.polarity, entry.polarity);
  assert.equal(roundTrip.category, entry.category);
  assert.equal(roundTrip.active, entry.active);
});
