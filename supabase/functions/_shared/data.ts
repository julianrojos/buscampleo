import { createClient } from 'npm:@supabase/supabase-js@2.106.2';

import { DEFAULT_CRITERIA_CONFIG, CriteriaConfigSchema } from '../../../src/lib/criteria-config.ts';
import { createRecordId } from '../../../src/data/id.ts';
import { resolveJobByIdRow } from '../../../src/lib/supabase/job-lookup.ts';
import type { Database, Json } from '../../../src/lib/supabase/database.types.ts';
import type { EmailLog, JobMatch, UserProfile, UserSettings } from '../../../src/types/account.ts';
import type { CriteriaConfig } from '../../../src/types/criteria.ts';
import type { Job } from '../../../src/types/job.ts';

type RemoteAccessOptions = {
  readonly allowServiceRole?: boolean;
};

type JobRow = Database['public']['Tables']['jobs']['Row'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
type JobMatchRow = Database['public']['Tables']['job_matches']['Row'];
type JobMatchInsert = Database['public']['Tables']['job_matches']['Insert'];
type EmailLogRow = Database['public']['Tables']['email_logs']['Row'];
type EmailLogInsert = Database['public']['Tables']['email_logs']['Insert'];
type ProfileRow = Database['public']['Tables']['user_profile']['Row'];
type ProfileInsert = Database['public']['Tables']['user_profile']['Insert'];
type SettingsRow = Database['public']['Tables']['settings']['Row'];
type SettingsInsert = Database['public']['Tables']['settings']['Insert'];

const CRITERIA_SETTING_KEY = 'criteria_config';

function readEnv(...keys: readonly string[]): string {
  for (const key of keys) {
    const denoValue = typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;
    const nodeValue = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    const value = denoValue ?? nodeValue;
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getSupabaseConfig() {
  return {
    url: readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    anonKey: readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function createEdgeSupabaseClient(authToken?: string | null, options: RemoteAccessOptions = {}) {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  if (!url) {
    return null;
  }

  const token = authToken?.trim() || null;

  if (token && anonKey) {
    return createClient<Database>(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (options.allowServiceRole && serviceRoleKey) {
    return createClient<Database>(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (anonKey) {
    return createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return null;
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

function nowIso(): string {
  return new Date().toISOString();
}

function seedProfile(): UserProfile {
  const timestamp = nowIso();

  return {
    id: createRecordId('profile'),
    owner_id: '',
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

function seedSettings(): UserSettings {
  const timestamp = nowIso();

  return {
    id: createRecordId('settings'),
    owner_id: '',
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

function mapRowToProfile(row: ProfileRow): UserProfile {
  const extras = isRecord(row.preferred_roles) ? row.preferred_roles : {};
  const skills = toStringArray(row.skills);

  return {
    id: row.id,
    owner_id: row.owner_id,
    headline: row.headline ?? '',
    summary: typeof extras.summary === 'string' ? extras.summary : '',
    skills_text:
      typeof extras.skills_text === 'string'
        ? extras.skills_text
        : skills.length > 0
          ? skills.join(', ')
          : '',
    linkedin_url: row.linkedin_url ?? '',
    linkedin_text: row.linkedin_text ?? '',
    cv_file_name: typeof extras.cv_file_name === 'string' ? extras.cv_file_name : null,
    cv_storage_path:
      typeof extras.cv_storage_path === 'string' ? extras.cv_storage_path : row.cv_file_path,
    cv_extracted_text:
      typeof extras.cv_extracted_text === 'string' ? extras.cv_extracted_text : row.cv_text,
    cv_uploaded_at: typeof extras.cv_uploaded_at === 'string' ? extras.cv_uploaded_at : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
    skills: profile.skills_text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean) as Json,
    languages: [] as Json,
    portfolio_url: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function mapRowToSettings(row: SettingsRow): UserSettings {
  const value = isRecord(row.value) ? row.value : {};

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

function mapRowToJob(row: JobRow): Job {
  return {
    ...row,
    positive_signals: toStringArray(row.positive_signals),
    red_flags: toStringArray(row.red_flags),
    detected_skills: toStringArray(row.detected_skills),
    detected_keywords: toStringArray(row.detected_keywords),
    raw_payload: isRecord(row.raw_payload) ? row.raw_payload : null,
  } as Job;
}

function mergeJobPatch(job: Job, patch: Partial<Job>): Job {
  return {
    ...job,
    ...patch,
    positive_signals: patch.positive_signals ?? job.positive_signals,
    red_flags: patch.red_flags ?? job.red_flags,
    detected_skills: patch.detected_skills ?? job.detected_skills,
    detected_keywords: patch.detected_keywords ?? job.detected_keywords,
    raw_payload: patch.raw_payload ?? job.raw_payload,
  };
}

function mapRowToJobMatch(row: JobMatchRow): JobMatch {
  return {
    id: row.id,
    owner_id: row.owner_id,
    job_id: row.job_id,
    profile_id: row.profile_id,
    analysis_status: 'done',
    overall_score: row.overall_score ?? null,
    semantic_score: row.hard_skills_score ?? row.overall_score ?? null,
    profile_match_score: row.design_systems_score ?? row.css_bridge_score ?? null,
    summary: row.explanation,
    strengths: toStringArray(row.matched_requirements),
    gaps: toStringArray(row.missing_requirements),
    recommendations: toStringArray(row.cv_suggestions),
    detected_keywords: toStringArray(row.recommended_keywords),
    detected_skills: toStringArray(row.ambiguous_requirements),
    model: 'supabase',
    raw_response: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildJobMatchRow(match: JobMatch): JobMatchInsert {
  return {
    job_id: match.job_id,
    profile_id: match.profile_id,
    overall_score: match.overall_score,
    hard_skills_score: match.semantic_score,
    design_systems_score: match.profile_match_score,
    css_bridge_score: null,
    culture_score: null,
    location_score: null,
    seniority_score: null,
    matched_requirements: match.strengths as Json,
    missing_requirements: match.gaps as Json,
    ambiguous_requirements: match.detected_skills as Json,
    recommended_keywords: match.detected_keywords as Json,
    cv_suggestions: match.recommendations as Json,
    explanation: match.summary,
  };
}

function mapRowToEmailLog(row: EmailLogRow): EmailLog {
  const response = isRecord(row.provider_response) ? row.provider_response : {};

  return {
    id: row.id,
    owner_id: row.owner_id,
    status: row.status,
    provider: typeof response.provider === 'string' ? response.provider : 'preview',
    recipient_email: row.recipient,
    subject: row.subject,
    jobs_included: toStringArray(response.jobs_included_ids),
    payload: isRecord(response.payload) ? response.payload : null,
    provider_message_id:
      typeof response.provider_message_id === 'string' ? response.provider_message_id : null,
    error_message: typeof response.error_message === 'string' ? response.error_message : null,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function buildEmailProviderResponse(log: Omit<EmailLog, 'id' | 'created_at' | 'updated_at'>): Json {
  return {
    provider: log.provider,
    jobs_included_ids: log.jobs_included,
    payload: log.payload as Json,
    provider_message_id: log.provider_message_id,
    error_message: log.error_message,
  } satisfies Record<string, Json>;
}

export async function verifySupabaseSession(authToken?: string | null): Promise<boolean> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    return false;
  }

  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}

export async function listJobs(authToken?: string | null): Promise<Job[]> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.from('jobs').select('*').order('updated_at', {
    ascending: false,
  });

  if (error || !data) {
    throw new Error(`db.jobs.read_failed: ${error?.message ?? 'unknown error'}`);
  }

  return data.map((row) => mapRowToJob(row as JobRow));
}

export async function getJobById(
  id: string | undefined,
  authToken?: string | null,
): Promise<Job | undefined> {
  if (!id) {
    return undefined;
  }

  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle();
  const jobRow = resolveJobByIdRow(data as JobRow | null, error);
  if (!jobRow) {
    return undefined;
  }

  return mapRowToJob(jobRow);
}

export async function patchJob(
  id: string,
  patch: Partial<Job>,
  authToken?: string | null,
): Promise<Job | undefined> {
  const currentJob = await getJobById(id, authToken);
  if (!currentJob) {
    return undefined;
  }

  const nextJob = mergeJobPatch(currentJob, patch);
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { error } = await client
    .from('jobs')
    .update(nextJob as JobUpdate)
    .eq('id', id);
  if (error) {
    throw new Error(`db.jobs.update_failed: ${error.message}`);
  }

  return nextJob;
}

export async function getProfile(authToken?: string | null): Promise<UserProfile> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.from('user_profile').select('*').maybeSingle();
  if (error) {
    throw new Error(`db.profile.read_failed: ${error.message}`);
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
    throw new Error(`db.profile.seed_failed: ${insertResult.error?.message ?? 'unknown error'}`);
  }

  return mapRowToProfile(insertResult.data as ProfileRow);
}

export async function getSettings(authToken?: string | null): Promise<UserSettings> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client
    .from('settings')
    .select('*')
    .eq('key', 'email_digest')
    .maybeSingle();

  if (error) {
    throw new Error(`db.settings.read_failed: ${error.message}`);
  }

  if (data) {
    return mapRowToSettings(data as SettingsRow);
  }

  const seed = seedSettings();
  const insertResult = await client
    .from('settings')
    .insert({
      key: 'email_digest',
      value: settingsToRowValue(seed),
    } satisfies SettingsInsert)
    .select('*')
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    throw new Error(`db.settings.seed_failed: ${insertResult.error?.message ?? 'unknown error'}`);
  }

  return mapRowToSettings(insertResult.data as SettingsRow);
}

export async function getCriteriaConfig(authToken?: string | null): Promise<CriteriaConfig> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    return DEFAULT_CRITERIA_CONFIG;
  }

  const { data, error } = await client
    .from('settings')
    .select('*')
    .eq('key', CRITERIA_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`db.criteria.read_failed: ${error.message}`);
  }

  if (data) {
    const parsed = CriteriaConfigSchema.safeParse(data.value);
    if (parsed.success) {
      return parsed.data;
    }
    return DEFAULT_CRITERIA_CONFIG;
  }

  const insertResult = await client
    .from('settings')
    .insert({
      key: CRITERIA_SETTING_KEY,
      value: DEFAULT_CRITERIA_CONFIG,
    } satisfies SettingsInsert)
    .select('*')
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    return DEFAULT_CRITERIA_CONFIG;
  }

  const parsed = CriteriaConfigSchema.safeParse((insertResult.data as SettingsRow).value);
  return parsed.success ? parsed.data : DEFAULT_CRITERIA_CONFIG;
}

export async function listEmailLogs(authToken?: string | null): Promise<EmailLog[]> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.from('email_logs').select('*').order('sent_at', {
    ascending: false,
  });

  if (error || !data) {
    throw new Error(`db.email_logs.read_failed: ${error?.message ?? 'unknown error'}`);
  }

  return data.map((row) => mapRowToEmailLog(row as EmailLogRow));
}

export async function addEmailLog(
  log: Omit<EmailLog, 'id' | 'created_at' | 'updated_at'>,
  authToken?: string | null,
): Promise<EmailLog[]> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const timestamp = new Date().toISOString();
  const insertPayload: EmailLogInsert = {
    sent_at: log.sent_at ?? timestamp,
    recipient: log.recipient_email,
    subject: log.subject,
    jobs_included: log.jobs_included.length,
    status: log.status,
    provider_response: buildEmailProviderResponse(log),
  };

  const insertResult = await client
    .from('email_logs')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    throw new Error(`db.email_logs.save_failed: ${insertResult.error?.message ?? 'unknown error'}`);
  }

  const insertedLog = mapRowToEmailLog(insertResult.data as EmailLogRow);
  const currentLogs = await listEmailLogs(authToken);
  return [insertedLog, ...currentLogs];
}

export async function upsertJobMatch(
  match: JobMatch,
  authToken?: string | null,
): Promise<JobMatch[]> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: existing, error: lookupError } = await client
    .from('job_matches')
    .select('*')
    .eq('job_id', match.job_id)
    .eq('profile_id', match.profile_id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`db.job_matches.lookup_failed: ${lookupError.message}`);
  }

  const payload = buildJobMatchRow(match);

  if (existing) {
    const updateResult = await client
      .from('job_matches')
      .update(payload)
      .eq('id', (existing as JobMatchRow).id)
      .select('*')
      .maybeSingle();

    if (updateResult.error || !updateResult.data) {
      throw new Error(
        `db.job_matches.update_failed: ${updateResult.error?.message ?? 'unknown error'}`,
      );
    }

    const updatedMatch = mapRowToJobMatch(updateResult.data as JobMatchRow);
    const currentMatches = await listJobMatches(authToken);
    return currentMatches.some((item) => item.id === updatedMatch.id)
      ? currentMatches.map((item) => (item.id === updatedMatch.id ? updatedMatch : item))
      : [updatedMatch, ...currentMatches];
  }

  const insertResult = await client.from('job_matches').insert(payload).select('*').maybeSingle();

  if (insertResult.error || !insertResult.data) {
    throw new Error(
      `db.job_matches.insert_failed: ${insertResult.error?.message ?? 'unknown error'}`,
    );
  }

  const insertedMatch = mapRowToJobMatch(insertResult.data as JobMatchRow);
  const currentMatches = await listJobMatches(authToken);
  return currentMatches.some((item) => item.id === insertedMatch.id)
    ? currentMatches.map((item) => (item.id === insertedMatch.id ? insertedMatch : item))
    : [insertedMatch, ...currentMatches];
}

export async function listJobMatches(authToken?: string | null): Promise<JobMatch[]> {
  const client = createEdgeSupabaseClient(authToken);
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.from('job_matches').select('*').order('created_at', {
    ascending: false,
  });

  if (error || !data) {
    throw new Error(`db.job_matches.read_failed: ${error?.message ?? 'unknown error'}`);
  }

  return data.map((row) => mapRowToJobMatch(row as JobMatchRow));
}
