import type { Lookups } from '../hooks/useGameweekView';

/** Plain-text "Salah (LIV)" for titles and lists. */
export function playerLabel(playerId: number, lookups: Lookups): string {
  const player = lookups.player(playerId);
  if (!player) return `#${playerId}`;
  const team = lookups.team(player.teamId);
  return team ? `${player.webName} (${team.shortName})` : player.webName;
}

/** Ownership gap as a signed percentage: 1.5 → "+150%", −0.333 → "−33%". */
export function formatGap(gap: number): string {
  const percent = Math.round(gap * 100);
  if (percent === 0) return '0%';
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
}

/** Signed points: 12 → "+12", −4.5 → "−4.5", 0 → "0". */
export function formatSignedPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`;
}
