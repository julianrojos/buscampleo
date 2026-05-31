import type { SourceParser } from '@/scraper/types';
import { parseMockJobsForSource } from './shared';

export const atsParser: SourceParser = {
  parse: async (source) => parseMockJobsForSource(source),
};
