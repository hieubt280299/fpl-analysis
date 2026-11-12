import { formatMonthLabel } from '@/domain/league';
import { Alert, Button } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { useFinalizeMonth, useReopenMonth } from '../hooks/useMonths';
import type { MonthDoc, MonthSnapshot } from '../model';

interface Props {
  month: MonthDoc | null;
  monthKey: string;
  canFinalize: boolean;
  finalizeBlockedReason?: string;
  buildSnapshot: () => MonthSnapshot;
  onEditParticipants: () => void;
  /** Omit when the month's gameweeks can't be edited (e.g. not in the current season). */
  onEditGameweeks?: () => void;
}

/** Admin-only actions for a month. */
export function MonthAdminBar({
  month,
  monthKey,
  canFinalize,
  finalizeBlockedReason,
  buildSnapshot,
  onEditParticipants,
  onEditGameweeks,
}: Props) {
  const finalize = useFinalizeMonth();
  const reopen = useReopenMonth();
  const isFinalized = month?.status === 'finalized';
  const label = formatMonthLabel(monthKey);

  const handleFinalize = () => {
    if (!month) return;
    const ok = window.confirm(
      `Finalize ${label}? Points and prizes will be saved and won’t change any more.`,
    );
    if (ok) finalize.mutate({ month, snapshot: buildSnapshot() });
  };

  const handleReopen = () => {
    if (!month) return;
    const ok = window.confirm(
      `Reopen ${label}? Saved results are removed and points are read from FPL again ` +
        '(only works during the same season).',
    );
    if (ok) reopen.mutate(month);
  };

  const error = finalize.error ?? reopen.error;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50 px-3 py-2">
        <span className="mr-auto text-xs font-semibold uppercase tracking-wide text-brand-800">
          Admin
        </span>
        {isFinalized ? (
          <Button size="sm" variant="secondary" loading={reopen.isPending} onClick={handleReopen}>
            Reopen month
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={onEditParticipants}>
              {month?.participants.length ? 'Edit players' : 'Choose players'}
            </Button>
            {onEditGameweeks && (
              <Button size="sm" variant="secondary" onClick={onEditGameweeks}>
                Edit gameweeks
              </Button>
            )}
            <Button
              size="sm"
              loading={finalize.isPending}
              disabled={!canFinalize}
              title={canFinalize ? 'Save the results for good' : finalizeBlockedReason}
              onClick={handleFinalize}
            >
              Finalize month
            </Button>
          </>
        )}
      </div>
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
    </div>
  );
}
