export type SourceType = 'rss' | 'api' | 'ats' | 'scrape' | 'manual';

export type SourceCategory =
  | 'niche-design'
  | 'design-systems'
  | 'design-engineering'
  | 'remote'
  | 'generalist'
  | 'newsletter'
  | 'community'
  | 'ats-direct';

export interface Source {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly type: SourceType;
  readonly category: SourceCategory;
  readonly active: boolean;
  readonly priority: number;
  readonly parser_key: string | null;
  readonly last_success_at: string | null;
  readonly last_error_at: string | null;
  readonly consecutive_failures: number;
  readonly offers_found: number;
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
