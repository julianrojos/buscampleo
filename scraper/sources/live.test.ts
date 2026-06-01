import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLiveJobsForSource } from './live';

test('parseLiveJobsForSource extracts JSON-LD job postings from HTML pages', async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('example.com/jobs')) {
      return new Response(
        `
          <html>
            <head>
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  "title": "Senior Design Systems Designer",
                  "url": "https://example.com/design-systems-designer",
                  "description": "Figma, CSS and Storybook with engineering collaboration.",
                  "hiringOrganization": { "@type": "Organization", "name": "Acme Studio" },
                  "jobLocation": { "@type": "Place", "address": { "addressLocality": "Remote" } },
                  "datePosted": "2026-06-01"
                }
              </script>
            </head>
          </html>
        `,
        { status: 200, headers: { 'content-type': 'text/html' } },
      );
    }

    return new Response('', { status: 404 });
  }) as typeof fetch;

  const bundles = await parseLiveJobsForSource({
    id: 'source-1',
    name: 'Example Source',
    url: 'https://example.com/jobs',
    type: 'scrape',
    category: 'design-systems',
    active: true,
    priority: 1,
    parser_key: 'example-html',
    last_success_at: null,
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 0,
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0]?.job.title, 'Senior Design Systems Designer');
  assert.equal(bundles[0]?.job.company, 'Acme Studio');
  assert.equal(bundles[0]?.job.modality, 'remote');
  assert.ok(bundles[0]?.job.detected_skills.includes('Figma'));
});

test('parseLiveJobsForSource extracts RSS items', async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === 'https://example.com/jobs.rss') {
      return new Response(
        `
          <rss version="2.0">
            <channel>
              <item>
                <title>UI Engineer</title>
                <link>https://example.com/ui-engineer</link>
                <description>CSS and design to code collaboration.</description>
              </item>
            </channel>
          </rss>
        `,
        { status: 200, headers: { 'content-type': 'application/rss+xml' } },
      );
    }

    return new Response('', { status: 404 });
  }) as typeof fetch;

  const bundles = await parseLiveJobsForSource({
    id: 'source-2',
    name: 'Example Feed',
    url: 'https://example.com/jobs.rss',
    type: 'rss',
    category: 'design-engineering',
    active: true,
    priority: 1,
    parser_key: 'example-rss',
    last_success_at: null,
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 0,
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0]?.job.title, 'UI Engineer');
  assert.equal(bundles[0]?.job.url, 'https://example.com/ui-engineer');
  assert.ok(bundles[0]?.job.positive_signals.length > 0);
  assert.deepEqual(requestedUrls, ['https://example.com/jobs.rss']);
});

test('parseLiveJobsForSource resolves root RSS URLs to /feed', async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === 'https://example.com/feed') {
      return new Response(
        `
          <rss version="2.0">
            <channel>
              <item>
                <title>Design Engineer</title>
                <link>https://example.com/design-engineer</link>
                <description>Design systems and CSS.</description>
              </item>
            </channel>
          </rss>
        `,
        { status: 200, headers: { 'content-type': 'application/rss+xml' } },
      );
    }

    return new Response('', { status: 404 });
  }) as typeof fetch;

  const bundles = await parseLiveJobsForSource({
    id: 'source-2b',
    name: 'Example Root Feed',
    url: 'https://example.com/',
    type: 'rss',
    category: 'design-engineering',
    active: true,
    priority: 1,
    parser_key: 'example-rss',
    last_success_at: null,
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 0,
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0]?.job.title, 'Design Engineer');
  assert.deepEqual(requestedUrls, ['https://example.com/feed']);
});

test('parseLiveJobsForSource does not duplicate explicit feed suffixes', async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === 'https://example.com/feed') {
      return new Response(
        `
          <rss version="2.0">
            <channel>
              <item>
                <title>Senior Product Designer</title>
                <link>https://example.com/senior-product-designer</link>
                <description>Accessibility and collaboration.</description>
              </item>
            </channel>
          </rss>
        `,
        { status: 200, headers: { 'content-type': 'application/rss+xml' } },
      );
    }

    return new Response('', { status: 404 });
  }) as typeof fetch;

  const bundles = await parseLiveJobsForSource({
    id: 'source-2c',
    name: 'Example Explicit Feed',
    url: 'https://example.com/feed',
    type: 'rss',
    category: 'design-engineering',
    active: true,
    priority: 1,
    parser_key: 'example-rss',
    last_success_at: null,
    last_error_at: null,
    consecutive_failures: 0,
    offers_found: 0,
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(bundles.length, 1);
  assert.equal(bundles[0]?.job.title, 'Senior Product Designer');
  assert.deepEqual(requestedUrls, ['https://example.com/feed']);
});

test('parseLiveJobsForSource fails fast when a live source returns an error', async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;

  await assert.rejects(
    parseLiveJobsForSource({
      id: 'source-3',
      name: 'Broken Feed',
      url: 'https://example.com/broken.rss',
      type: 'rss',
      category: 'generalist',
      active: true,
      priority: 1,
      parser_key: 'broken-rss',
      last_success_at: null,
      last_error_at: null,
      consecutive_failures: 0,
      offers_found: 0,
      notes: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    }),
    /fetch_failed:404/,
  );
});

test('parseLiveJobsForSource surfaces fetch timeouts', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;

  t.after(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: originalTimeout,
    });
  });

  Object.defineProperty(AbortSignal, 'timeout', {
    configurable: true,
    value: () => AbortSignal.abort(),
  });

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }

    return new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        },
        { once: true },
      );
    });
  }) as typeof fetch;

  await assert.rejects(
    parseLiveJobsForSource({
      id: 'source-4',
      name: 'Slow Site',
      url: 'https://example.com/slow',
      type: 'scrape',
      category: 'generalist',
      active: true,
      priority: 1,
      parser_key: 'slow-html',
      last_success_at: null,
      last_error_at: null,
      consecutive_failures: 0,
      offers_found: 0,
      notes: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    }),
    /fetch_timeout/,
  );
});
