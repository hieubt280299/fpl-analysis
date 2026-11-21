import type { TeamFixture } from '@/domain/gameweek';
import { cn } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import type { Lookups } from '../hooks/useGameweekView';

function FixtureChip({
  fixture,
  lookups,
  timeZone,
}: {
  fixture: TeamFixture;
  lookups: Lookups;
  timeZone: string;
}) {
  const opponent = lookups.team(fixture.opponentTeamId)?.shortName ?? '?';
  const vs = `${opponent} (${fixture.home ? 'H' : 'A'})`;
  const kickoff = fixture.match.kickoff ? formatDateTime(fixture.match.kickoff, timeZone) : null;

  switch (fixture.state) {
    case 'live':
      return (
        <span className="font-medium text-sky-700" title={`In play against ${vs}`}>
          In play {fixture.match.minutes}’
        </span>
      );
    case 'done':
    case 'done-provisional':
      return (
        <span className="text-slate-500" title={`Played ${vs}`}>
          Done
        </span>
      );
    default:
      return (
        <span className="text-slate-700" title={kickoff ? `${vs}: ${kickoff}` : vs}>
          {vs}
        </span>
      );
  }
}

/**
 * The state of a player's match this GW: "Done", "In play 59’", or the fixture still to come
 * ("ARS (H)"). Double GWs show both, blank GWs "No match".
 */
export function PlayerMatchStatus({
  playerId,
  lookups,
  timeZone,
  className,
}: {
  playerId: number;
  lookups: Lookups;
  timeZone: string;
  className?: string;
}) {
  const player = lookups.player(playerId);
  const fixtures = player ? lookups.teamFixtures(player.teamId) : [];
  return (
    <span className={cn('whitespace-nowrap text-[11px]', className)}>
      {fixtures.length === 0 ? (
        <span className="text-slate-400">No match</span>
      ) : (
        fixtures.map((f, i) => (
          <span key={f.match.id}>
            {i > 0 && <span className="text-slate-300"> · </span>}
            <FixtureChip fixture={f} lookups={lookups} timeZone={timeZone} />
          </span>
        ))
      )}
    </span>
  );
}
