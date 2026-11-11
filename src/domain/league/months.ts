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

/**
 * Rule: a month contains every gameweek whose deadline falls on a day in that month,
 * evaluated in the league's configured time zone.
 */
export function groupGameweeksByMonth(
  gameweeks: readonly Pick<Gameweek, 'id' | 'deadline'>[],
  timeZone: string,
): LeagueMonth[] {
  const byMonth = new Map<MonthKey, number[]>();
  for (const gw of gameweeks) {
    const key = toMonthKey(gw.deadline, timeZone);
    const ids = byMonth.get(key) ?? [];
    ids.push(gw.id);
    byMonth.set(key, ids);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({ key, gameweekIds: ids.sort((a, b) => a - b) }));
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
