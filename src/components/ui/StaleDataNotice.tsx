import { formatDateTime } from '@/utils/format';
import { Alert } from './Alert';
import { Button } from './Button';

/**
 * Shown when FPL could not be reached but saved (cached) data is still on screen.
 * Pass `error` = the refresh error; renders nothing when it is null.
 */
export function StaleDataNotice({
  error,
  updatedAt,
  onRetry,
  retrying = false,
}: {
  error: unknown;
  updatedAt: Date | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (!error) return null;
  return (
    <Alert
      tone="warning"
      title="Showing saved data"
      action={
        onRetry && (
          <Button size="sm" variant="secondary" loading={retrying} onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      FPL is not reachable right now.
      {updatedAt ? ` Data from ${formatDateTime(updatedAt.toISOString())}.` : ''}
    </Alert>
  );
}
