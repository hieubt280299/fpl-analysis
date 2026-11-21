import { useEffect, useState } from 'react';
import { Button } from './Button';
import { formatDateTime } from '@/utils/format';

/** After a successful manual refresh, wait this long before allowing another one. */
const COOLDOWN_SECONDS = 30;

/**
 * "Refresh points" with the time the points were fetched. After a successful refresh the button
 * rests for a short cooldown (FPL only updates every few minutes, and this spares its API).
 * A failed refresh has no cooldown, so the user can try again at once.
 */
export function RefreshPointsButton({
  refresh,
  isFetching,
  updatedAt,
}: {
  refresh: () => Promise<boolean>;
  isFetching: boolean;
  updatedAt: Date | null;
}) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const onClick = async () => {
    if (await refresh()) setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <div className="flex items-center gap-2">
      {updatedAt && (
        <span className="text-xs text-slate-500">
          Updated{' '}
          <strong className="font-medium text-slate-700">
            {formatDateTime(updatedAt.toISOString())}
          </strong>
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        loading={isFetching}
        disabled={cooldown > 0}
        title={cooldown > 0 ? 'Points are up to date. Try again soon.' : undefined}
        onClick={() => void onClick()}
      >
        {cooldown > 0 ? `Refresh points (${cooldown}s)` : 'Refresh points'}
      </Button>
    </div>
  );
}
