import assert from 'node:assert/strict';
import test from 'node:test';

import { clearProfileCv, getProfile, saveProfile } from '@/data/profile-repository';

test('profile repository persists and clears cv metadata', async (t) => {
  const original = await getProfile();

  t.after(async () => {
    await saveProfile(original);
  });

  await saveProfile({
    headline: 'Testing profile',
    cv_file_name: 'cv.pdf',
    cv_storage_path: '/private/cv.pdf',
    cv_extracted_text: 'hello',
    cv_uploaded_at: '2026-05-29T00:00:00.000Z',
  });

  const updated = await getProfile();
  assert.equal(updated.headline, 'Testing profile');
  assert.equal(updated.cv_file_name, 'cv.pdf');

  const cleared = await clearProfileCv();
  assert.equal(cleared.cv_file_name, null);
  assert.equal(cleared.cv_extracted_text, null);
});
