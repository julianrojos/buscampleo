import type { SourceParser } from '@/scraper/types';
import { parseLiveJobsForSource } from './live';

export const rssParser: SourceParser = {
  parse: async (source) => parseLiveJobsForSource(source),
};
