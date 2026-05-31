export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          url: string;
          type: 'rss' | 'api' | 'ats' | 'scrape' | 'manual';
          category:
            | 'niche-design'
            | 'design-systems'
            | 'design-engineering'
            | 'remote'
            | 'generalist'
            | 'newsletter'
            | 'community'
            | 'ats-direct';
          active: boolean;
          priority: number;
          parser_key: string | null;
          last_success_at: string | null;
          last_error_at: string | null;
          consecutive_failures: number;
          offers_found: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          type: 'rss' | 'api' | 'ats' | 'scrape' | 'manual';
          category:
            | 'niche-design'
            | 'design-systems'
            | 'design-engineering'
            | 'remote'
            | 'generalist'
            | 'newsletter'
            | 'community'
            | 'ats-direct';
          active?: boolean;
          priority?: number;
          parser_key?: string | null;
          last_success_at?: string | null;
          last_error_at?: string | null;
          consecutive_failures?: number;
          offers_found?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sources']['Insert']>;
      };
      keywords: {
        Row: {
          id: string;
          term: string;
          type: 'include' | 'exclude';
          weight: number;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          term: string;
          type: 'include' | 'exclude';
          weight?: number;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['keywords']['Insert']>;
      };
      user_profile: {
        Row: {
          id: string;
          owner_id: string;
          headline: string | null;
          linkedin_url: string | null;
          linkedin_text: string | null;
          cv_text: string | null;
          cv_file_path: string | null;
          preferred_roles: Json;
          preferred_locations: Json;
          preferred_modalities: Json;
          preferred_keywords: Json;
          excluded_keywords: Json;
          skills: Json;
          languages: Json;
          portfolio_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          headline?: string | null;
          linkedin_url?: string | null;
          linkedin_text?: string | null;
          cv_text?: string | null;
          cv_file_path?: string | null;
          preferred_roles?: Json;
          preferred_locations?: Json;
          preferred_modalities?: Json;
          preferred_keywords?: Json;
          excluded_keywords?: Json;
          skills?: Json;
          languages?: Json;
          portfolio_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profile']['Insert']>;
      };
      settings: {
        Row: {
          owner_id: string;
          key: string;
          value: Json;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          owner_id?: string;
          key: string;
          value?: Json;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };
      jobs: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          company: string;
          url: string;
          normalized_url: string;
          description: string | null;
          summary: string | null;
          location: string | null;
          modality: 'remote' | 'hybrid' | 'onsite' | 'unknown';
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          seniority: string | null;
          language: string | null;
          source_id: string;
          source_name: string;
          source_category: string;
          published_at: string | null;
          first_seen_at: string;
          last_seen_at: string;
          scraped_at: string | null;
          status: 'new' | 'seen' | 'saved' | 'hidden' | 'applied';
          analysis_status: 'pending' | 'queued' | 'done' | 'error' | 'failed';
          is_read: boolean;
          is_saved: boolean;
          is_hidden: boolean;
          source_quality_score: number | null;
          keyword_score: number | null;
          semantic_score: number | null;
          profile_match_score: number | null;
          final_score: number | null;
          positive_signals: Json;
          red_flags: Json;
          detected_skills: Json;
          detected_keywords: Json;
          raw_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          company: string;
          url: string;
          normalized_url: string;
          description?: string | null;
          summary?: string | null;
          location?: string | null;
          modality: 'remote' | 'hybrid' | 'onsite' | 'unknown';
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          seniority?: string | null;
          language?: string | null;
          source_id: string;
          source_name: string;
          source_category: string;
          published_at?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          scraped_at?: string | null;
          status: 'new' | 'seen' | 'saved' | 'hidden' | 'applied';
          analysis_status: 'pending' | 'queued' | 'done' | 'error' | 'failed';
          is_read?: boolean;
          is_saved?: boolean;
          is_hidden?: boolean;
          source_quality_score?: number | null;
          keyword_score?: number | null;
          semantic_score?: number | null;
          profile_match_score?: number | null;
          final_score?: number | null;
          positive_signals?: Json;
          red_flags?: Json;
          detected_skills?: Json;
          detected_keywords?: Json;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      job_matches: {
        Row: {
          id: string;
          owner_id: string;
          job_id: string;
          profile_id: string;
          overall_score: number | null;
          hard_skills_score: number | null;
          design_systems_score: number | null;
          css_bridge_score: number | null;
          culture_score: number | null;
          location_score: number | null;
          seniority_score: number | null;
          matched_requirements: Json;
          missing_requirements: Json;
          ambiguous_requirements: Json;
          recommended_keywords: Json;
          cv_suggestions: Json;
          explanation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          job_id: string;
          profile_id: string;
          overall_score?: number | null;
          hard_skills_score?: number | null;
          design_systems_score?: number | null;
          css_bridge_score?: number | null;
          culture_score?: number | null;
          location_score?: number | null;
          seniority_score?: number | null;
          matched_requirements?: Json;
          missing_requirements?: Json;
          ambiguous_requirements?: Json;
          recommended_keywords?: Json;
          cv_suggestions?: Json;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['job_matches']['Insert']>;
      };
      scraping_runs: {
        Row: {
          id: string;
          owner_id: string;
          started_at: string;
          finished_at: string | null;
          status: 'running' | 'success' | 'partial' | 'failed';
          total_sources: number;
          successful_sources: number;
          failed_sources: number;
          jobs_found: number;
          jobs_inserted: number;
          jobs_updated: number;
          error_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          started_at?: string;
          finished_at?: string | null;
          status: 'running' | 'success' | 'partial' | 'failed';
          total_sources?: number;
          successful_sources?: number;
          failed_sources?: number;
          jobs_found?: number;
          jobs_inserted?: number;
          jobs_updated?: number;
          error_summary?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scraping_runs']['Insert']>;
      };
      email_logs: {
        Row: {
          id: string;
          owner_id: string;
          sent_at: string;
          recipient: string;
          subject: string;
          jobs_included: number;
          status: 'sent' | 'failed' | 'skipped' | 'queued';
          provider_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          sent_at?: string;
          recipient: string;
          subject: string;
          jobs_included?: number;
          status: 'sent' | 'failed' | 'skipped' | 'queued';
          provider_response?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_logs']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
