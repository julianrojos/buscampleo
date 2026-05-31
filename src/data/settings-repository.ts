import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed } from '@/data/remote-access';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { EmailDigestFrequency, UserSettings } from '@/types/account';

const STORAGE_KEY = 'buscampleo.settings.v1';
const OWNER_ID = 'local-user';
const SETTINGS_KEY = 'email_digest';

type SettingsRow = Database['public']['Tables']['settings']['Row'];
type SettingsInsert = Database['public']['Tables']['settings']['Insert'];

function nowIso(): string {
  return new Date().toISOString();
}

function seedSettings(): UserSettings {
  const timestamp = nowIso();

  return {
    id: createRecordId('settings'),
    owner_id: OWNER_ID,
    email_enabled: true,
    email_recipient: '',
    email_frequency: 'daily',
    min_score: 70,
    max_jobs: 5,
    include_unanalyzed: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function cloneSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
  };
}

function loadLocalSettings(): UserSettings {
  return readStoredValue(STORAGE_KEY, seedSettings());
}

function saveLocalSettings(settings: UserSettings): UserSettings {
  return writeStoredValue(STORAGE_KEY, cloneSettings(settings));
}

function isSettingsValue(value: Json | null): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapRowToSettings(row: SettingsRow): UserSettings {
  const value = isSettingsValue(row.value) ? row.value : {};

  return {
    id: typeof value.id === 'string' ? value.id : seedSettings().id,
    owner_id: row.owner_id,
    email_enabled: typeof value.email_enabled === 'boolean' ? value.email_enabled : true,
    email_recipient: typeof value.email_recipient === 'string' ? value.email_recipient : '',
    email_frequency:
      value.email_frequency === 'daily' ||
      value.email_frequency === 'weekly' ||
      value.email_frequency === 'high-score'
        ? value.email_frequency
        : 'daily',
    min_score: typeof value.min_score === 'number' ? value.min_score : 70,
    max_jobs: typeof value.max_jobs === 'number' ? value.max_jobs : 5,
    include_unanalyzed:
      typeof value.include_unanalyzed === 'boolean' ? value.include_unanalyzed : true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function settingsToRowValue(settings: UserSettings): Json {
  return {
    id: settings.id,
    owner_id: settings.owner_id,
    email_enabled: settings.email_enabled,
    email_recipient: settings.email_recipient,
    email_frequency: settings.email_frequency,
    min_score: settings.min_score,
    max_jobs: settings.max_jobs,
    include_unanalyzed: settings.include_unanalyzed,
    created_at: settings.created_at,
    updated_at: settings.updated_at,
  } satisfies Record<string, Json>;
}

async function readRemoteSettings(authToken?: string | null): Promise<UserSettings | null> {
  const client = getSupabaseClient(authToken);
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('settings')
    .select('*')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.settings.read_failed: ${error.message}`);
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return mapRowToSettings(data as SettingsRow);
}

export async function getSettings(authToken?: string | null): Promise<UserSettings> {
  return (await readRemoteSettings(authToken)) ?? loadLocalSettings();
}

export function getSettingsSnapshot(): UserSettings {
  return readStoredValue(STORAGE_KEY, seedSettings());
}

export async function saveSettings(
  patch: Partial<UserSettings>,
  authToken?: string | null,
): Promise<UserSettings> {
  const currentSettings = await getSettings(authToken);
  const nextSettings: UserSettings = {
    ...currentSettings,
    ...patch,
    updated_at: nowIso(),
  };

  const client = getSupabaseClient(authToken);
  if (!client) {
    return saveLocalSettings(nextSettings);
  }

  const insertPayload: SettingsInsert = {
    key: SETTINGS_KEY,
    value: settingsToRowValue(nextSettings),
  };

  const updateResult = await client
    .from('settings')
    .update({
      value: settingsToRowValue(nextSettings),
    })
    .eq('key', SETTINGS_KEY)
    .select('*')
    .maybeSingle();

  if (updateResult.data) {
    return mapRowToSettings(updateResult.data as SettingsRow);
  }

  const insertResult = await client
    .from('settings')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();
  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.settings.save_failed: ${insertResult.error?.message ?? 'unknown error'}`);
    }
    return saveLocalSettings(nextSettings);
  }

  return mapRowToSettings(insertResult.data as SettingsRow);
}

export async function updateEmailDigestSettings(
  patch: {
    readonly email_enabled?: boolean;
    readonly email_recipient?: string;
    readonly email_frequency?: EmailDigestFrequency;
    readonly min_score?: number;
    readonly max_jobs?: number;
    readonly include_unanalyzed?: boolean;
  },
  authToken?: string | null,
): Promise<UserSettings> {
  return saveSettings(patch, authToken);
}
