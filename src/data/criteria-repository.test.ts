import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import {
  getCriteriaConfig,
  getCriteriaConfigSnapshot,
  resetCriteriaConfig,
  saveCriteriaConfig,
} from '@/data/criteria-repository';

test('criteria repository persists fallback mutations', async (t) => {
  const original = getCriteriaConfigSnapshot();

  t.after(async () => {
    await saveCriteriaConfig(original);
  });

  const nextCriteria = {
    ...original,
    weighted_signals: original.weighted_signals.map((signal, index) =>
      index === 0
        ? {
            ...signal,
            active: !signal.active,
            weight: signal.weight + 0.25,
          }
        : signal,
    ),
  };

  await saveCriteriaConfig(nextCriteria);

  const updated = await getCriteriaConfig();
  assert.equal(updated.weighted_signals[0]?.active, nextCriteria.weighted_signals[0]?.active);
  assert.equal(updated.weighted_signals[0]?.weight, nextCriteria.weighted_signals[0]?.weight);
  assert.equal(updated.hard_excludes[0]?.pattern, original.hard_excludes[0]?.pattern);
});

test('criteria repository reset restores the default configuration', async (t) => {
  const original = getCriteriaConfigSnapshot();

  t.after(async () => {
    await saveCriteriaConfig(original);
  });

  const reset = await resetCriteriaConfig();
  assert.deepEqual(reset, DEFAULT_CRITERIA_CONFIG);
});
