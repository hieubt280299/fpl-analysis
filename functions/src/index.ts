/**
 * FPL API proxy.
 *
 * The public FPL API (https://fantasy.premierleague.com/api/) does not send CORS headers, so the
 * browser cannot call it directly. Firebase Hosting rewrites `/api/fpl/**` to this function, which
 * forwards a small allow-list of read-only endpoints and lets the Hosting CDN cache responses.
 *
 * Keep the allow-list in sync with `src/lib/fpl/client.ts` and the Vite dev proxy (vite.config.ts).
 */
import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import * as logger from 'firebase-functions/logger';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const FPL_API_ORIGIN = 'https://fantasy.premierleague.com/api/';
const HOSTING_PREFIX = '/api/fpl/';
const UPSTREAM_TIMEOUT_MS = 15_000;

interface Route {
  pattern: RegExp;
  /** Seconds the shared (CDN) cache may keep a successful response. */
  cdnTtl: number;
}

const ROUTES: readonly Route[] = [
  { pattern: /^bootstrap-static\/$/, cdnTtl: 300 },
  { pattern: /^fixtures\/$/, cdnTtl: 300 },
  { pattern: /^leagues-classic\/\d{1,10}\/standings\/$/, cdnTtl: 120 },
  { pattern: /^entry\/\d{1,10}\/$/, cdnTtl: 120 },
  { pattern: /^entry\/\d{1,10}\/history\/$/, cdnTtl: 60 },
];

const ALLOWED_QUERY_PARAMS = new Set([
  'future',
  'event',
  'page_standings',
  'page_new_entries',
  'phase',
]);

function normalisePath(rawPath: string): string {
  let path = rawPath.startsWith(HOSTING_PREFIX)
    ? rawPath.slice(HOSTING_PREFIX.length)
    : rawPath.replace(/^\/+/, '');
  if (!path.endsWith('/')) path += '/';
  return path;
}

export const fplProxy = onRequest(
  // Small, cheap instances; the Hosting CDN absorbs most traffic via s-maxage.
  { memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.set('Allow', 'GET, HEAD').status(405).json({ error: 'Method not allowed' });
      return;
    }

    const path = normalisePath(req.path);
    const route = ROUTES.find((r) => r.pattern.test(path));
    if (!route) {
      res.status(404).json({ error: `Unsupported FPL endpoint: ${path}` });
      return;
    }

    const url = new URL(path, FPL_API_ORIGIN);
    for (const [key, value] of Object.entries(req.query)) {
      if (
        ALLOWED_QUERY_PARAMS.has(key) &&
        typeof value === 'string' &&
        /^[\w-]{1,20}$/.test(value)
      ) {
        url.searchParams.set(key, value);
      }
    }

    try {
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; fpl-analysis/1.0)',
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const body = await upstream.text();

      res.status(upstream.status);
      res.set(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      );
      res.set(
        'Cache-Control',
        upstream.ok
          ? `public, max-age=${Math.min(route.cdnTtl, 60)}, s-maxage=${route.cdnTtl}`
          : 'no-store',
      );
      if (!upstream.ok) {
        logger.warn('FPL upstream returned an error', { path, status: upstream.status });
      }
      res.send(body);
    } catch (error) {
      logger.error('FPL upstream request failed', { path, error: String(error) });
      res.set('Cache-Control', 'no-store').status(502).json({ error: 'FPL API is unavailable' });
    }
  },
);
