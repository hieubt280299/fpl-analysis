import { CURRENCY_LABEL } from '@/config/league';

const amountFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** 112.5 → "112.5", 53.3333 → "53.33". */
export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

export function formatGold(value: number): string {
  return `${formatAmount(value)} ${CURRENCY_LABEL}`;
}

export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction);
}

/** "Fri 6 Nov, 18:30" in the given time zone (browser zone when omitted). */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

/** FPL chip ids → short labels used in tables. */
const CHIP_LABELS: Record<string, { short: string; long: string }> = {
  wildcard: { short: 'WC', long: 'Wildcard' },
  freehit: { short: 'FH', long: 'Free Hit' },
  bboost: { short: 'BB', long: 'Bench Boost' },
  '3xc': { short: 'TC', long: 'Triple Captain' },
  manager: { short: 'AM', long: 'Assistant Manager' },
};

export function chipLabel(chip: string): { short: string; long: string } {
  return CHIP_LABELS[chip] ?? { short: chip.slice(0, 2).toUpperCase(), long: chip };
}
