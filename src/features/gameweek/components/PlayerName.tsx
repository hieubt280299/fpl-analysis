import type { Lookups } from '../hooks/useGameweekView';

/** "Salah" with the team's short name ("LIV") in muted text. */
export function PlayerName({
  playerId,
  lookups,
  showTeam = true,
}: {
  playerId: number;
  lookups: Lookups;
  showTeam?: boolean;
}) {
  const player = lookups.player(playerId);
  const team = player ? lookups.team(player.teamId) : undefined;
  return (
    <>
      <span className="font-medium text-slate-900">{player?.webName ?? `#${playerId}`}</span>
      {showTeam && team && (
        <span className="ml-1 text-[11px] font-normal text-slate-400">{team.shortName}</span>
      )}
    </>
  );
}
