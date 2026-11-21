import { FORMATION_LIMITS } from '@/config/gameweek';
import type { EntryPicks, Lineup, LineupPick, Pick, PlayerPosition } from './types';

/** What is known about the gameweek so far, used to decide who did not play. */
export interface LineupContext {
  /** Minutes played this GW by player id (missing = 0). */
  minutes: ReadonlyMap<number, number>;
  /** Each player's team id. */
  teamOf: ReadonlyMap<number, number>;
  /** Teams whose matches this GW have all finished (see `teamsDone`). */
  doneTeams: ReadonlySet<number>;
  /** FPL has finished the GW: its automatic subs are final. */
  gameweekFinished: boolean;
}

const STARTING_SLOTS = 11;

function hasPlayed(playerId: number, ctx: LineupContext): boolean {
  return (ctx.minutes.get(playerId) ?? 0) > 0;
}

/** Certain not to play: no minutes and every match of their team is over. */
function didNotPlay(playerId: number, ctx: LineupContext): boolean {
  if (hasPlayed(playerId, ctx)) return false;
  const team = ctx.teamOf.get(playerId);
  return team !== undefined && ctx.doneTeams.has(team);
}

function formationValid(xi: readonly Pick[]): boolean {
  const counts: Record<PlayerPosition, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of xi) counts[p.position] += 1;
  return ([1, 2, 3, 4] as const).every(
    (pos) => counts[pos] >= FORMATION_LIMITS[pos].min && counts[pos] <= FORMATION_LIMITS[pos].max,
  );
}

/**
 * Projects FPL's automatic substitutions: each starter certain not to play (in squad order) is
 * replaced by the first bench player, in bench order, who has played and keeps the formation
 * valid. Goalkeepers only swap with the bench goalkeeper. Bench players whose match is still to
 * come are not used yet, so the projection updates as matches finish.
 */
function projectSubs(starters: Pick[], bench: Pick[], ctx: LineupContext): Pick[] {
  const xi = [...starters];
  const available = bench.filter((b) => hasPlayed(b.playerId, ctx));
  for (const starter of starters) {
    if (!didNotPlay(starter.playerId, ctx)) continue;
    const index = xi.indexOf(starter);
    const sub = available.find((b) => {
      if ((b.position === 1) !== (starter.position === 1)) return false;
      const candidate = [...xi];
      candidate[index] = b;
      return formationValid(candidate);
    });
    if (!sub) continue;
    xi[index] = sub;
    available.splice(available.indexOf(sub), 1);
  }
  return xi;
}

/** FPL's own XI after the subs it has made (used once the GW is processed). */
function officialXi(starters: Pick[], squad: Pick[], entry: EntryPicks): Pick[] {
  let xi = [...starters];
  for (const sub of entry.automaticSubs) {
    const incoming = squad.find((p) => p.playerId === sub.in);
    if (!incoming) continue;
    xi = xi.map((p) => (p.playerId === sub.out ? incoming : p));
  }
  return xi;
}

/**
 * A manager's live lineup: who counts this GW (after automatic subs; all 15 with Bench Boost) and
 * who wears the armband (the vice-captain when the captain is certain not to play).
 * Before FPL processes the GW the subs are projected; afterwards FPL's own subs are used.
 */
export function buildLineup(entry: EntryPicks, ctx: LineupContext): Lineup {
  const squad = [...entry.picks].sort((a, b) => a.slot - b.slot);
  const starters = squad.filter((p) => p.slot <= STARTING_SLOTS);
  const bench = squad.filter((p) => p.slot > STARTING_SLOTS);
  const official = ctx.gameweekFinished || entry.automaticSubs.length > 0;
  const benchBoost = entry.chip === 'bboost';

  const xi = benchBoost
    ? squad
    : official
      ? officialXi(starters, squad, entry)
      : projectSubs(starters, bench, ctx);
  const active = new Set(xi.map((p) => p.playerId));

  const captain = squad.find((p) => p.isCaptain);
  const vice = squad.find((p) => p.isViceCaptain);
  const armband =
    captain && !didNotPlay(captain.playerId, ctx)
      ? captain
      : vice && active.has(vice.playerId) && !didNotPlay(vice.playerId, ctx)
        ? vice
        : undefined;
  const captainMultiplier = entry.chip === '3xc' ? 3 : 2;

  const picks: LineupPick[] = squad.map((p) => {
    const isActive = active.has(p.playerId);
    const isCaptain = armband?.playerId === p.playerId;
    return {
      playerId: p.playerId,
      position: p.position,
      active: isActive,
      multiplier: !isActive ? 0 : isCaptain ? captainMultiplier : 1,
      isCaptain,
      subbedIn: isActive && p.slot > STARTING_SLOTS && !benchBoost,
      subbedOut: !isActive && p.slot <= STARTING_SLOTS,
    };
  });

  return {
    entryId: entry.entryId,
    chip: entry.chip,
    picks,
    transferCost: entry.transferCost,
    official,
  };
}

/** Live GW points of a lineup (gross, before the transfer hit). */
export function lineupPoints(lineup: Lineup, points: ReadonlyMap<number, number>): number {
  let total = 0;
  for (const p of lineup.picks) total += (points.get(p.playerId) ?? 0) * p.multiplier;
  return total;
}
