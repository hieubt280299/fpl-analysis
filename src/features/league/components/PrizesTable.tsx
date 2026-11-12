import type { MonthStandings, ResultState } from '@/domain/league';
import { Card, cn } from '@/components/ui';
import { sum } from '@/domain/shared/math';
import { formatAmount } from '@/utils/format';
import { sortByTotalPrize } from '../utils/order';

function Amount({ value, state }: { value: number; state: ResultState }) {
  if (value <= 0) return <span className="text-slate-300">–</span>;
  return (
    <span
      className={cn(state === 'provisional' && 'italic text-amber-700')}
      title={state === 'provisional' ? 'Not final yet' : undefined}
    >
      {formatAmount(value)}
    </span>
  );
}

/** The "Prizes" table: what each player has won this month, biggest winner first. */
export function PrizesTable({ standings }: { standings: MonthStandings }) {
  const { columns, monthState, prizes } = standings;
  const rows = sortByTotalPrize(standings.rows);
  const unallocated = prizes.pot - standings.totalAwarded;
  const allAwarded = monthState !== 'pending' && columns.every((c) => c.state !== 'pending');

  return (
    <Card
      title="Prizes"
      info="Players with the same points, chips and bench share the prize. Orange = not final yet."
      flush
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Player</th>
              {columns.map(({ gameweek }) => (
                <th key={gameweek.id} className="num">
                  GW{gameweek.id}
                </th>
              ))}
              <th className="num">Month</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.participant.entryId}>
                <td className="font-medium">{row.participant.playerName}</td>
                {columns.map(({ gameweek, state }) => (
                  <td key={gameweek.id} className="num">
                    <Amount value={row.gameweeks[gameweek.id]?.prize ?? 0} state={state} />
                  </td>
                ))}
                <td className="num">
                  <Amount value={row.month.prize} state={monthState} />
                </td>
                <td className="num font-semibold">
                  <Amount value={row.totalPrize} state={monthState} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              {columns.map(({ gameweek }) => (
                <td key={gameweek.id} className="num">
                  {formatAmount(sum(rows.map((r) => r.gameweeks[gameweek.id]?.prize ?? 0)))}
                </td>
              ))}
              <td className="num">{formatAmount(sum(rows.map((r) => r.month.prize)))}</td>
              <td className="num">{formatAmount(standings.totalAwarded)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {allAwarded && unallocated > 0.005 && (
        <p className="border-t border-slate-200 px-4 py-2 text-xs text-amber-700">
          {formatAmount(unallocated)} not given out (fewer players than prizes).
        </p>
      )}
    </Card>
  );
}
