export type EmailDigestFrequency = 'daily' | 'weekly' | 'high-score';

export type KeywordPolarity = 'positive' | 'negative';

export interface UserProfile {
  readonly id: string;
  readonly owner_id: string;
  readonly headline: string;
  readonly summary: string;
  readonly skills_text: string;
  readonly linkedin_url: string;
  readonly linkedin_text: string;
  readonly cv_file_name: string | null;
  readonly cv_storage_path: string | null;
  readonly cv_extracted_text: string | null;
  readonly cv_uploaded_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface UserSettings {
  readonly id: string;
  readonly owner_id: string;
  readonly email_enabled: boolean;
  readonly email_recipient: string;
  readonly email_frequency: EmailDigestFrequency;
  readonly min_score: number;
  readonly max_jobs: number;
  readonly include_unanalyzed: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface KeywordEntry {
  readonly id: string;
  readonly owner_id: string;
  readonly term: string;
  readonly polarity: KeywordPolarity;
  readonly category: string;
  readonly active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface JobMatch {
  readonly id: string;
  readonly owner_id: string;
  readonly job_id: string;
  readonly profile_id: string;
  readonly analysis_status: 'pending' | 'queued' | 'done' | 'error';
  readonly overall_score: number | null;
  readonly semantic_score: number | null;
  readonly profile_match_score: number | null;
  readonly summary: string | null;
  readonly strengths: string[];
  readonly gaps: string[];
  readonly recommendations: string[];
  readonly detected_keywords: string[];
  readonly detected_skills: string[];
  readonly model: string | null;
  readonly raw_response: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface EmailLog {
  readonly id: string;
  readonly owner_id: string;
  readonly status: 'queued' | 'sent' | 'failed' | 'skipped';
  readonly provider: string;
  readonly recipient_email: string;
  readonly subject: string;
  readonly jobs_included: string[];
  readonly payload: Record<string, unknown> | null;
  readonly provider_message_id: string | null;
  readonly error_message: string | null;
  readonly sent_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
