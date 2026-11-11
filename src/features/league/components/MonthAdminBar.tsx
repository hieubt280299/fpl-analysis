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
}

/** Admin-only actions for a month. */
export function MonthAdminBar({
  month,
  monthKey,
  canFinalize,
  finalizeBlockedReason,
  buildSnapshot,
  onEditParticipants,
}: Props) {
  const finalize = useFinalizeMonth();
  const reopen = useReopenMonth();
  const isFinalized = month?.status === 'finalized';
  const label = formatMonthLabel(monthKey);

  const handleFinalize = () => {
    if (!month) return;
    const ok = window.confirm(
      `Finalize ${label}? Scores and prizes will be frozen and no longer read from FPL.`,
    );
    if (ok) finalize.mutate({ month, snapshot: buildSnapshot() });
  };

  const handleReopen = () => {
    if (!month) return;
    const ok = window.confirm(
      `Reopen ${label}? The frozen results are discarded and scores are read live from FPL again ` +
        '(this only works while FPL still serves this season).',
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
              {month?.participants.length ? 'Edit participants' : 'Choose participants'}
            </Button>
            <Button
              size="sm"
              loading={finalize.isPending}
              disabled={!canFinalize}
              title={canFinalize ? 'Freeze results for this month' : finalizeBlockedReason}
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
