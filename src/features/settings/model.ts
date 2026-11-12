import { DEFAULT_LAST_SEASON, FDR_DEFAULT_GAMEWEEK_WEIGHTS } from '@/config/fdr';
import { DEFAULT_LEAGUE_SETTINGS } from '@/config/league';
import { validateGameweekWeights } from '@/domain/fdr';
import { isMonthKey, isValidTimeZone, type MonthKey } from '@/domain/league';

/** Firestore `settings/league`. */
export interface LeagueSettings {
  leagueId: number;
  timeZone: string;
}

/**
 * Firestore `settings/fdr` (editable fields). Position weights are not stored: they follow the
 * number of finished gameweeks automatically (see positionWeightsAfter).
 */
export interface FdrSettings {
  /** Weight per gameweek of the 5-GW window, nearest first. Always sums to 10. */
  gameweekWeights: number[];
  /** Season the positions refer to, e.g. "2025/26". Set automatically when an admin saves. */
  lastSeasonLabel: string;
  /** Final position by FPL team code. Missing teams (promoted) use the default position. */
  lastSeasonPositions: Record<number, number>;
}

/** Audit fields stored with every settings document. */
export interface UpdateMeta {
  updatedAt: Date | null;
  updatedBy: string | null;
}

export type StoredFdrSettings = FdrSettings & UpdateMeta;

/**
 * Firestore `settings/calendar`: gameweeks an admin moved to the previous/next month.
 * Only applies to the season it was saved for (gameweek ids repeat every season).
 */
export interface CalendarSettings {
  season: string | null;
  /** Gameweek id → month key, only for gameweeks moved away from their deadline month. */
  gameweekMonths: Record<number, MonthKey>;
}

export const DEFAULT_CALENDAR: CalendarSettings = { season: null, gameweekMonths: {} };

export const DEFAULT_LEAGUE: LeagueSettings = { ...DEFAULT_LEAGUE_SETTINGS };

export const DEFAULT_FDR: FdrSettings = {
  gameweekWeights: [...FDR_DEFAULT_GAMEWEEK_WEIGHTS],
  lastSeasonLabel: DEFAULT_LAST_SEASON.label,
  lastSeasonPositions: { ...DEFAULT_LAST_SEASON.positions },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidLeagueId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 1e10;
}

export function isValidPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20;
}

export function parseUpdateMeta(data: unknown): UpdateMeta {
  if (!isRecord(data)) return { updatedAt: null, updatedBy: null };
  const at = data.updatedAt;
  return {
    updatedAt: isRecord(at) && typeof at.toDate === 'function' ? (at.toDate as () => Date)() : null,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

/** Tolerant parse of `settings/league`: invalid or missing fields fall back to defaults. */
export function parseLeagueSettings(data: unknown): LeagueSettings {
  if (!isRecord(data)) return DEFAULT_LEAGUE;
  return {
    leagueId: isValidLeagueId(data.leagueId) ? data.leagueId : DEFAULT_LEAGUE.leagueId,
    timeZone:
      typeof data.timeZone === 'string' && isValidTimeZone(data.timeZone)
        ? data.timeZone
        : DEFAULT_LEAGUE.timeZone,
  };
}

function parseGameweekWeights(value: unknown): number[] {
  if (
    Array.isArray(value) &&
    value.every((w): w is number => typeof w === 'number') &&
    validateGameweekWeights(value) === null
  ) {
    return [...value];
  }
  return [...DEFAULT_FDR.gameweekWeights];
}

/** Tolerant parse of `settings/fdr`: invalid or missing fields fall back to defaults. */
export function parseFdrSettings(data: unknown): FdrSettings {
  if (!isRecord(data)) return DEFAULT_FDR;
  const positions: Record<number, number> = {};
  if (isRecord(data.lastSeasonPositions)) {
    for (const [code, position] of Object.entries(data.lastSeasonPositions)) {
      const teamCode = Number(code);
      if (Number.isInteger(teamCode) && isValidPosition(position)) positions[teamCode] = position;
    }
  }
  return {
    gameweekWeights: parseGameweekWeights(data.gameweekWeights),
    lastSeasonLabel:
      typeof data.lastSeasonLabel === 'string' ? data.lastSeasonLabel : DEFAULT_FDR.lastSeasonLabel,
    lastSeasonPositions: isRecord(data.lastSeasonPositions)
      ? positions
      : DEFAULT_FDR.lastSeasonPositions,
  };
}

/** Tolerant parse of `settings/calendar`. */
export function parseCalendarSettings(data: unknown): CalendarSettings {
  if (!isRecord(data)) return DEFAULT_CALENDAR;
  const gameweekMonths: Record<number, MonthKey> = {};
  if (isRecord(data.gameweekMonths)) {
    for (const [id, month] of Object.entries(data.gameweekMonths)) {
      const gw = Number(id);
      if (
        Number.isInteger(gw) &&
        gw >= 1 &&
        gw <= 38 &&
        typeof month === 'string' &&
        isMonthKey(month)
      ) {
        gameweekMonths[gw] = month;
      }
    }
  }
  return { season: typeof data.season === 'string' ? data.season : null, gameweekMonths };
}
