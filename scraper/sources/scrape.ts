import type { SourceParser } from '@/scraper/types';
import { parseMockJobsForSource } from './shared';

export const scrapeParser: SourceParser = {
  parse: async (source) => parseMockJobsForSource(source),
};
