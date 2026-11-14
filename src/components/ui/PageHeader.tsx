import type { ReactNode } from 'react';
import { useInfoToggle } from './InfoButton';

export function PageHeader({
  title,
  info,
  actions,
}: {
  title: ReactNode;
  /** Help text behind an (i) button next to the title. */
  info?: ReactNode;
  actions?: ReactNode;
}) {
  const infoToggle = useInfoToggle(info);
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {infoToggle.button}
        </div>
        {infoToggle.panel}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}
