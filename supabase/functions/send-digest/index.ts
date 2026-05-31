import {
  DigestSelectionSettings,
  DigestJobCandidate,
  SendDigestBodySchema,
  selectDigestJobs,
} from '../../../src/lib/functions/send-digest.ts';
import { addEmailLog, getSettings, listJobs, verifySupabaseSession } from '../_shared/data.ts';
import { getBearerToken, jsonResponse, optionsResponse } from '../_shared/http.ts';

type SendDigestBody = {
  readonly test?: boolean;
};

export { SendDigestBodySchema, selectDigestJobs };

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
    const selectedJobs = selectDigestJobs(
      jobs as DigestJobCandidate[],
      settings as DigestSelectionSettings,
    );
    const shouldSend = bodyResult.data.test || (selectedJobs.length > 0 && settings.email_enabled);
    const sentAt = shouldSend ? new Date().toISOString() : null;

    await addEmailLog(
      {
        owner_id: settings.owner_id,
        status: sentAt ? 'sent' : 'skipped',
        provider: 'supabase-edge',
        recipient_email: settings.email_recipient || 'pending@example.com',
        subject: bodyResult.data.test ? 'Buscampleo - email de prueba' : 'Buscampleo digest',
        jobs_included: selectedJobs.map((job) => job.id),
        payload: { selectedCount: selectedJobs.length },
        provider_message_id: null,
        error_message: sentAt ? null : 'No eligible jobs or digest disabled.',
        sent_at: sentAt,
      },
      authToken,
    );

    return jsonResponse(
      {
        ok: true,
        selected: selectedJobs.length,
        sent: Boolean(sentAt),
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
