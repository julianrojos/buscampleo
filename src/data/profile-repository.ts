import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed } from '@/data/remote-access';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { UserProfile } from '@/types/account';

const STORAGE_KEY = 'buscampleo.profile.v1';
const OWNER_ID = 'local-user';

type ProfileRow = Database['public']['Tables']['user_profile']['Row'];
type ProfileInsert = Database['public']['Tables']['user_profile']['Insert'];

function nowIso(): string {
  return new Date().toISOString();
}

function seedProfile(): UserProfile {
  const timestamp = nowIso();

  return {
    id: createRecordId('profile'),
    owner_id: OWNER_ID,
    headline: 'UI / Design Systems / CSS',
    summary:
      'Diseñador enfocado en sistemas de interfaz, componentes y colaboración con ingeniería.',
    skills_text: 'Figma, Design Systems, CSS, HTML, Accessibility',
    linkedin_url: '',
    linkedin_text: '',
    cv_file_name: null,
    cv_storage_path: null,
    cv_extracted_text: null,
    cv_uploaded_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function cloneProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
  };
}

function loadLocalProfile(): UserProfile {
  return readStoredValue(STORAGE_KEY, seedProfile());
}

function saveLocalProfile(profile: UserProfile): UserProfile {
  return writeStoredValue(STORAGE_KEY, cloneProfile(profile));
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

function parseExtras(row: ProfileRow) {
  const extras = isRecord(row.preferred_roles) ? row.preferred_roles : {};
  const skills = toStringArray(row.skills);

  return {
    summary: typeof extras.summary === 'string' ? extras.summary : '',
    skills_text:
      typeof extras.skills_text === 'string'
        ? extras.skills_text
        : skills.length > 0
          ? skills.join(', ')
          : '',
    cv_file_name: typeof extras.cv_file_name === 'string' ? extras.cv_file_name : null,
    cv_storage_path:
      typeof extras.cv_storage_path === 'string' ? extras.cv_storage_path : row.cv_file_path,
    cv_extracted_text:
      typeof extras.cv_extracted_text === 'string' ? extras.cv_extracted_text : row.cv_text,
    cv_uploaded_at: typeof extras.cv_uploaded_at === 'string' ? extras.cv_uploaded_at : null,
  } as const;
}

function mapRowToProfile(row: ProfileRow): UserProfile {
  const extras = parseExtras(row);

  return {
    id: row.id,
    owner_id: row.owner_id,
    headline: row.headline ?? '',
    summary: extras.summary,
    skills_text: extras.skills_text,
    linkedin_url: row.linkedin_url ?? '',
    linkedin_text: row.linkedin_text ?? '',
    cv_file_name: extras.cv_file_name,
    cv_storage_path: extras.cv_storage_path,
    cv_extracted_text: extras.cv_extracted_text,
    cv_uploaded_at: extras.cv_uploaded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function splitSkills(skillsText: string): string[] {
  return skillsText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProfileRow(profile: UserProfile): ProfileInsert {
  return {
    headline: profile.headline || null,
    linkedin_url: profile.linkedin_url || null,
    linkedin_text: profile.linkedin_text || null,
    cv_text: profile.cv_extracted_text,
    cv_file_path: profile.cv_storage_path,
    preferred_roles: {
      summary: profile.summary,
      skills_text: profile.skills_text,
      cv_file_name: profile.cv_file_name,
      cv_storage_path: profile.cv_storage_path,
      cv_extracted_text: profile.cv_extracted_text,
      cv_uploaded_at: profile.cv_uploaded_at,
    },
    preferred_locations: [] as Json,
    preferred_modalities: [] as Json,
    preferred_keywords: [] as Json,
    excluded_keywords: [] as Json,
    skills: splitSkills(profile.skills_text) as Json,
    languages: [] as Json,
    portfolio_url: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

async function readRemoteProfile(authToken?: string | null): Promise<UserProfile | null> {
  const client = getSupabaseClient(authToken);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('user_profile').select('*').maybeSingle();
  if (error) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.profile.read_failed: ${error.message}`);
    }
    return null;
  }

  if (data) {
    return mapRowToProfile(data as ProfileRow);
  }

  const seed = seedProfile();
  const insertResult = await client
    .from('user_profile')
    .insert(buildProfileRow(seed))
    .select('*')
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.profile.seed_failed: ${insertResult.error?.message ?? 'unknown error'}`);
    }
    return null;
  }

  return mapRowToProfile(insertResult.data as ProfileRow);
}

export async function getProfile(authToken?: string | null): Promise<UserProfile> {
  return (await readRemoteProfile(authToken)) ?? loadLocalProfile();
}

export function getProfileSnapshot(): UserProfile {
  return readStoredValue(STORAGE_KEY, seedProfile());
}

export async function saveProfile(
  profile: Partial<UserProfile>,
  authToken?: string | null,
): Promise<UserProfile> {
  const currentProfile = await getProfile(authToken);
  const nextProfile: UserProfile = {
    ...currentProfile,
    ...profile,
    updated_at: nowIso(),
  };

  const client = getSupabaseClient(authToken);
  if (!client) {
    return saveLocalProfile(nextProfile);
  }

  const payload = buildProfileRow(nextProfile);
  const updateResult = await client
    .from('user_profile')
    .update(payload)
    .eq('id', currentProfile.id)
    .select('*')
    .maybeSingle();

  if (updateResult.data) {
    return mapRowToProfile(updateResult.data as ProfileRow);
  }

  const insertResult = await client.from('user_profile').insert(payload).select('*').maybeSingle();
  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.profile.save_failed: ${insertResult.error?.message ?? 'unknown error'}`);
    }
    return saveLocalProfile(nextProfile);
  }

  return mapRowToProfile(insertResult.data as ProfileRow);
}

export async function clearProfileCv(authToken?: string | null): Promise<UserProfile> {
  return saveProfile(
    {
      cv_file_name: null,
      cv_storage_path: null,
      cv_extracted_text: null,
      cv_uploaded_at: null,
    },
    authToken,
  );
}

export function createProfileId(): string {
  return createRecordId('profile');
}

export function getProfileOwnerId(): string {
  return OWNER_ID;
}

export function isProfileFallbackMode(): boolean {
  return false;
}
