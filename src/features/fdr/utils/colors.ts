/** Tailwind classes for a fixture-difficulty value (1 easiest … 5 hardest; doubles may be x.5). */
export function fdrCellClass(value: number, isBlank: boolean): string {
  if (isBlank) return 'bg-fdr-blank text-slate-700';
  const rounded = Math.round(value);
  if (rounded <= 1) return 'bg-fdr-1 text-white';
  if (rounded === 2) return 'bg-fdr-2 text-slate-900';
  if (rounded === 3) return 'bg-fdr-3 text-slate-900';
  if (rounded === 4) return 'bg-fdr-4 text-slate-900';
  return 'bg-fdr-5 text-slate-900';
}

type Rgb = [number, number, number];

// Google Sheets' default 3-colour scale, as used for the AVG column in the original sheet.
const LOW: Rgb = [87, 187, 138];
const MID: Rgb = [255, 255, 255];
const HIGH: Rgb = [230, 124, 115];

function mix(a: Rgb, b: Rgb, t: number): string {
  const c = a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Returns a function mapping a score to a green → white → red background (min → median → max). */
export function heatScale(values: readonly number[]): (value: number) => string {
  if (values.length === 0) return () => 'transparent';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = median(values);
  return (value) => {
    if (value <= mid)
      return mid === min ? mix(MID, MID, 0) : mix(LOW, MID, (value - min) / (mid - min));
    return mix(MID, HIGH, (value - mid) / (max - mid));
  };
}
