import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import { parseFilters } from '@/hooks/use-job-filters';

test('parseFilters restores URL state', () => {
  const filters = parseFilters(
    new URLSearchParams(
      'q=design%20systems&source=source-a&source=source-b&modality=remote&status=new&status=saved&min_score=70&keywords=css&keywords=figma&pending_analysis=true&show_hidden=0&show_criteria_hidden=1&sort=score&sort_dir=asc',
    ),
    ['source-a', 'source-b'],
  );

  assert.deepEqual(filters, {
    query: 'design systems',
    source: ['source-a', 'source-b'],
    modality: ['remote'],
    status: ['new', 'saved'],
    min_score: 70,
    keywords: ['css', 'figma'],
    criteria: [],
    pending_analysis: true,
    show_hidden: false,
    show_criteria_hidden: true,
    sort: 'score',
    sort_dir: 'asc',
  });
});

test('parseFilters filters out inactive or unknown sources', () => {
  const filters = parseFilters(
    new URLSearchParams('source=source-a&source=source-b&source=source-c'),
    ['source-a', 'source-c'],
  );

  assert.deepEqual(filters.source, ['source-a', 'source-c']);
});

test('parseFilters maps legacy unread_only to the new status filter when status is absent', () => {
  const filters = parseFilters(new URLSearchParams('unread_only=1'));

  assert.deepEqual(filters.status, ['new']);
});

test('parseFilters migrates legacy criteria keywords into criteria ids', () => {
  const filters = parseFilters(
    new URLSearchParams('keywords=CSS%20%2F%20HTML&keywords=figma'),
    undefined,
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(filters.criteria, ['ws-css-html']);
  assert.deepEqual(filters.keywords, ['figma']);
});

test('parseFilters keeps partial keyword matches literal', () => {
  const filters = parseFilters(
    new URLSearchParams('keywords=CSS'),
    undefined,
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(filters.criteria, []);
  assert.deepEqual(filters.keywords, ['CSS']);
});
