import type { SourceParser } from '@/scraper/types';
import { parseMockJobsForSource } from './shared';

export const apiParser: SourceParser = {
  parse: async (source) => parseMockJobsForSource(source),
};
