import {
  DigestSelectionSettings,
  SendDigestBodySchema,
  renderDigestEmail,
  selectDigestJobs,
} from '../../../src/lib/functions/send-digest.ts';
import {
  addEmailLog,
  getSettings,
  listJobs,
  verifySupabaseSession,
} from '../_shared/data.ts';
import { hasTransactionalEmailConfig, sendTransactionalEmail } from '../_shared/email.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';

type SendDigestBody = {
  readonly test?: boolean;
};

export { SendDigestBodySchema, selectDigestJobs, renderDigestEmail };

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, request, { status: 405 });
  }

  try {
    const authToken = getBearerToken(request);
    if (!authToken || !(await verifySupabaseSession(authToken))) {
      return jsonResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as SendDigestBody | null;
    const bodyResult = SendDigestBodySchema.safeParse(body ?? {});
    if (!bodyResult.success) {
      return jsonResponse({ error: 'Invalid payload' }, request, { status: 400 });
    }

    const settings = await getSettings(authToken);
    const jobs = await listJobs(authToken);
    const selectedJobs = selectDigestJobs(jobs, settings as DigestSelectionSettings);
    const digest = renderDigestEmail(selectedJobs, settings as DigestSelectionSettings, {
      test: bodyResult.data.test,
    });
    const recipient = settings.email_recipient.trim();
    const hasProvider = hasTransactionalEmailConfig();
    const canSend =
      Boolean(recipient) &&
      hasProvider &&
      (bodyResult.data.test || (settings.email_enabled && selectedJobs.length > 0));

    if (!canSend) {
      await addEmailLog(
        {
          owner_id: settings.owner_id,
          status: 'skipped',
          provider: 'preview',
          recipient_email: recipient || 'pending@example.com',
          subject: digest.subject,
          jobs_included: digest.jobs.map((job) => job.id),
          payload: {
            test: Boolean(bodyResult.data.test),
            selectedCount: selectedJobs.length,
            reason: !recipient
              ? 'Missing recipient'
              : !hasProvider
                ? 'Transactional email provider not configured'
              : !settings.email_enabled
                ? 'Digest disabled'
                : 'No eligible jobs',
          },
          provider_message_id: null,
          error_message: !recipient
            ? 'Missing recipient email.'
            : !hasProvider
              ? 'Transactional email provider not configured.'
            : !settings.email_enabled
              ? 'Digest disabled.'
              : 'No eligible jobs.',
          sent_at: null,
        },
        authToken,
      );

      return jsonResponse(
        {
          ok: true,
          sent: false,
          skipped: true,
          selected: selectedJobs.length,
          subject: digest.subject,
          reason: !recipient
            ? 'Missing recipient email.'
            : !hasProvider
              ? 'Transactional email provider not configured.'
            : !settings.email_enabled
              ? 'Digest disabled.'
              : 'No eligible jobs.',
        },
        request,
      );
    }

    const emailResult = await sendTransactionalEmail({
      to: recipient,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });

    await addEmailLog(
      {
        owner_id: settings.owner_id,
        status: 'sent',
        provider: emailResult.provider,
        recipient_email: recipient,
        subject: digest.subject,
        jobs_included: digest.jobs.map((job) => job.id),
        payload: {
          test: Boolean(bodyResult.data.test),
          selectedCount: selectedJobs.length,
          subject: digest.subject,
          htmlPreview: digest.html.slice(0, 1000),
        },
        provider_message_id: emailResult.providerMessageId,
        error_message: null,
        sent_at: new Date().toISOString(),
      },
      authToken,
    );

    return jsonResponse(
      {
        ok: true,
        sent: true,
        selected: selectedJobs.length,
        subject: digest.subject,
        provider: emailResult.provider,
        providerMessageId: emailResult.providerMessageId,
      },
      request,
    );
  } catch (error) {
    console.error('[send-digest] failed', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      request,
      { status: 500 },
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
