import type { SourceParser } from '@/scraper/types';
import { parseLiveJobsForSource } from './live';

export const manualParser: SourceParser = {
  parse: async (source) => parseLiveJobsForSource(source),
};
