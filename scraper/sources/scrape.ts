import type { SourceParser } from '@/scraper/types';
import { parseLiveJobsForSource } from './live';

export const scrapeParser: SourceParser = {
  parse: async (source) => parseLiveJobsForSource(source),
};
