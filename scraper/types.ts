import type { Job } from '@/types/job';
import type { Source } from '@/types/source';

export interface ParsedJobBundle {
  readonly job: Job;
  readonly source: Source;
}

export interface SourceParser {
  readonly parse: (source: Source) => Promise<readonly ParsedJobBundle[]>;
}
