/**
 * Excel-compatible ROUND(): rounds half away from zero.
 * The value is first normalised to 15 significant digits (Excel's precision) so binary float noise
 * such as 21.749999999999996 rounds the same way the spreadsheet does.
 */
export function roundHalfAwayFromZero(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  return (Math.sign(value) * Math.round(scaled)) / factor;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Standard competition ranking ("1224"): equal values share a rank and the next rank is skipped,
 * matching Excel's RANK(). `ascending` = lower value ranks first.
 */
export function competitionRanks(values: readonly number[], ascending = true): number[] {
  return values.map(
    (v) => 1 + values.filter((other) => (ascending ? other < v : other > v)).length,
  );
}
