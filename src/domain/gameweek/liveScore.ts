import type { GameweekScore } from '@/domain/league';
import type { LineupContext } from './lineup';
import { lineupPoints } from './lineup';
import { teamsDone } from './matches';
import type { Lineup, Match, Player, PlayerLive } from './types';

export interface LineupContextInput {
  live: readonly PlayerLive[];
  /** The gameweek's matches. */
  matches: readonly Match[];
  players: ReadonlyArray<Pick<Player, 'id' | 'teamId'>>;
  /** Every Premier League team id (teams without a match this GW count as done). */
  teamIds: readonly number[];
  /** FPL has finished the GW: its automatic subs are final. */
  gameweekFinished: boolean;
}

/** What `buildLineup` needs to know about the gameweek so far. */
export function lineupContext(input: LineupContextInput): LineupContext {
  return {
    minutes: new Map(input.live.map((p) => [p.id, p.minutes] as const)),
    teamOf: new Map(input.players.map((p) => [p.id, p.teamId] as const)),
    doneTeams: teamsDone(input.matches, input.teamIds),
    gameweekFinished: input.gameweekFinished,
  };
}

/**
 * A manager's live gameweek result in the shape the mini-league uses: gross points after
 * (projected) automatic subs and captaincy, the transfer hit, points left on the bench (players
 * not counting after subs; none with Bench Boost) and the chip.
 */
export function lineupScore(
  lineup: Lineup,
  points: ReadonlyMap<number, number>,
  gameweek: number,
): GameweekScore {
  let benchPoints = 0;
  for (const p of lineup.picks) if (!p.active) benchPoints += points.get(p.playerId) ?? 0;
  return {
    gameweek,
    points: lineupPoints(lineup, points),
    transferCost: lineup.transferCost,
    benchPoints,
    chip: lineup.chip,
  };
}
