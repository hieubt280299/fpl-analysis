import { formatMonthLabel, type MonthKey } from '@/domain/league';
import { Button } from '@/components/ui';
import type { MonthOption } from '../hooks/useMonthView';

export function MonthPicker({
  options,
  value,
  onChange,
}: {
  options: readonly MonthOption[];
  value: MonthKey;
  onChange: (key: MonthKey) => void;
}) {
  const index = options.findIndex((o) => o.key === value);
  const previous = index > 0 ? options[index - 1] : undefined;
  const next = index >= 0 && index < options.length - 1 ? options[index + 1] : undefined;

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        variant="secondary"
        size="sm"
        className="w-11 text-base sm:w-auto"
        aria-label="Previous month"
        disabled={!previous}
        onClick={() => previous && onChange(previous.key)}
      >
        ‹
      </Button>
      <label htmlFor="month-picker" className="sr-only">
        Month
      </label>
      <select
        id="month-picker"
        className="input h-9 flex-1 py-0 pr-8 sm:h-8 sm:w-auto sm:flex-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {index < 0 && <option value={value}>{formatMonthLabel(value)}</option>}
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {formatMonthLabel(o.key)}
            {o.finalized ? ' ✓' : ''}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        size="sm"
        className="w-11 text-base sm:w-auto"
        aria-label="Next month"
        disabled={!next}
        onClick={() => next && onChange(next.key)}
      >
        ›
      </Button>
    </div>
  );
}
