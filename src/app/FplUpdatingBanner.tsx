import { isFplUpdating } from '@/domain/league';
import { FplApiError } from '@/lib/fpl/client';
import { useEventStatus } from '@/lib/fpl/queries';

/**
 * Site-wide notice while FPL recalculates its data (`event-status` says "Updating", or FPL answers
 * 503 "The game is being updated"). During that time requests may fail and cached data is shown.
 */
export function FplUpdatingBanner() {
  const eventStatus = useEventStatus();
  const updating =
    isFplUpdating(eventStatus.data) ||
    (eventStatus.error instanceof FplApiError && eventStatus.error.status === 503);
  if (!updating) return null;

  return (
    <div className="border-b border-sky-200 bg-sky-50" role="status">
      <p className="mx-auto max-w-6xl px-4 py-2 text-xs text-sky-900">
        <strong>FPL is updating.</strong> Points may be late for an hour or two.
      </p>
    </div>
  );
}
