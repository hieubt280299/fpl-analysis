import { useId, useState, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * Small (i) button that shows/hides a short help text. Keeps screens clean: explanations are
 * there when someone wants them, hidden otherwise.
 */
export function useInfoToggle(info: ReactNode | undefined) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = info ? (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      aria-label={open ? 'Hide info' : 'Show info'}
      title={open ? 'Hide info' : 'Show info'}
      onClick={() => setOpen((v) => !v)}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold italic leading-none transition-colors',
        open
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-slate-300 text-slate-500 hover:border-brand-500 hover:text-brand-700',
      )}
    >
      i
    </button>
  ) : null;
  const panel =
    info && open ? (
      <div id={id} className="mt-1 text-sm text-slate-500">
        {info}
      </div>
    ) : null;
  return { button, panel };
}
