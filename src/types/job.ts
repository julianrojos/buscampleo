export type JobStatus = 'new' | 'seen' | 'saved' | 'hidden' | 'applied';

export type JobModality = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type JobAnalysisStatus = 'pending' | 'queued' | 'done' | 'error';

export interface JobSignalGroup {
  readonly items: string[];
  readonly summary?: string;
}

export interface Job {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  readonly url: string;
  readonly normalized_url: string;
  readonly description: string | null;
  readonly summary: string | null;
  readonly location: string | null;
  readonly modality: JobModality;
  readonly salary_min: number | null;
  readonly salary_max: number | null;
  readonly salary_currency: string | null;
  readonly seniority: string | null;
  readonly language: string | null;
  readonly source_id: string;
  readonly source_name: string;
  readonly source_category: string;
  readonly published_at: string | null;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly scraped_at: string | null;
  readonly status: JobStatus;
  readonly analysis_status: JobAnalysisStatus;
  readonly is_read: boolean;
  readonly is_saved: boolean;
  readonly is_hidden: boolean;
  readonly source_quality_score: number | null;
  readonly keyword_score: number | null;
  readonly semantic_score: number | null;
  readonly profile_match_score: number | null;
  readonly final_score: number | null;
  readonly positive_signals: string[];
  readonly red_flags: string[];
  readonly detected_skills: string[];
  readonly detected_keywords: string[];
  readonly raw_payload: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}
