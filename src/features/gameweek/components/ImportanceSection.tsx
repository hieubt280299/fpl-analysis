import type { ImportanceItem, Lineup } from '@/domain/gameweek';
import type { Participant } from '@/domain/league';
import { competitionRanks } from '@/domain/shared/math';
import { Badge, Card, cn } from '@/components/ui';
import { chipLabel } from '@/utils/format';
import type { GameweekView, Lookups } from '../hooks/useGameweekView';
import { formatGap, formatSignedPoints, playerLabel } from '../utils/labels';
import { PlayerMatchStatus } from './PlayerMatchStatus';
import { PlayerName } from './PlayerName';

function ImportanceList({
  title,
  tone,
  items,
  lineup,
  lookups,
  timeZone,
}: {
  title: string;
  tone: 'good' | 'bad';
  items: ImportanceItem[];
  lineup: Lineup;
  lookups: Lookups;
  timeZone: string;
}) {
  return (
    <div>
      <h4
        className={cn(
          'mb-1 text-[11px] font-semibold uppercase tracking-wide',
          tone === 'good' ? 'text-emerald-700' : 'text-red-700',
        )}
      >
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">None</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const pick = lineup.picks.find((p) => p.playerId === item.playerId);
            return (
              <li
                key={item.playerId}
                className="flex items-center gap-2 text-sm"
                title={`${playerLabel(item.playerId, lookups)}: ${formatSignedPoints(item.swing)} pts against the average rival so far`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <PlayerName playerId={item.playerId} lookups={lookups} />
                  {pick?.isCaptain && (
                    <Badge tone="info" className="ml-1">
                      {pick.multiplier === 3 ? 'TC' : 'C'}
                    </Badge>
                  )}
                </span>
                <PlayerMatchStatus
                  playerId={item.playerId}
                  lookups={lookups}
                  timeZone={timeZone}
                  className="shrink-0 text-right"
                />
                <span
                  className={cn(
                    'w-12 shrink-0 text-right text-xs tabular-nums',
                    tone === 'good' ? 'text-emerald-700' : 'text-red-700',
                  )}
                >
                  {formatGap(item.gap)}
                </span>
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
                  {item.points}
                  <span className="ml-0.5 text-[11px] font-normal text-slate-400">pts</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ManagerPanel({
  participant,
  lineup,
  points,
  rank,
  differentials,
  threats,
  lookups,
  timeZone,
}: {
  participant: Participant;
  lineup: Lineup;
  points: number;
  /** Live position among the managers ("=2" when shared). */
  rank: string;
  differentials: ImportanceItem[];
  threats: ImportanceItem[];
  lookups: Lookups;
  timeZone: string;
}) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-900">
            <span className="text-xs font-normal text-slate-400">{rank}</span>
            <span className="truncate">{participant.playerName}</span>
            {lineup.chip && (
              <Badge tone="info" title={chipLabel(lineup.chip).long}>
                {chipLabel(lineup.chip).short}
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">{participant.entryName}</p>
        </div>
        <div className="text-right leading-tight" title="Live GW points (before hits)">
          <span className="text-2xl font-bold tabular-nums text-slate-900">{points}</span>
          <span className="ml-0.5 text-xs text-slate-500">pts</span>
          {lineup.transferCost > 0 && (
            <div className="text-[11px] text-red-600">hit −{lineup.transferCost}</div>
          )}
        </div>
      </div>
      <ImportanceList
        title="Differentials"
        tone="good"
        items={differentials}
        lineup={lineup}
        lookups={lookups}
        timeZone={timeZone}
      />
      <ImportanceList
        title="Threats"
        tone="bad"
        items={threats}
        lineup={lineup}
        lookups={lookups}
        timeZone={timeZone}
      />
    </div>
  );
}

/** Each manager's live points with the players that matter most against the others. */
export function ImportanceSection({ view }: { view: GameweekView }) {
  const byEntry = new Map(view.people.participants.map((p) => [p.entryId, p] as const));
  const importance = new Map(view.importance.map((i) => [i.entryId, i] as const));
  const panels = view.lineups
    .flatMap((lineup) => {
      const participant = byEntry.get(lineup.entryId);
      return participant
        ? [{ lineup, participant, points: view.teamPoints.get(lineup.entryId) ?? 0 }]
        : [];
    })
    .sort(
      (a, b) =>
        b.points - a.points || a.participant.playerName.localeCompare(b.participant.playerName),
    );

  const ranks = competitionRanks(
    panels.map((p) => p.points),
    false,
  );
  const shared = (rank: number) => ranks.filter((r) => r === rank).length > 1;

  return (
    <Card
      title="Differentials & threats"
      info={
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Differentials: your players the others have less of. Their points help you most.</li>
          <li>Threats: players the others have more of than you. Their points hurt you most.</li>
          <li>
            % = your share minus the others’ average (captain counts 2×, Triple Captain 3×). +100% =
            you gain 1 point on the others for each point the player scores.
          </li>
          <li>Points are live, with bonus and subs worked out before FPL adds them.</li>
          <li>Next to each player: Done, In play (minute), or the match still to come (H/A).</li>
        </ul>
      }
    >
      {panels.length === 0 ? (
        <p className="text-sm text-slate-500">No teams to show.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map(({ lineup, participant, points }, index) => (
            <ManagerPanel
              key={lineup.entryId}
              participant={participant}
              lineup={lineup}
              points={points}
              rank={`${shared(ranks[index] ?? 0) ? '=' : ''}${ranks[index] ?? ''}.`}
              differentials={importance.get(lineup.entryId)?.differentials ?? []}
              threats={importance.get(lineup.entryId)?.threats ?? []}
              lookups={view.lookups}
              timeZone={view.people.timeZone}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
