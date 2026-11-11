import type { ReactNode } from 'react';
import { Alert } from './Alert';
import { errorMessage } from '@/utils/errors';
import { Button } from './Button';

export function ErrorState({
  title = 'Could not load data',
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <Alert
      tone="error"
      title={title}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
