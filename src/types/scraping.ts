export interface ScrapingRun {
  readonly id: string;
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly status: 'running' | 'success' | 'partial' | 'failed';
  readonly total_sources: number;
  readonly successful_sources: number;
  readonly failed_sources: number;
  readonly jobs_found: number;
  readonly jobs_inserted: number;
  readonly jobs_updated: number;
  readonly error_summary: string | null;
  readonly duration_ms: number | null;
  readonly created_at: string;
}
