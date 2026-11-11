import { DEFAULT_LAST_SEASON, FDR_DEFAULT_LAST_SEASON_WEIGHT } from '@/config/fdr';
import { DEFAULT_LEAGUE_SETTINGS } from '@/config/league';
import { isValidTimeZone } from '@/domain/league';

/** Firestore `settings/league`. */
export interface LeagueSettings {
  leagueId: number;
  timeZone: string;
}

/** Firestore `settings/fdr`. */
export interface FdrSettings {
  /** Weight of last season's position (0–1). This season's weight is `1 - lastSeasonWeight`. */
  lastSeasonWeight: number;
  /** Season the positions refer to, e.g. "2025/26" (display only). */
  lastSeasonLabel: string;
  /** Final position by FPL team code. Missing teams (promoted) use the default position. */
  lastSeasonPositions: Record<number, number>;
}

export const DEFAULT_LEAGUE: LeagueSettings = { ...DEFAULT_LEAGUE_SETTINGS };

export const DEFAULT_FDR: FdrSettings = {
  lastSeasonWeight: FDR_DEFAULT_LAST_SEASON_WEIGHT,
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

/** Tolerant parse of `settings/fdr`: invalid or missing fields fall back to defaults. */
export function parseFdrSettings(data: unknown): FdrSettings {
  if (!isRecord(data)) return DEFAULT_FDR;
  const weight = data.lastSeasonWeight;
  const positions: Record<number, number> = {};
  if (isRecord(data.lastSeasonPositions)) {
    for (const [code, position] of Object.entries(data.lastSeasonPositions)) {
      const teamCode = Number(code);
      if (Number.isInteger(teamCode) && isValidPosition(position)) positions[teamCode] = position;
    }
  }
  return {
    lastSeasonWeight:
      typeof weight === 'number' && weight >= 0 && weight <= 1
        ? weight
        : DEFAULT_FDR.lastSeasonWeight,
    lastSeasonLabel:
      typeof data.lastSeasonLabel === 'string' ? data.lastSeasonLabel : DEFAULT_FDR.lastSeasonLabel,
    lastSeasonPositions: isRecord(data.lastSeasonPositions)
      ? positions
      : DEFAULT_FDR.lastSeasonPositions,
  };
}
