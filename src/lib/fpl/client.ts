import type {
  FplBootstrapResponse,
  FplEntryHistoryResponse,
  FplEventStatusResponse,
  FplFixture,
  FplLeagueStandingsResponse,
} from './types';

/**
 * All FPL calls go through our same-origin proxy because the FPL API has no CORS headers:
 *   GET /api/fpl?path=<fpl path>&<params>
 * Served by the Vercel Function in api/fpl.ts (and by the same handler inside Vite in dev).
 * Any new endpoint must also be added to FPL_ROUTES in api/fpl.ts.
 */
const API_BASE = (import.meta.env.VITE_FPL_API_BASE || '/api/fpl').replace(/\/+$/, '');

/** Safety cap when paging through league standings (50 entries per page). */
const MAX_LEAGUE_PAGES = 20;

type QueryParams = Record<string, string | number>;

export function fplProxyUrl(path: string, params: QueryParams = {}): string {
  const search = new URLSearchParams({ path });
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `${API_BASE}?${search.toString()}`;
}

export class FplApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FplApiError';
    this.status = status;
  }

  /** 4xx errors (bad league / entry id) will not succeed on retry. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

async function fplGet<T>(path: string, params: QueryParams, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(fplProxyUrl(path, params), {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new FplApiError('Could not reach the FPL API. Check your connection.', 0);
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? 'Not found on FPL (check the league / entry id).'
        : response.status === 503
          ? 'FPL is updating right now. Try again in a few minutes.'
          : `FPL API error (${response.status}).`;
    throw new FplApiError(message, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    // During game updates FPL sometimes answers 200 with an HTML/text page.
    throw new FplApiError('FPL returned an unexpected response. It may be updating.', 502);
  }
}

export const fplApi = {
  bootstrap: (signal?: AbortSignal) =>
    fplGet<FplBootstrapResponse>('bootstrap-static/', {}, signal),

  /** Processing state of the current gameweek (live / bonus added / tables updating). */
  eventStatus: (signal?: AbortSignal) =>
    fplGet<FplEventStatusResponse>('event-status/', {}, signal),

  /** Every fixture of the season (past and future). */
  fixtures: (signal?: AbortSignal) => fplGet<FplFixture[]>('fixtures/', {}, signal),

  leagueStandingsPage: (leagueId: number, page: number, signal?: AbortSignal) =>
    fplGet<FplLeagueStandingsResponse>(
      `leagues-classic/${leagueId}/standings/`,
      { page_new_entries: 1, page_standings: page, phase: 1 },
      signal,
    ),

  entryHistory: (entryId: number, signal?: AbortSignal) =>
    fplGet<FplEntryHistoryResponse>(`entry/${entryId}/history/`, {}, signal),
};

/** Fetches every page of a classic league's standings. */
export async function fetchAllLeagueStandings(
  leagueId: number,
  signal?: AbortSignal,
): Promise<{ leagueName: string; results: FplLeagueStandingsResponse['standings']['results'] }> {
  const results: FplLeagueStandingsResponse['standings']['results'] = [];
  let leagueName = '';
  for (let page = 1; page <= MAX_LEAGUE_PAGES; page += 1) {
    const data = await fplApi.leagueStandingsPage(leagueId, page, signal);
    leagueName = data.league.name;
    results.push(...data.standings.results);
    // Stop at the last page — or if the API ignored the page parameter (avoids duplicates).
    if (!data.standings.has_next || data.standings.page !== page) break;
  }
  return { leagueName, results };
}
