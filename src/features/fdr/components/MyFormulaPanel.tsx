import { useState } from 'react';
import { roundHalfAwayFromZero } from '@/domain/shared/math';
import { Button, Card } from '@/components/ui';
import type { CustomFormula } from '../model';

interface Props {
  /** The formula shown now: the guest's own, or the shared one as a starting point. */
  value: CustomFormula;
  gameweekIds: readonly number[];
  isCustom: boolean;
  onChange: (next: CustomFormula) => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * Guest-only: play with the formula. Changes apply at once and only in this browser tab — the
 * table for everyone else stays the same. No rules: any GW weights, any position split.
 */
export function MyFormulaPanel({
  value,
  gameweekIds,
  isCustom,
  onChange,
  onReset,
  onClose,
}: Props) {
  // Keep what the user types (e.g. "2.") while the table uses the parsed numbers.
  const [drafts, setDrafts] = useState(() => value.gameweekWeights.map(String));
  const lastSeasonPct = Math.round(value.lastSeasonShare * 100);
  const total = roundHalfAwayFromZero(
    value.gameweekWeights.reduce((a, b) => a + b, 0),
    2,
  );
  const firstGw = gameweekIds[0];
  const label = (i: number) =>
    gameweekIds[i] !== undefined
      ? `GW${gameweekIds[i]}`
      : firstGw !== undefined
        ? `GW${firstGw + i}`
        : `GW +${i + 1}`;

  const setWeight = (index: number, text: string) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? text : d)));
    const parsed = Number(text);
    const weight = text.trim() === '' || !Number.isFinite(parsed) ? 0 : parsed;
    onChange({
      ...value,
      gameweekWeights: value.gameweekWeights.map((w, i) => (i === index ? weight : w)),
    });
  };

  return (
    <Card
      title="My formula"
      info="Only for you, in this browser tab. Everyone else still sees the normal table."
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onReset} disabled={!isCustom}>
            Reset to defaults
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="label">GW weights</legend>
          <div className="grid max-w-xl grid-cols-5 gap-1.5 sm:gap-2">
            {drafts.map((draft, i) => (
              <div key={i}>
                <label htmlFor={`my-gw-weight-${i}`} className="text-xs text-slate-500">
                  {label(i)}
                </label>
                <input
                  id={`my-gw-weight-${i}`}
                  className="input px-2"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  value={draft}
                  onChange={(e) => setWeight(i, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">Total: {total}</p>
        </fieldset>

        <fieldset className="max-w-xl">
          <legend className="label">Position weights</legend>
          <div className="flex justify-between text-sm text-slate-700">
            <span>
              Last season <strong>{lastSeasonPct}%</strong>
            </span>
            <span>
              This season <strong>{100 - lastSeasonPct}%</strong>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={lastSeasonPct}
            onChange={(e) => onChange({ ...value, lastSeasonShare: Number(e.target.value) / 100 })}
            aria-label="Last season weight in percent"
            aria-valuetext={`Last season ${lastSeasonPct}%, this season ${100 - lastSeasonPct}%`}
            className="mt-2 h-8 w-full cursor-pointer accent-brand-700"
          />
        </fieldset>
      </div>
    </Card>
  );
}
