import type { SourceParser } from '@/scraper/types';
import { parseMockJobsForSource } from './shared';

export const manualParser: SourceParser = {
  parse: async (source) => parseMockJobsForSource(source),
};
