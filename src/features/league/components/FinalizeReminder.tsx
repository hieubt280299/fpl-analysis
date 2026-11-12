import { Link } from 'react-router';
import { formatMonthLabel, type MonthKey } from '@/domain/league';
import { Alert } from '@/components/ui';

/**
 * Admin-only reminder: months whose gameweeks are all final but which are still open. FPL wipes
 * last season's history when it resets each summer; an open month can't be recalculated after that.
 */
export function FinalizeReminder({
  monthKeys,
  seasonComplete,
}: {
  monthKeys: readonly MonthKey[];
  seasonComplete: boolean;
}) {
  if (monthKeys.length === 0) return null;
  return (
    <Alert
      tone={seasonComplete ? 'error' : 'warning'}
      title={seasonComplete ? 'Season over: please finalize these months' : 'Ready to finalize'}
    >
      <p>
        {monthKeys.map((key, i) => (
          <span key={key}>
            {i > 0 && ', '}
            <Link to={`/league/${key}`} className="font-medium underline">
              {formatMonthLabel(key)}
            </Link>
          </span>
        ))}{' '}
        {monthKeys.length === 1 ? 'is' : 'are'} done. Finalize to save the results — FPL deletes old
        points in the summer.
      </p>
    </Alert>
  );
}
