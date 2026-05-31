import type { SourceParser } from '@/scraper/types';
import { parseMockJobsForSource } from './shared';

export const rssParser: SourceParser = {
  parse: async (source) => parseMockJobsForSource(source),
};
