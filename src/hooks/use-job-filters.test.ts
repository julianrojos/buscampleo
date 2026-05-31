import assert from 'node:assert/strict';
import test from 'node:test';

import { parseFilters } from '@/hooks/use-job-filters';

test('parseFilters restores URL state', () => {
  const filters = parseFilters(
    new URLSearchParams(
      'q=design%20systems&source=source-a&source=source-b&modality=remote&min_score=70&keywords=css&keywords=figma&unread_only=1&pending_analysis=true&show_hidden=0&sort=score&sort_dir=asc',
    ),
    ['source-a', 'source-b'],
  );

  assert.deepEqual(filters, {
    query: 'design systems',
    source: ['source-a', 'source-b'],
    modality: ['remote'],
    min_score: 70,
    keywords: ['css', 'figma'],
    unread_only: true,
    pending_analysis: true,
    show_hidden: false,
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
