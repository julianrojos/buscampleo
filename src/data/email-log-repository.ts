import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed } from '@/data/remote-access';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { EmailLog } from '@/types/account';

const STORAGE_KEY = 'buscampleo.email-logs.v1';
const OWNER_ID = 'local-user';

type EmailLogRow = Database['public']['Tables']['email_logs']['Row'];
type EmailLogInsert = Database['public']['Tables']['email_logs']['Insert'];

function seedEmailLogs(): EmailLog[] {
  const timestamp = '2026-05-29T09:00:00.000Z';

  return [
    {
      id: 'email-log-001',
      owner_id: OWNER_ID,
      status: 'sent',
      provider: 'resend',
      recipient_email: 'demo@example.com',
      subject: 'Buscampleo diario',
      jobs_included: ['job-001', 'job-002'],
      payload: { count: 2 },
      provider_message_id: 'resend_123',
      error_message: null,
      sent_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

function cloneEmailLogs(logs: readonly EmailLog[]): EmailLog[] {
  return logs.map((log) => ({
    ...log,
    jobs_included: [...log.jobs_included],
    payload: log.payload ? { ...log.payload } : null,
  }));
}

function loadLocalEmailLogs(): EmailLog[] {
  return readStoredValue(STORAGE_KEY, seedEmailLogs());
}

function saveLocalEmailLogs(logs: readonly EmailLog[]): EmailLog[] {
  return writeStoredValue(STORAGE_KEY, cloneEmailLogs(logs));
}

function isRecord(value: Json | null | undefined): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function mapRowToEmailLog(row: EmailLogRow): EmailLog {
  const response = isRecord(row.provider_response) ? row.provider_response : {};
  const jobsIncluded = toStringArray(response.jobs_included_ids);
  const payload = isRecord(response.payload) ? response.payload : null;

  return {
    id: row.id,
    owner_id: row.owner_id,
    status: row.status,
    provider: typeof response.provider === 'string' ? response.provider : 'preview',
    recipient_email: row.recipient,
    subject: row.subject,
    jobs_included: jobsIncluded,
    payload,
    provider_message_id:
      typeof response.provider_message_id === 'string' ? response.provider_message_id : null,
    error_message: typeof response.error_message === 'string' ? response.error_message : null,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function buildProviderResponse(log: Omit<EmailLog, 'id' | 'created_at' | 'updated_at'>): Json {
  return {
    provider: log.provider,
    jobs_included_ids: log.jobs_included,
    payload: log.payload as Json,
    provider_message_id: log.provider_message_id,
    error_message: log.error_message,
  } satisfies Record<string, Json>;
}

async function readRemoteEmailLogs(authToken?: string | null): Promise<EmailLog[] | null> {
  const client = getSupabaseClient(authToken);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('email_logs').select('*').order('sent_at', {
    ascending: false,
  });

  if (error || !data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.email_logs.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return null;
  }

  return data.map((row) => mapRowToEmailLog(row as EmailLogRow));
}

export async function listEmailLogs(authToken?: string | null): Promise<EmailLog[]> {
  return (await readRemoteEmailLogs(authToken)) ?? loadLocalEmailLogs();
}

export async function addEmailLog(
  log: Omit<EmailLog, 'id' | 'created_at' | 'updated_at'>,
  authToken?: string | null,
): Promise<EmailLog[]> {
  const currentLogs = await listEmailLogs(authToken);
  const timestamp = new Date().toISOString();
  const nextLog: EmailLog = {
    ...log,
    id: createRecordId('email-log'),
    created_at: timestamp,
    updated_at: timestamp,
  };

  const client = getSupabaseClient(authToken);
  if (!client) {
    return saveLocalEmailLogs([nextLog, ...currentLogs]);
  }

  const insertPayload: EmailLogInsert = {
    sent_at: log.sent_at ?? timestamp,
    recipient: log.recipient_email,
    subject: log.subject,
    jobs_included: log.jobs_included.length,
    status: log.status,
    provider_response: buildProviderResponse(log),
  };

  const insertResult = await client
    .from('email_logs')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();
  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(
        `db.email_logs.save_failed: ${insertResult.error?.message ?? 'unknown error'}`,
      );
    }
    return saveLocalEmailLogs([nextLog, ...currentLogs]);
  }

  const insertedLog = mapRowToEmailLog(insertResult.data as EmailLogRow);
  return [insertedLog, ...currentLogs];
}
