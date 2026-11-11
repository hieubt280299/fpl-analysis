import { LEAGUE_RULES } from '@/config/league';
import { formatGold, formatPercent } from '@/utils/format';

export function RulesNote() {
  const [winner, runnerUp] = LEAGUE_RULES.prizeSplit;
  return (
    <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      <summary className="cursor-pointer font-medium text-slate-800">
        How the monthly league works
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>
          Each participant puts {formatGold(LEAGUE_RULES.entryFee)} into the month’s pot. Admins
          choose who takes part each month.
        </li>
        <li>
          A month contains every gameweek whose deadline falls in that month (league time zone).
        </li>
        <li>
          {formatPercent(LEAGUE_RULES.monthPoolShare)} of the pot is the month prize; the other{' '}
          {formatPercent(1 - LEAGUE_RULES.monthPoolShare)} is split equally between the month’s
          gameweeks. Every prize is split winner : runner-up = {winner} : {runnerUp}.
        </li>
        <li>
          Scores are official FPL points minus transfer hits. Ranking: most points, then fewest
          chips used, then most bench points.
        </li>
        <li>
          Admins may give selected players penalty-free points for the month’s first gameweek only:
          hits up to that amount are waived (with 8 free points, −4 becomes 0 and −16 becomes −8).
        </li>
        <li>
          Players still level after both tie-breakers share the prizes of the places they occupy
          equally (e.g. three tied for 1st each get (winner + runner-up) ÷ 3).
        </li>
        <li>
          Prizes are provisional while a gameweek is live and until FPL confirms the final points.
        </li>
      </ul>
    </details>
  );
}
