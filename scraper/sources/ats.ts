import type { SourceParser } from '@/scraper/types';
import { parseLiveJobsForSource } from './live';

export const atsParser: SourceParser = {
  parse: async (source) => parseLiveJobsForSource(source),
};
