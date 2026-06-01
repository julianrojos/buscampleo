import { createRecordId } from '@/data/id';
import type { ParsedJobBundle } from '../types';
import { normalizeUrl } from '../utils/normalize';
import type { Job } from '@/types/job';
import type { Source } from '@/types/source';

import { parseMockJobsForSource } from './shared';

interface JobPostingRecord {
  readonly title: string;
  readonly url: string;
  readonly description: string | null;
  readonly company: string;
  readonly location: string | null;
  readonly publishedAt: string | null;
  readonly employmentType: string | null;
  readonly rawPayload: Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

function resolveFeedUrl(url: string): string {
  const lower = url.toLowerCase();
  if (
    lower.endsWith('.xml') ||
    lower.endsWith('.rss') ||
    lower.endsWith('.atom') ||
    lower.endsWith('/feed')
  ) {
    return url;
  }

  return `${url.replace(/\/$/, '')}/feed`;
}

function detectModality(text: string): Job['modality'] {
  const normalized = normalizeText(text);
  if (normalized.includes('remote')) return 'remote';
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('onsite') || normalized.includes('on-site') || normalized.includes('presencial')) {
    return 'onsite';
  }
  return 'unknown';
}

function detectSeniority(text: string): string | null {
  const normalized = normalizeText(text);
  if (/(staff|principal|lead|head)/.test(normalized)) return 'Senior';
  if (/(senior|sr\.?)/.test(normalized)) return 'Senior';
  if (/(mid|semi senior|semisenior)/.test(normalized)) return 'Mid';
  if (/(junior|jr\.?|entry|graduate|trainee)/.test(normalized)) return 'Junior';
  return null;
}

function detectKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const keywords = [
    'design systems',
    'design tokens',
    'figma',
    'storybook',
    'css',
    'html',
    'accessibility',
    'react',
    'typescript',
    'tailwind',
    'developer handoff',
    'design to code',
    'product designer',
    'ui designer',
    'design engineer',
    'remote',
  ];

  return unique(keywords.filter((keyword) => normalized.includes(normalizeText(keyword))));
}

function detectSignals(text: string): { positive: string[]; redFlags: string[]; skills: string[] } {
  const normalized = normalizeText(text);
  const positive = unique(
    [
      normalized.includes('design systems') ? 'Design Systems' : null,
      normalized.includes('figma') ? 'Figma' : null,
      normalized.includes('storybook') ? 'Storybook' : null,
      normalized.includes('collaboration') ? 'Engineering collaboration' : null,
      normalized.includes('accessibility') ? 'Accessibility' : null,
      normalized.includes('design to code') ? 'Design to code' : null,
    ].filter((value): value is string => Boolean(value)),
  );

  const redFlags = unique(
    [
      normalized.includes('equity only') ? 'Equity only' : null,
      normalized.includes('unpaid') ? 'Unpaid' : null,
      normalized.includes('volunteer') ? 'Volunteer' : null,
      normalized.includes('rockstar') ? 'Rockstar culture' : null,
      normalized.includes('ninja') ? 'Ninja culture' : null,
      normalized.includes('hustle') ? 'Hustle culture' : null,
    ].filter((value): value is string => Boolean(value)),
  );

  const skills = unique(
    [
      normalized.includes('figma') ? 'Figma' : null,
      normalized.includes('css') ? 'CSS' : null,
      normalized.includes('html') ? 'HTML' : null,
      normalized.includes('react') ? 'React' : null,
      normalized.includes('typescript') ? 'TypeScript' : null,
      normalized.includes('storybook') ? 'Storybook' : null,
      normalized.includes('accessibility') ? 'Accessibility' : null,
      normalized.includes('design systems') ? 'Design Systems' : null,
    ].filter((value): value is string => Boolean(value)),
  );

  return { positive, redFlags, skills };
}

function sourceQualityScore(source: Source): number {
  return (
    {
      'design-systems': 92,
      'design-engineering': 88,
      'niche-design': 84,
      remote: 78,
      newsletter: 72,
      community: 68,
      generalist: 60,
      'ats-direct': 76,
    }[source.category] ?? 60
  );
}

function pickUrl(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function textFromMaybeRichValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => textFromMaybeRichValue(item))
      .filter((item): item is string => Boolean(item))
      .join(' ')
      .trim();
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const text = [
      textFromMaybeRichValue(record.address),
      textFromMaybeRichValue(record.streetAddress),
      textFromMaybeRichValue(record.addressLocality),
      textFromMaybeRichValue(record.addressRegion),
      textFromMaybeRichValue(record.addressCountry),
      textFromMaybeRichValue(record.name),
    ]
      .filter((item): item is string => Boolean(item))
      .join(', ')
      .trim();
    return text || null;
  }

  return null;
}

function extractJobPostings(payload: unknown): JobPostingRecord[] {
  const records: JobPostingRecord[] = [];

  const visit = (value: unknown) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    const record = value as Record<string, unknown>;
    const type = record['@type'];

    if (Array.isArray(type) ? type.includes('JobPosting') : type === 'JobPosting') {
      const title = textFromMaybeRichValue(record.title) ?? textFromMaybeRichValue(record.name) ?? '';
      const url = pickUrl(record.url ?? record.mainEntityOfPage, '');
      const description = textFromMaybeRichValue(record.description);
      const company =
        textFromMaybeRichValue((record.hiringOrganization as Record<string, unknown> | undefined)?.name) ??
        '';
      const location = textFromMaybeRichValue(record.jobLocation);
      const publishedAt = textFromMaybeRichValue(record.datePosted);
      const employmentType = textFromMaybeRichValue(record.employmentType);

      if (title && url) {
        records.push({
          title,
          url,
          description,
          company: company || '',
          location,
          publishedAt,
          employmentType,
          rawPayload: record,
        });
      }
    }

    const graph = record['@graph'];
    if (graph) {
      visit(graph);
    }

    if (record.itemListElement) {
      visit(record.itemListElement);
    }
  };

  visit(payload);
  return records;
}

function extractJsonLdFromHtml(html: string): unknown[] {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const payloads: unknown[] = [];

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;

    try {
      payloads.push(JSON.parse(raw));
    } catch {
      continue;
    }
  }

  return payloads;
}

function parseJsonLdJobsFromHtml(html: string): JobPostingRecord[] {
  const payloads = extractJsonLdFromHtml(html);
  return payloads.flatMap((payload) => extractJobPostings(payload));
}

function parseRssItems(xml: string): JobPostingRecord[] {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];
  const jobs: JobPostingRecord[] = [];

  for (const item of items) {
    const block = item[0];
    const readTag = (tag: string): string | null => {
      const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
      return match?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() ?? null;
    };

    const title = readTag('title');
    const url = readTag('link');
    if (!title || !url) continue;

    jobs.push({
      title,
      url,
      description: readTag('description'),
      company: readTag('author') ?? '',
      location: null,
      publishedAt: readTag('pubDate'),
      employmentType: null,
      rawPayload: { title, url, description: readTag('description') },
    });
  }

  return jobs;
}

async function fetchText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Buscampleo/1.0 (+https://julianrojos.github.io/buscampleo)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: createTimeoutSignal(15_000),
    });

    if (!response.ok) {
      throw new Error(`fetch_failed:${response.status}`);
    }

    return response.text();
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('fetch_timeout');
    }

    throw error;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Buscampleo/1.0 (+https://julianrojos.github.io/buscampleo)',
        accept: 'application/json,text/plain,*/*',
      },
      signal: createTimeoutSignal(15_000),
    });

    if (!response.ok) {
      throw new Error(`fetch_failed:${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('fetch_timeout');
    }

    throw error;
  }
}

function buildJobBundle(source: Source, record: JobPostingRecord): ParsedJobBundle {
  const text = [
    record.title,
    record.company,
    record.description ?? '',
    record.location ?? '',
    record.employmentType ?? '',
    source.name,
    source.category,
  ].join(' ');
  const { positive, redFlags, skills } = detectSignals(text);
  const keywords = unique([...detectKeywords(text), ...skills]);
  const now = nowIso();
  const url = record.url || source.url;
  const modality = detectModality(text);
  const seniority = detectSeniority(text);

  const job: Job = {
    id: createRecordId('job'),
    title: record.title,
    company: record.company || source.name,
    url,
    normalized_url: normalizeUrl(url),
    description: record.description,
    summary: record.description?.slice(0, 240) ?? null,
    location: record.location,
    modality,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    seniority,
    language: null,
    source_id: source.id,
    source_name: source.name,
    source_category: source.category,
    published_at: record.publishedAt,
    first_seen_at: now,
    last_seen_at: now,
    scraped_at: now,
    status: 'new',
    analysis_status: 'pending',
    is_read: false,
    is_saved: false,
    is_hidden: false,
    source_quality_score: sourceQualityScore(source),
    keyword_score: null,
    semantic_score: null,
    profile_match_score: null,
    final_score: null,
    positive_signals: positive,
    red_flags: redFlags,
    detected_skills: skills,
    detected_keywords: keywords,
    raw_payload: record.rawPayload as Record<string, unknown>,
    created_at: now,
    updated_at: now,
  };

  return {
    source,
    job,
  };
}

async function parseHtmlSource(source: Source): Promise<ParsedJobBundle[]> {
  const html = await fetchText(source.url);
  const jobRecords = parseJsonLdJobsFromHtml(html);

  const detailUrls = extractJsonLdFromHtml(html)
    .flatMap((payload) => {
      if (!payload || typeof payload !== 'object') {
        return [] as string[];
      }
      const record = payload as Record<string, unknown>;
      const type = record['@type'];
      if (type === 'ItemList' || (Array.isArray(type) && type.includes('ItemList'))) {
        const items = Array.isArray(record.itemListElement) ? record.itemListElement : [];
        return items
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const itemRecord = item as Record<string, unknown>;
            const url = textFromMaybeRichValue(itemRecord.url ?? itemRecord.item);
            if (!url) return null;
            try {
              return new URL(url, source.url).toString();
            } catch {
              return url;
            }
          })
          .filter((item): item is string => Boolean(item));
      }
      return [] as string[];
    })
    .filter((url) => Boolean(url));

  const fetchedDetails = (
    await Promise.allSettled(
      detailUrls.slice(0, 8).map(async (detailUrl) => parseJsonLdJobsFromHtml(await fetchText(detailUrl))),
    )
  ).flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  const records = [...jobRecords, ...fetchedDetails];
  return records.map((record) => buildJobBundle(source, record));
}

async function parseRssSource(source: Source): Promise<ParsedJobBundle[]> {
  const xml = await fetchText(resolveFeedUrl(source.url));
  const records = parseRssItems(xml);
  return records.map((record) => buildJobBundle(source, record));
}

async function parseJsonSource(source: Source): Promise<ParsedJobBundle[]> {
  const payload = await fetchJson(source.url);

  const jobs = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      return (record.jobs as unknown[] | undefined) ?? (record.results as unknown[] | undefined) ?? (record.data as unknown[] | undefined) ?? [];
    }

    return [];
  })();

  const records = jobs.flatMap((item) => extractJobPostings(item));
  return records.map((record) => buildJobBundle(source, record));
}

export async function parseLiveJobsForSource(source: Source): Promise<readonly ParsedJobBundle[]> {
  if (source.type === 'manual') {
    return parseMockJobsForSource(source);
  }

  const parser =
    source.type === 'rss' || source.parser_key?.includes('rss')
      ? parseRssSource
      : source.type === 'api' || source.parser_key?.includes('api') || source.url.endsWith('.json')
        ? parseJsonSource
        : parseHtmlSource;

  try {
    return await parser(source);
  } catch (error) {
    console.warn('[scraper] live parser failed', {
      source: source.id,
      type: source.type,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
