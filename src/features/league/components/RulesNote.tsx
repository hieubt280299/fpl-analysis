import { LEAGUE_RULES } from '@/config/league';
import { formatGold, formatPercent } from '@/utils/format';

/** The league rules in short, simple sentences. */
export function RulesNote() {
  const [winner, runnerUp] = LEAGUE_RULES.prizeSplit;
  return (
    <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      <summary className="cursor-pointer font-medium text-slate-800">Rules</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>Each player pays {formatGold(LEAGUE_RULES.entryFee)} per month.</li>
        <li>A month has the GWs whose deadline is in that month (admins can move a GW).</li>
        <li>
          Prize pool: {formatPercent(LEAGUE_RULES.monthPoolShare)} for the month,{' '}
          {formatPercent(1 - LEAGUE_RULES.monthPoolShare)} split equally between the GWs. Each
          prize: winner {winner}, runner-up {runnerUp} (winner rounded to a whole number).
        </li>
        <li>GW ranking: FPL points before hits.</li>
        <li>Month ranking: total points after hits.</li>
        <li>Same points? Fewer chips wins, then more bench points.</li>
        <li>Still the same? They share the prize equally.</li>
        <li>Penalty-free points: some hits in the month’s first GW can be free.</li>
        <li>Orange prizes are not final yet.</li>
      </ul>
    </details>
  );
}
