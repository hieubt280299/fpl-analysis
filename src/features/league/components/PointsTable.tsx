import type { GameweekCell, MonthStandings, ParticipantMonthRow } from '@/domain/league';
import { Badge, Card, cn } from '@/components/ui';
import { chipLabel } from '@/utils/format';
import { ResultStateBadge } from './ResultStateBadge';

function placeClass(position: number | null): string | undefined {
  if (position === 1) return 'bg-emerald-300/70 font-semibold';
  if (position === 2) return 'bg-emerald-100';
  return undefined;
}

function positionLabel(position: number | null, tieSize: number): string {
  if (position === null) return '–';
  return tieSize > 1 ? `=${position}` : String(position);
}

function cellTitle(cell: GameweekCell): string | undefined {
  if (cell.net === null) return undefined;
  const parts = [`Position ${positionLabel(cell.position, cell.tieSize)}`];
  if (cell.score) {
    parts.push(`Gross ${cell.score.points}`);
    if (cell.score.transferCost) parts.push(`Hit −${cell.score.transferCost}`);
    parts.push(`Bench ${cell.score.benchPoints}`);
    if (cell.score.chip) parts.push(`Chip: ${chipLabel(cell.score.chip).long}`);
  } else {
    parts.push('No FPL score recorded');
  }
  return parts.join(' · ');
}

function ScoreCell({ cell }: { cell: GameweekCell | undefined }) {
  if (!cell || cell.net === null) {
    return <td className="num text-slate-300">–</td>;
  }
  return (
    <td className={cn('num', placeClass(cell.position))} title={cellTitle(cell)}>
      <div className="flex items-center justify-end gap-1.5">
        {cell.score?.chip && (
          <Badge tone="info" title={chipLabel(cell.score.chip).long}>
            {chipLabel(cell.score.chip).short}
          </Badge>
        )}
        <span>{cell.net}</span>
      </div>
      {cell.score && cell.score.transferCost > 0 && (
        <div className="text-[11px] leading-none text-red-600">−{cell.score.transferCost} hit</div>
      )}
    </td>
  );
}

/** The "Points" table: net GW points per participant, ranked by month total. */
export function PointsTable({ standings }: { standings: MonthStandings }) {
  const { columns, rows, monthState } = standings;

  return (
    <Card
      title="Points"
      description="Net points after transfer hits. Green = winner, light green = runner-up."
      flush
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 num">#</th>
              <th>Player</th>
              {columns.map(({ gameweek, state }) => (
                <th key={gameweek.id} className="num">
                  <div className="flex items-center justify-end gap-1.5">
                    GW{gameweek.id}
                    {state === 'provisional' && (
                      <span className="h-2 w-2 rounded-full bg-amber-300" title="Provisional" />
                    )}
                  </div>
                </th>
              ))}
              <th className="num">Month</th>
              <th className="num" title="Chips used this month (fewer wins a tie)">
                Chips
              </th>
              <th className="num" title="Bench points this month (more wins a tie)">
                Bench
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: ParticipantMonthRow) => (
              <tr key={row.participant.entryId}>
                <td className="num text-slate-500">
                  {positionLabel(row.month.position, row.month.tieSize)}
                </td>
                <td>
                  <a
                    href={`https://fantasy.premierleague.com/entry/${row.participant.entryId}/history`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    {row.participant.playerName}
                  </a>
                  <div className="text-xs text-slate-500">{row.participant.entryName}</div>
                </td>
                {columns.map(({ gameweek }) => (
                  <ScoreCell key={gameweek.id} cell={row.gameweeks[gameweek.id]} />
                ))}
                <td className={cn('num text-base', placeClass(row.month.position))}>
                  {monthState === 'pending' ? (
                    <span className="text-slate-300">–</span>
                  ) : (
                    <>
                      {row.month.points}
                      {row.month.transferCost > 0 && (
                        <div className="text-[11px] leading-none text-red-600">
                          −{row.month.transferCost} hits
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="num text-slate-600">{row.month.chipsUsed}</td>
                <td className="num text-slate-600">{row.month.benchPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        Month status: <ResultStateBadge state={monthState} />
        <span>· “=” marks a tie after all tie-breakers (prizes are shared).</span>
      </div>
    </Card>
  );
}
