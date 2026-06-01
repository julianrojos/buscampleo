import { addScrapingRun } from '@/data/scraping-run-repository';
import { listJobs, replaceJobs } from '@/data/job-repository';
import { listSources, updateSourceRunInfo } from '@/data/source-repository';
import { dedupeJobs } from './utils/normalize';
import { apiParser } from './sources/api';
import { atsParser } from './sources/ats';
import { manualParser } from './sources/manual';
import { rssParser } from './sources/rss';
import { scrapeParser } from './sources/scrape';
import type { SourceParser } from './types';
import type { Job } from '@/types/job';
import type { Source } from '@/types/source';

const PARSERS: Record<Source['type'], SourceParser> = {
  api: apiParser,
  ats: atsParser,
  manual: manualParser,
  rss: rssParser,
  scrape: scrapeParser,
};

function nowIso(): string {
  return new Date().toISOString();
}

async function runScraper() {
  const startedAt = nowIso();
  const remoteAccess = { allowServiceRole: true } as const;
  const sources = (await listSources(remoteAccess)).filter((source) => source.active);
  const initialJobs = await listJobs(undefined, remoteAccess);
  const fetchedJobs: Job[] = [];
  let successfulSources = 0;
  let failedSources = 0;

  for (const source of sources) {
    const parser = PARSERS[source.type];

    try {
      const bundles = await parser.parse(source);
      for (const bundle of bundles) {
        fetchedJobs.push({
          ...bundle.job,
          source_id: source.id,
          source_name: source.name,
          source_category: source.category,
        });
      }
      successfulSources += 1;
      await updateSourceRunInfo(
        source.id,
        {
          last_success_at: nowIso(),
          last_error_at: null,
          consecutive_failures: 0,
          offers_found: bundles.length,
        },
        remoteAccess,
      ).catch((error) => {
        console.warn('[scraper] source health update failed', {
          source: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } catch {
      await updateSourceRunInfo(
        source.id,
        {
          last_success_at: source.last_success_at,
          last_error_at: nowIso(),
          consecutive_failures: source.consecutive_failures + 1,
          offers_found: source.offers_found,
        },
        remoteAccess,
      ).catch((error) => {
        console.warn('[scraper] source error update failed', {
          source: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
      failedSources += 1;
    }
  }

  const nextJobs = dedupeJobs([...initialJobs, ...fetchedJobs]);
  await replaceJobs(nextJobs, undefined, remoteAccess);

  await addScrapingRun(
    {
      started_at: startedAt,
      finished_at: nowIso(),
      status: failedSources > 0 ? (successfulSources > 0 ? 'partial' : 'failed') : 'success',
      total_sources: sources.length,
      successful_sources: successfulSources,
      failed_sources: failedSources,
      jobs_found: fetchedJobs.length,
      jobs_inserted: Math.max(0, nextJobs.length - initialJobs.length),
      jobs_updated: fetchedJobs.length,
      error_summary:
        failedSources > 0 ? `${failedSources} fuentes fallaron durante el scraping.` : null,
      duration_ms: null,
    },
    undefined,
    remoteAccess,
  );
}

runScraper().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
