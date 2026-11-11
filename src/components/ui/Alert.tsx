import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'info' | 'warning' | 'error' | 'success';

const TONES: Record<Tone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm',
        TONES[tone],
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}
