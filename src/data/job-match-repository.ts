import { createRecordId } from '@/data/id';
import { readStoredValue, writeStoredValue } from '@/data/local-storage';
import { shouldFailClosed } from '@/data/remote-access';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { JobMatch } from '@/types/account';

const STORAGE_KEY = 'buscampleo.job-matches.v1';
const OWNER_ID = 'local-user';

type JobMatchRow = Database['public']['Tables']['job_matches']['Row'];
type JobMatchInsert = Database['public']['Tables']['job_matches']['Insert'];

function seedMatches(): JobMatch[] {
  const timestamp = '2026-05-29T10:00:00.000Z';

  return [
    {
      id: 'match-001',
      owner_id: OWNER_ID,
      job_id: 'job-001',
      profile_id: 'profile-001',
      analysis_status: 'done',
      overall_score: 91,
      semantic_score: 89,
      profile_match_score: 88,
      summary: 'Role con fuerte encaje en sistemas de diseño y colaboración con engineering.',
      strengths: ['Design Systems', 'Figma Variables', 'CSS'],
      gaps: ['Salary not published'],
      recommendations: ['Prepare a short systems-focused portfolio section.'],
      detected_keywords: ['design systems', 'variables'],
      detected_skills: ['Figma', 'CSS'],
      model: 'local-seed',
      raw_response: null,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

function cloneMatches(matches: readonly JobMatch[]): JobMatch[] {
  return matches.map((match) => ({
    ...match,
    strengths: [...match.strengths],
    gaps: [...match.gaps],
    recommendations: [...match.recommendations],
    detected_keywords: [...match.detected_keywords],
    detected_skills: [...match.detected_skills],
    raw_response: match.raw_response ? { ...match.raw_response } : null,
  }));
}

function loadLocalMatches(): JobMatch[] {
  return readStoredValue(STORAGE_KEY, seedMatches());
}

function saveLocalMatches(matches: readonly JobMatch[]): JobMatch[] {
  return writeStoredValue(STORAGE_KEY, cloneMatches(matches));
}

function toStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function mapRowToMatch(row: JobMatchRow): JobMatch {
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

function buildRowPayload(match: JobMatch): JobMatchInsert {
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

async function readRemoteMatches(authToken?: string | null): Promise<JobMatch[] | null> {
  const client = getSupabaseClient(authToken);
  if (!client) {
    return null;
  }

  const { data, error } = await client.from('job_matches').select('*').order('created_at', {
    ascending: false,
  });

  if (error || !data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.job_matches.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return null;
  }

  return data.map((row) => mapRowToMatch(row as JobMatchRow));
}

export async function listJobMatches(authToken?: string | null): Promise<JobMatch[]> {
  return (await readRemoteMatches(authToken)) ?? loadLocalMatches();
}

export async function upsertJobMatch(
  match: JobMatch,
  authToken?: string | null,
): Promise<JobMatch[]> {
  const currentMatches = await listJobMatches(authToken);
  const nextMatch = { ...match };

  const client = getSupabaseClient(authToken);
  if (!client) {
    const nextMatches = currentMatches.some((item) => item.id === match.id)
      ? currentMatches.map((item) => (item.id === match.id ? nextMatch : item))
      : [nextMatch, ...currentMatches];

    return saveLocalMatches(nextMatches);
  }

  const { data: existing, error: existingError } = await client
    .from('job_matches')
    .select('*')
    .eq('job_id', match.job_id)
    .eq('profile_id', match.profile_id)
    .maybeSingle();

  if (existingError) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.job_matches.lookup_failed: ${existingError.message}`);
    }
  }

  const payload = buildRowPayload(match);

  if (existing) {
    const updateResult = await client
      .from('job_matches')
      .update(payload)
      .eq('id', (existing as JobMatchRow).id)
      .select('*')
      .maybeSingle();

    if (updateResult.data) {
      const updatedMatch = mapRowToMatch(updateResult.data as JobMatchRow);
      const nextMatches = currentMatches.some((item) => item.id === updatedMatch.id)
        ? currentMatches.map((item) => (item.id === updatedMatch.id ? updatedMatch : item))
        : [updatedMatch, ...currentMatches];
      return saveLocalMatches(nextMatches);
    }

    if (shouldFailClosed(authToken)) {
      throw new Error('db.job_matches.update_failed: unable to persist updated match');
    }
  }

  const insertResult = await client.from('job_matches').insert(payload).select('*').maybeSingle();
  if (insertResult.error || !insertResult.data) {
    if (shouldFailClosed(authToken)) {
      throw new Error(
        `db.job_matches.insert_failed: ${insertResult.error?.message ?? 'unknown error'}`,
      );
    }
    const nextMatches = currentMatches.some((item) => item.id === match.id)
      ? currentMatches.map((item) => (item.id === match.id ? nextMatch : item))
      : [nextMatch, ...currentMatches];
    return saveLocalMatches(nextMatches);
  }

  const insertedMatch = mapRowToMatch(insertResult.data as JobMatchRow);
  const nextMatches = currentMatches.some((item) => item.id === insertedMatch.id)
    ? currentMatches.map((item) => (item.id === insertedMatch.id ? insertedMatch : item))
    : [insertedMatch, ...currentMatches];

  return saveLocalMatches(nextMatches);
}

export async function getJobMatchByJobId(
  jobId: string,
  authToken?: string | null,
): Promise<JobMatch | undefined> {
  const matches = await listJobMatches(authToken);
  const localMatch = matches.find((match) => match.job_id === jobId);
  if (localMatch) {
    return localMatch;
  }

  const client = getSupabaseClient(authToken);
  if (!client) {
    return undefined;
  }

  const { data, error } = await client
    .from('job_matches')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    if (shouldFailClosed(authToken)) {
      throw new Error(`db.job_matches.read_failed: ${error?.message ?? 'unknown error'}`);
    }
    return undefined;
  }

  if (!data) {
    return undefined;
  }

  return mapRowToMatch(data as JobMatchRow);
}

export function createJobMatchId(): string {
  return createRecordId('match');
}
