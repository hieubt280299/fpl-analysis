import type { ReactNode } from 'react';
import { cn } from './cn';

export interface StatItem {
  label: string;
  value: ReactNode;
  /** Extra detail after the value, in muted text (e.g. "not final yet"). */
  hint?: ReactNode;
}

/**
 * Secondary facts as one quiet line ("Players 4 · Prize pool 800 gold · …") that wraps on
 * phones. For numbers worth knowing but not the focus of the page.
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <dl
      className={cn(
        'flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-slate-500',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1">
          <dt>{item.label}</dt>
          <dd className="font-semibold tabular-nums text-slate-700">
            {item.value}
            {item.hint && <span className="ml-1 font-normal text-slate-400">({item.hint})</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
