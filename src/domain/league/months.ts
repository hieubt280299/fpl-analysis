import type { Gameweek, LeagueMonth, MonthKey } from './types';

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function monthFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

/** The calendar month (in `timeZone`) that an instant falls in. */
export function toMonthKey(isoDate: string, timeZone: string): MonthKey {
  const parts = monthFormatter(timeZone).formatToParts(new Date(isoDate));
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  if (!year || !month) throw new Error(`Cannot derive month from ${isoDate} in ${timeZone}`);
  return `${year}-${month}`;
}

/** Admin overrides: gameweek id → the month it was moved to. */
export type GameweekMonthOverrides = Readonly<Record<number, MonthKey>>;

/**
 * Rule: a month contains every gameweek whose deadline falls on a day in that month,
 * evaluated in the league's configured time zone — unless an admin moved the gameweek to the
 * previous or next month (`overrides`).
 */
export function groupGameweeksByMonth(
  gameweeks: readonly Pick<Gameweek, 'id' | 'deadline'>[],
  timeZone: string,
  overrides: GameweekMonthOverrides = {},
): LeagueMonth[] {
  const byMonth = new Map<MonthKey, number[]>();
  for (const gw of gameweeks) {
    const key = overrides[gw.id] ?? toMonthKey(gw.deadline, timeZone);
    const ids = byMonth.get(key) ?? [];
    ids.push(gw.id);
    byMonth.set(key, ids);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({ key, gameweekIds: ids.sort((a, b) => a - b) }));
}

export interface MonthGameweekEditInput {
  /** Current grouping (overrides applied), sorted by month. */
  months: readonly LeagueMonth[];
  /** The month being edited. */
  monthKey: MonthKey;
  /** Gameweeks the admin wants in this month. */
  selected: readonly number[];
  /** Each gameweek's automatic (deadline-based) month. */
  automatic: ReadonlyMap<number, MonthKey>;
  overrides: GameweekMonthOverrides;
  /** Finalized months: their gameweeks can't be moved, and nothing can move into them. */
  locked?: ReadonlySet<MonthKey>;
}

/**
 * Gameweeks an admin may put in `monthKey`: its own plus those of the previous and next month
 * (unless those months are locked).
 */
export function editableGameweeks(
  months: readonly LeagueMonth[],
  monthKey: MonthKey,
  locked: ReadonlySet<MonthKey> = new Set(),
): {
  previous: LeagueMonth | undefined;
  current: LeagueMonth | undefined;
  next: LeagueMonth | undefined;
  candidates: number[];
} {
  const current = months.find((m) => m.key === monthKey);
  const before = months.filter((m) => m.key < monthKey);
  const after = months.filter((m) => m.key > monthKey);
  const previous = before[before.length - 1];
  const next = after[0];
  const open = (m: LeagueMonth | undefined) => (m && !locked.has(m.key) ? m : undefined);
  const candidates = [
    ...(open(previous)?.gameweekIds ?? []),
    ...(current?.gameweekIds ?? []),
    ...(open(next)?.gameweekIds ?? []),
  ].sort((a, b) => a - b);
  return { previous: open(previous), current, next: open(next), candidates };
}

/**
 * Moves gameweeks between a month and its neighbours. The selection must be a continuous run of
 * gameweeks. Gameweeks removed from the month go to the neighbour on their side (earlier → previous
 * month, later → next month). Returns the new overrides (only gameweeks that differ from their
 * automatic month are kept) or an error message.
 */
export function applyMonthGameweekEdit(
  input: MonthGameweekEditInput,
): { overrides: Record<number, MonthKey> } | { error: string } {
  const { monthKey, automatic } = input;
  if (input.locked?.has(monthKey)) return { error: 'This month is finalized. Reopen it first.' };

  const { previous, current, next, candidates } = editableGameweeks(
    input.months,
    monthKey,
    input.locked,
  );
  const selected = [...new Set(input.selected)].sort((a, b) => a - b);
  if (selected.length === 0) return { error: 'Pick at least one gameweek.' };
  if (selected.some((id) => !candidates.includes(id))) {
    return { error: 'Only gameweeks from this month or the months next to it can be picked.' };
  }
  const start = candidates.indexOf(selected[0] as number);
  if (selected.some((id, i) => candidates[start + i] !== id)) {
    return { error: 'Pick gameweeks next to each other (no gaps).' };
  }

  const first = selected[0] as number;
  const ownIds = new Set(current?.gameweekIds ?? []);
  const result: Record<number, MonthKey> = { ...input.overrides };
  for (const id of candidates) {
    let target: MonthKey | undefined;
    if (selected.includes(id)) target = monthKey;
    else if (!ownIds.has(id))
      continue; // a neighbour's gameweek that stays where it is
    else target = id < first ? previous?.key : next?.key;
    if (!target) {
      return { error: `GW${id} has no ${id < first ? 'earlier' : 'later'} month to move to.` };
    }
    if (automatic.get(id) === target) delete result[id];
    else result[id] = target;
  }
  return { overrides: result };
}

/** "November 2026". */
export function formatMonthLabel(key: MonthKey, style: 'long' | 'short' = 'long'): string {
  const match = MONTH_KEY_PATTERN.exec(key);
  if (!match) return key;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat('en-GB', {
    month: style,
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * The month to show by default: the month of the most recent gameweek whose deadline has passed,
 * or the first month of the season before GW1.
 */
export function pickDefaultMonth(
  months: readonly LeagueMonth[],
  gameweeks: readonly Gameweek[],
): MonthKey | undefined {
  const started = gameweeks.filter((gw) => gw.status !== 'upcoming');
  const latest = started.reduce<Gameweek | undefined>(
    (acc, gw) => (!acc || gw.id > acc.id ? gw : acc),
    undefined,
  );
  if (latest) {
    const month = months.find((m) => m.gameweekIds.includes(latest.id));
    if (month) return month.key;
  }
  return months[0]?.key;
}
