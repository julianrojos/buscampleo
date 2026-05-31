import assert from 'node:assert/strict';
import test from 'node:test';

import { addScrapingRun, listScrapingRuns } from '@/data/scraping-run-repository';

test('scraping run repository appends runs in fallback mode', async () => {
  const originalRuns = await listScrapingRuns();

  const updated = await addScrapingRun({
    started_at: '2026-05-30T08:00:00.000Z',
    finished_at: '2026-05-30T08:03:00.000Z',
    status: 'success',
    total_sources: 2,
    successful_sources: 2,
    failed_sources: 0,
    jobs_found: 12,
    jobs_inserted: 4,
    jobs_updated: 5,
    error_summary: null,
    duration_ms: 180000,
  });

  assert.equal(updated[0]?.status, 'success');
  assert.equal(updated[0]?.duration_ms, 180000);
  assert.equal(updated.length, originalRuns.length + 1);
});
