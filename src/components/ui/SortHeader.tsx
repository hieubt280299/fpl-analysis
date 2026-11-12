import type { ReactNode } from 'react';
import { cn } from './cn';

export type SortDirection = 'asc' | 'desc';

/** A clickable `<th>` for sortable tables, with an arrow and `aria-sort`. */
export function SortHeader<K extends string | number>({
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'right',
  title,
  className,
  disabled = false,
  children,
}: {
  sortKey: K;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: 'left' | 'right' | 'center';
  title?: string;
  className?: string;
  /** Show as a plain header (e.g. a gameweek with no scores yet). */
  disabled?: boolean;
  children: ReactNode;
}) {
  const active = !disabled && activeKey === sortKey;
  const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const justify =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : undefined;

  if (disabled) {
    return (
      <th className={className} title={title}>
        <div className={cn('flex items-center gap-1', justify)}>{children}</div>
      </th>
    );
  }
  return (
    <th aria-sort={ariaSort} className={cn('!p-0', className)} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex w-full items-center gap-1 px-3 py-2 uppercase hover:bg-white/10 focus-visible:ring-inset',
          justify,
        )}
      >
        {children}
        <span aria-hidden="true" className={cn('text-[10px]', !active && 'opacity-40')}>
          {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}
