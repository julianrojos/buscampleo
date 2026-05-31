import assert from 'node:assert/strict';
import test from 'node:test';

import { getSettings, saveSettings } from '@/data/settings-repository';

test('settings repository persists digest configuration', async (t) => {
  const original = await getSettings();

  t.after(async () => {
    await saveSettings(original);
  });

  await saveSettings({
    email_enabled: false,
    email_recipient: 'alerts@example.com',
    email_frequency: 'weekly',
    min_score: 83,
    max_jobs: 4,
    include_unanalyzed: false,
  });

  const updated = await getSettings();
  assert.equal(updated.email_enabled, false);
  assert.equal(updated.email_recipient, 'alerts@example.com');
  assert.equal(updated.email_frequency, 'weekly');
  assert.equal(updated.min_score, 83);
  assert.equal(updated.max_jobs, 4);
  assert.equal(updated.include_unanalyzed, false);
});
