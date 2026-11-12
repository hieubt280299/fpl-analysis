/** "2026/27" for the season that starts (GW1) in 2026. */
export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * Current and previous season labels, from the first gameweek's deadline (always in August).
 * e.g. GW1 deadline 2026-08-21 → { current: '2026/27', previous: '2025/26' }.
 */
export function seasonLabels(firstDeadline: string): { current: string; previous: string } | null {
  const year = new Date(firstDeadline).getUTCFullYear();
  if (!Number.isFinite(year)) return null;
  return { current: seasonLabel(year), previous: seasonLabel(year - 1) };
}
