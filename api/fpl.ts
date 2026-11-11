/**
 * Vercel Function — read-only, allow-listed proxy to the public FPL API.
 *
 *   GET /api/fpl?path=<fpl path>&<allowed query params>
 *   e.g. /api/fpl?path=leagues-classic/758527/standings/&page_standings=1
 *
 * The FPL API sends no CORS headers, so the browser must call it through our own origin. The same
 * handler also runs inside the Vite dev/preview server (vite.config.ts), so dev and prod behave
 * identically. Responses carry `s-maxage` so Vercel's CDN caches them.
 *
 * Adding an FPL endpoint = add it to FPL_ROUTES (and to src/lib/fpl/client.ts).
 */

const FPL_API_ORIGIN = 'https://fantasy.premierleague.com/api/';
const UPSTREAM_TIMEOUT_MS = 15_000;

interface FplRoute {
  pattern: RegExp;
  /** Seconds Vercel's CDN may serve a cached successful response. */
  cdnTtl: number;
}

export const FPL_ROUTES: readonly FplRoute[] = [
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

export interface FplTarget {
  url: URL;
  cdnTtl: number;
}

/** Maps an incoming request URL to the upstream FPL URL, or null if it is not allow-listed. */
export function resolveFplTarget(requestUrl: URL): FplTarget | null {
  let path = (requestUrl.searchParams.get('path') ?? '').trim().replace(/^\/+/, '');
  if (!path.endsWith('/')) path += '/';
  const route = FPL_ROUTES.find((r) => r.pattern.test(path));
  if (!route) return null;

  const url = new URL(path, FPL_API_ORIGIN);
  for (const [key, value] of requestUrl.searchParams) {
    if (ALLOWED_QUERY_PARAMS.has(key) && /^[\w-]{1,20}$/.test(value)) {
      url.searchParams.set(key, value);
    }
  }
  return { url, cdnTtl: route.cdnTtl };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export async function handleFplRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET, HEAD' });
  }

  const target = resolveFplTarget(new URL(request.url));
  if (!target) return jsonResponse(404, { error: 'Unsupported FPL endpoint' });

  try {
    const upstream = await fetchImpl(target.url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; fpl-analysis/1.0)',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const body = await upstream.arrayBuffer();
    const ttl = target.cdnTtl;
    return new Response(request.method === 'HEAD' ? null : body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'Cache-Control': upstream.ok
          ? `public, max-age=${Math.min(ttl, 60)}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`
          : 'no-store',
      },
    });
  } catch (error) {
    console.error('FPL upstream request failed', target.url.pathname, error);
    return jsonResponse(502, { error: 'FPL API is unavailable' });
  }
}

/** Vercel Functions entry point (Web-standard signature). */
export function GET(request: Request): Promise<Response> {
  return handleFplRequest(request);
}
