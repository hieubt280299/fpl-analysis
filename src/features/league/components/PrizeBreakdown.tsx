import {
  gameweekProgress,
  type GameweekColumn,
  type MonthStandings,
  type EventStatus,
} from '@/domain/league';
import { Card } from '@/components/ui';
import { formatAmount, formatDateTime, formatPercent } from '@/utils/format';
import { ResultStateBadge } from './ResultStateBadge';

/** The "Giải thưởng" table: prize money per gameweek and for the month. */
export function PrizeBreakdown({
  standings,
  timeZone,
  eventStatus,
}: {
  standings: MonthStandings;
  timeZone: string;
  eventStatus: EventStatus | null;
}) {
  const { prizes, columns, monthState } = standings;
  const share = (amount: number) => (prizes.pot > 0 ? formatPercent(amount / prizes.pot) : '–');

  return (
    <Card
      title="Prize pool"
      info="40% for the month, 60% split equally between the GWs. Each prize: winner 3, runner-up 1."
      flush
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Deadline</th>
              <th className="num">Winner</th>
              <th className="num">Runner-up</th>
              <th className="num">Total</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {columns.map(({ gameweek, state }: GameweekColumn) => (
              <tr key={gameweek.id}>
                <td>
                  <span className="mr-2 font-medium">GW{gameweek.id}</span>
                  <ResultStateBadge
                    state={state}
                    gameweek={gameweek}
                    progress={gameweekProgress(gameweek, eventStatus)}
                  />
                </td>
                <td className="text-slate-500">{formatDateTime(gameweek.deadline, timeZone)}</td>
                <td className="num">{formatAmount(prizes.gameweekPrizes[0] ?? 0)}</td>
                <td className="num">{formatAmount(prizes.gameweekPrizes[1] ?? 0)}</td>
                <td className="num font-medium">{formatAmount(prizes.perGameweekPool)}</td>
                <td className="num text-slate-500">{share(prizes.perGameweekPool)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <span className="mr-2 font-medium">Month</span>
                <ResultStateBadge state={monthState} />
              </td>
              <td className="text-slate-500">All GWs</td>
              <td className="num">{formatAmount(prizes.monthPrizes[0] ?? 0)}</td>
              <td className="num">{formatAmount(prizes.monthPrizes[1] ?? 0)}</td>
              <td className="num font-medium">{formatAmount(prizes.monthPool)}</td>
              <td className="num text-slate-500">{share(prizes.monthPool)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td className="num">{formatAmount(prizes.pot)}</td>
              <td className="num">{prizes.pot > 0 ? '100%' : '–'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
