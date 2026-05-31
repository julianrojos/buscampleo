import assert from 'node:assert/strict';
import test from 'node:test';

import { addEmailLog, listEmailLogs } from '@/data/email-log-repository';

test('email log repository appends logs in fallback mode', async () => {
  const originalLogs = await listEmailLogs();

  const updated = await addEmailLog({
    owner_id: 'local-user',
    status: 'sent',
    provider: 'preview',
    recipient_email: 'alerts@example.com',
    subject: 'Digest de prueba',
    jobs_included: ['job-1', 'job-2'],
    payload: { test: true },
    provider_message_id: null,
    error_message: null,
    sent_at: '2026-05-30T00:00:00.000Z',
  });

  assert.equal(updated[0]?.subject, 'Digest de prueba');
  assert.equal(updated[0]?.recipient_email, 'alerts@example.com');
  assert.equal(updated.length, originalLogs.length + 1);
});
