begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.sources (
  id text primary key,
  name text not null,
  url text not null,
  type text not null check (type in ('rss', 'api', 'ats', 'scrape', 'manual')),
  category text not null check (
    category in (
      'niche-design',
      'design-systems',
      'design-engineering',
      'remote',
      'generalist',
      'newsletter',
      'community',
      'ats-direct'
    )
  ),
  active boolean not null default true,
  priority integer not null default 0,
  parser_key text,
  last_success_at timestamptz,
  last_error_at timestamptz,
  consecutive_failures integer not null default 0,
  offers_found integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists sources_url_key on public.sources (url);
create index if not exists sources_active_idx on public.sources (active);
create index if not exists sources_priority_idx on public.sources (priority desc);

alter table public.sources enable row level security;

drop policy if exists "authenticated read sources" on public.sources;
create policy "authenticated read sources"
on public.sources
for select
using (auth.uid() is not null);

drop policy if exists "authenticated write sources" on public.sources;
create policy "authenticated write sources"
on public.sources
for insert
with check (auth.uid() is not null);

drop policy if exists "authenticated update sources" on public.sources;
create policy "authenticated update sources"
on public.sources
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated delete sources" on public.sources;
create policy "authenticated delete sources"
on public.sources
for delete
using (auth.uid() is not null);

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
before update on public.sources
for each row
execute function public.set_updated_at();

create table if not exists public.keywords (
  id text primary key,
  term text not null,
  type text not null check (type in ('include', 'exclude')),
  weight numeric not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists keywords_term_type_key on public.keywords (lower(term), type);
create index if not exists keywords_active_idx on public.keywords (active);

alter table public.keywords enable row level security;

drop policy if exists "authenticated read keywords" on public.keywords;
create policy "authenticated read keywords"
on public.keywords
for select
using (auth.uid() is not null);

drop policy if exists "authenticated write keywords" on public.keywords;
create policy "authenticated write keywords"
on public.keywords
for insert
with check (auth.uid() is not null);

drop policy if exists "authenticated update keywords" on public.keywords;
create policy "authenticated update keywords"
on public.keywords
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated delete keywords" on public.keywords;
create policy "authenticated delete keywords"
on public.keywords
for delete
using (auth.uid() is not null);

drop trigger if exists keywords_set_updated_at on public.keywords;
create trigger keywords_set_updated_at
before update on public.keywords
for each row
execute function public.set_updated_at();

create table if not exists public.user_profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  headline text,
  linkedin_url text,
  linkedin_text text,
  cv_text text,
  cv_file_path text,
  preferred_roles jsonb not null default '[]'::jsonb,
  preferred_locations jsonb not null default '[]'::jsonb,
  preferred_modalities jsonb not null default '[]'::jsonb,
  preferred_keywords jsonb not null default '[]'::jsonb,
  excluded_keywords jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  portfolio_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id)
);

alter table public.user_profile enable row level security;

drop policy if exists "owner read profile" on public.user_profile;
create policy "owner read profile"
on public.user_profile
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write profile" on public.user_profile;
create policy "owner write profile"
on public.user_profile
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update profile" on public.user_profile;
create policy "owner update profile"
on public.user_profile
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete profile" on public.user_profile;
create policy "owner delete profile"
on public.user_profile
for delete
using (auth.uid() = owner_id);

drop trigger if exists user_profile_set_updated_at on public.user_profile;
create trigger user_profile_set_updated_at
before update on public.user_profile
for each row
execute function public.set_updated_at();

create table if not exists public.settings (
  owner_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, key)
);

alter table public.settings enable row level security;

drop policy if exists "owner read settings" on public.settings;
create policy "owner read settings"
on public.settings
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write settings" on public.settings;
create policy "owner write settings"
on public.settings
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update settings" on public.settings;
create policy "owner update settings"
on public.settings
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete settings" on public.settings;
create policy "owner delete settings"
on public.settings
for delete
using (auth.uid() = owner_id);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

create table if not exists public.jobs (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  title text not null,
  company text not null,
  url text not null,
  normalized_url text not null,
  description text,
  summary text,
  location text,
  modality text not null check (modality in ('remote', 'hybrid', 'onsite', 'unknown')),
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  seniority text,
  language text,
  source_id text not null references public.sources(id) on delete restrict,
  source_name text not null,
  source_category text not null,
  published_at timestamptz,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  scraped_at timestamptz,
  status text not null check (status in ('new', 'seen', 'saved', 'hidden', 'applied')),
  analysis_status text not null check (analysis_status in ('pending', 'queued', 'done', 'error', 'failed')),
  is_read boolean not null default false,
  is_saved boolean not null default false,
  is_hidden boolean not null default false,
  source_quality_score numeric,
  keyword_score numeric,
  semantic_score numeric,
  profile_match_score numeric,
  final_score numeric,
  positive_signals jsonb not null default '[]'::jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  detected_skills jsonb not null default '[]'::jsonb,
  detected_keywords jsonb not null default '[]'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists jobs_normalized_url_key on public.jobs (normalized_url);
create index if not exists jobs_final_score_idx on public.jobs (final_score desc);
create index if not exists jobs_published_at_idx on public.jobs (published_at desc);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_hidden_idx on public.jobs (is_hidden);
create index if not exists jobs_analysis_status_idx on public.jobs (analysis_status);
create index if not exists jobs_source_id_idx on public.jobs (source_id);
create index if not exists jobs_owner_id_idx on public.jobs (owner_id);

alter table public.jobs enable row level security;

drop policy if exists "owner read jobs" on public.jobs;
create policy "owner read jobs"
on public.jobs
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write jobs" on public.jobs;
create policy "owner write jobs"
on public.jobs
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update jobs" on public.jobs;
create policy "owner update jobs"
on public.jobs
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete jobs" on public.jobs;
create policy "owner delete jobs"
on public.jobs
for delete
using (auth.uid() = owner_id);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  job_id text not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.user_profile(id) on delete cascade,
  overall_score numeric,
  hard_skills_score numeric,
  design_systems_score numeric,
  css_bridge_score numeric,
  culture_score numeric,
  location_score numeric,
  seniority_score numeric,
  matched_requirements jsonb not null default '[]'::jsonb,
  missing_requirements jsonb not null default '[]'::jsonb,
  ambiguous_requirements jsonb not null default '[]'::jsonb,
  recommended_keywords jsonb not null default '[]'::jsonb,
  cv_suggestions jsonb not null default '[]'::jsonb,
  explanation text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, job_id, profile_id)
);

create index if not exists job_matches_job_id_idx on public.job_matches (job_id);
create index if not exists job_matches_profile_id_idx on public.job_matches (profile_id);
create index if not exists job_matches_owner_id_idx on public.job_matches (owner_id);

alter table public.job_matches enable row level security;

drop policy if exists "owner read job_matches" on public.job_matches;
create policy "owner read job_matches"
on public.job_matches
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write job_matches" on public.job_matches;
create policy "owner write job_matches"
on public.job_matches
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update job_matches" on public.job_matches;
create policy "owner update job_matches"
on public.job_matches
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete job_matches" on public.job_matches;
create policy "owner delete job_matches"
on public.job_matches
for delete
using (auth.uid() = owner_id);

drop trigger if exists job_matches_set_updated_at on public.job_matches;
create trigger job_matches_set_updated_at
before update on public.job_matches
for each row
execute function public.set_updated_at();

create table if not exists public.scraping_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  total_sources integer not null default 0,
  successful_sources integer not null default 0,
  failed_sources integer not null default 0,
  jobs_found integer not null default 0,
  jobs_inserted integer not null default 0,
  jobs_updated integer not null default 0,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists scraping_runs_started_at_idx on public.scraping_runs (started_at desc);
create index if not exists scraping_runs_status_idx on public.scraping_runs (status);
create index if not exists scraping_runs_owner_id_idx on public.scraping_runs (owner_id);

alter table public.scraping_runs enable row level security;

drop policy if exists "owner read scraping_runs" on public.scraping_runs;
create policy "owner read scraping_runs"
on public.scraping_runs
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write scraping_runs" on public.scraping_runs;
create policy "owner write scraping_runs"
on public.scraping_runs
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update scraping_runs" on public.scraping_runs;
create policy "owner update scraping_runs"
on public.scraping_runs
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete scraping_runs" on public.scraping_runs;
create policy "owner delete scraping_runs"
on public.scraping_runs
for delete
using (auth.uid() = owner_id);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  sent_at timestamptz not null default timezone('utc', now()),
  recipient text not null,
  subject text not null,
  jobs_included integer not null default 0,
  status text not null check (status in ('sent', 'failed', 'skipped', 'queued')),
  provider_response jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_logs_sent_at_idx on public.email_logs (sent_at desc);
create index if not exists email_logs_owner_id_idx on public.email_logs (owner_id);

alter table public.email_logs enable row level security;

drop policy if exists "owner read email_logs" on public.email_logs;
create policy "owner read email_logs"
on public.email_logs
for select
using (auth.uid() = owner_id);

drop policy if exists "owner write email_logs" on public.email_logs;
create policy "owner write email_logs"
on public.email_logs
for insert
with check (auth.uid() = owner_id);

drop policy if exists "owner update email_logs" on public.email_logs;
create policy "owner update email_logs"
on public.email_logs
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "owner delete email_logs" on public.email_logs;
create policy "owner delete email_logs"
on public.email_logs
for delete
using (auth.uid() = owner_id);

create or replace function public.ensure_private_cvs_bucket()
returns void
language plpgsql
as $$
begin
  insert into storage.buckets (id, name, public)
  values ('cvs', 'cvs', false)
  on conflict (id) do update
  set public = excluded.public,
      name = excluded.name;
end;
$$;

select public.ensure_private_cvs_bucket();

drop policy if exists "owner read cvs objects" on storage.objects;
create policy "owner read cvs objects"
on storage.objects
for select
using (bucket_id = 'cvs' and owner = auth.uid());

drop policy if exists "owner write cvs objects" on storage.objects;
create policy "owner write cvs objects"
on storage.objects
for insert
with check (bucket_id = 'cvs' and owner = auth.uid());

drop policy if exists "owner update cvs objects" on storage.objects;
create policy "owner update cvs objects"
on storage.objects
for update
using (bucket_id = 'cvs' and owner = auth.uid())
with check (bucket_id = 'cvs' and owner = auth.uid());

drop policy if exists "owner delete cvs objects" on storage.objects;
create policy "owner delete cvs objects"
on storage.objects
for delete
using (bucket_id = 'cvs' and owner = auth.uid());

commit;
