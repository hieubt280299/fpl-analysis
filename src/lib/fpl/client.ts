import type {
  FplBootstrapResponse,
  FplEntryHistoryResponse,
  FplFixture,
  FplLeagueStandingsResponse,
} from './types';

/**
 * All FPL calls go through a same-origin proxy (`/api/fpl`) because the FPL API has no CORS
 * headers. Dev: Vite proxy (vite.config.ts). Prod: Cloud Function `fplProxy` (functions/src).
 * Any new endpoint must also be added to the function's allow-list.
 */
const API_BASE = (import.meta.env.VITE_FPL_API_BASE || '/api/fpl').replace(/\/+$/, '');

/** Safety cap when paging through league standings (50 entries per page). */
const MAX_LEAGUE_PAGES = 20;

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

async function fplGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
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
  bootstrap: (signal?: AbortSignal) => fplGet<FplBootstrapResponse>('bootstrap-static/', signal),

  /** Every fixture of the season (past and future). */
  fixtures: (signal?: AbortSignal) => fplGet<FplFixture[]>('fixtures/', signal),

  leagueStandingsPage: (leagueId: number, page: number, signal?: AbortSignal) =>
    fplGet<FplLeagueStandingsResponse>(
      `leagues-classic/${leagueId}/standings/?page_new_entries=1&page_standings=${page}&phase=1`,
      signal,
    ),

  entryHistory: (entryId: number, signal?: AbortSignal) =>
    fplGet<FplEntryHistoryResponse>(`entry/${entryId}/history/`, signal),
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
    if (!data.standings.has_next) break;
  }
  return { leagueName, results };
}
