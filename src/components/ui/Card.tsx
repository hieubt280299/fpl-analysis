import type { ReactNode } from 'react';
import { cn } from './cn';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove body padding (e.g. for edge-to-edge tables). */
  flush?: boolean;
}

export function Card({ title, description, actions, children, className, flush }: CardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  );
}
