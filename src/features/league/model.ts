import type { Gameweek, GameweekScore, MonthKey, Participant, PrizeRules } from '@/domain/league';

/**
 * Frozen inputs of a finalized month. Results are always recomputed from these with the domain
 * functions, so a finalized month renders identically forever — even after the FPL API resets for
 * a new season or the league rules change.
 */
export interface MonthSnapshot {
  finalizedAt: string;
  gameweeks: Gameweek[];
  /** Keyed by entry id (stored as string keys in Firestore). */
  scores: Record<number, GameweekScore[]>;
  rules: PrizeRules;
}

/** Firestore `months/{YYYY-MM}`. */
export interface MonthDoc {
  monthKey: MonthKey;
  /** League the participants were picked from. */
  leagueId: number;
  participants: Participant[];
  status: 'open' | 'finalized';
  snapshot: MonthSnapshot | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseParticipant(value: unknown): Participant | null {
  if (!isRecord(value)) return null;
  const entryId = toNumber(value.entryId, NaN);
  if (!Number.isInteger(entryId) || entryId <= 0) return null;
  return {
    entryId,
    playerName: typeof value.playerName === 'string' ? value.playerName : `Entry ${entryId}`,
    entryName: typeof value.entryName === 'string' ? value.entryName : '',
  };
}

function parseGameweek(value: unknown): Gameweek | null {
  if (!isRecord(value) || typeof value.id !== 'number') return null;
  const status = value.status;
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : `Gameweek ${value.id}`,
    deadline: typeof value.deadline === 'string' ? value.deadline : '',
    status:
      status === 'upcoming' || status === 'live' || status === 'finished' ? status : 'finished',
    dataChecked: value.dataChecked === true,
  };
}

function parseScore(value: unknown): GameweekScore | null {
  if (!isRecord(value) || typeof value.gameweek !== 'number') return null;
  return {
    gameweek: value.gameweek,
    points: toNumber(value.points),
    transferCost: toNumber(value.transferCost),
    benchPoints: toNumber(value.benchPoints),
    chip: typeof value.chip === 'string' ? value.chip : null,
  };
}

function parseSnapshot(value: unknown): MonthSnapshot | null {
  if (!isRecord(value)) return null;
  const scores: Record<number, GameweekScore[]> = {};
  if (isRecord(value.scores)) {
    for (const [entryId, list] of Object.entries(value.scores)) {
      if (!Array.isArray(list)) continue;
      scores[Number(entryId)] = list.map(parseScore).filter((s): s is GameweekScore => s !== null);
    }
  }
  const rules = isRecord(value.rules) ? value.rules : {};
  return {
    finalizedAt: typeof value.finalizedAt === 'string' ? value.finalizedAt : '',
    gameweeks: Array.isArray(value.gameweeks)
      ? value.gameweeks.map(parseGameweek).filter((g): g is Gameweek => g !== null)
      : [],
    scores,
    rules: {
      entryFee: toNumber(rules.entryFee),
      monthPoolShare: toNumber(rules.monthPoolShare),
      prizeSplit: Array.isArray(rules.prizeSplit)
        ? rules.prizeSplit.filter((n): n is number => typeof n === 'number')
        : [],
    },
  };
}

interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return isRecord(value) && typeof value.toDate === 'function';
}

export function parseMonthDoc(monthKey: MonthKey, data: unknown): MonthDoc | null {
  if (!isRecord(data)) return null;
  const snapshot = data.status === 'finalized' ? parseSnapshot(data.snapshot) : null;
  return {
    monthKey,
    leagueId: toNumber(data.leagueId),
    participants: Array.isArray(data.participants)
      ? data.participants.map(parseParticipant).filter((p): p is Participant => p !== null)
      : [],
    status: snapshot ? 'finalized' : 'open',
    snapshot,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
    updatedAt: isTimestampLike(data.updatedAt) ? data.updatedAt.toDate() : null,
  };
}
