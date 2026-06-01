import type { SourceParser } from '@/scraper/types';
import { parseLiveJobsForSource } from './live';

export const apiParser: SourceParser = {
  parse: async (source) => parseLiveJobsForSource(source),
};
