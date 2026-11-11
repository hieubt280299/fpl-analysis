import { useState, type FormEvent } from 'react';
import { FDR_DEFAULT_LAST_SEASON_POSITION, FDR_GAMEWEEK_WEIGHTS_TOTAL } from '@/config/fdr';
import { validateGameweekWeights, type Team } from '@/domain/fdr';
import { roundHalfAwayFromZero } from '@/domain/shared/math';
import {
  DEFAULT_FDR,
  isValidPosition,
  useSaveFdrSettings,
  type FdrSettings,
} from '@/features/settings';
import { Alert, Button, Card, cn } from '@/components/ui';
import { errorMessage } from '@/utils/errors';

interface Props {
  settings: FdrSettings;
  teams: readonly Team[];
  onDone: () => void;
}

function toDraftPositions(settings: FdrSettings, teams: readonly Team[]): Record<number, string> {
  return Object.fromEntries(
    teams.map((t) => [
      t.code,
      String(settings.lastSeasonPositions[t.code] ?? FDR_DEFAULT_LAST_SEASON_POSITION),
    ]),
  );
}

function formatWeight(n: number): string {
  return String(roundHalfAwayFromZero(n, 4));
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

/** Admin: edit the formula weights and last season's final positions. */
export function FdrSettingsPanel({ settings, teams, onDone }: Props) {
  const save = useSaveFdrSettings();
  const [gwWeights, setGwWeights] = useState(() => settings.gameweekWeights.map(formatWeight));
  const [lastWeight, setLastWeight] = useState(formatWeight(settings.lastSeasonWeight));
  const [thisWeight, setThisWeight] = useState(formatWeight(1 - settings.lastSeasonWeight));
  const [label, setLabel] = useState(settings.lastSeasonLabel);
  const [positions, setPositions] = useState(() => toDraftPositions(settings, teams));
  const [formError, setFormError] = useState<string | null>(null);

  const gwWeightNumbers = gwWeights.map((w) => (w.trim() === '' ? Number.NaN : Number(w)));
  const gwWeightsTotal = roundHalfAwayFromZero(
    gwWeightNumbers.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    4,
  );
  const gwWeightsError = validateGameweekWeights(gwWeightNumbers);

  const onLastWeightChange = (value: string) => {
    setLastWeight(value);
    const n = Number(value);
    if (value.trim() !== '' && n >= 0 && n <= 1) setThisWeight(formatWeight(1 - n));
  };

  const onThisWeightChange = (value: string) => {
    setThisWeight(value);
    const n = Number(value);
    if (value.trim() !== '' && n >= 0 && n <= 1) setLastWeight(formatWeight(1 - n));
  };

  const resetToDefaults = () => {
    setGwWeights(DEFAULT_FDR.gameweekWeights.map(formatWeight));
    setLastWeight(formatWeight(DEFAULT_FDR.lastSeasonWeight));
    setThisWeight(formatWeight(1 - DEFAULT_FDR.lastSeasonWeight));
    setLabel(DEFAULT_FDR.lastSeasonLabel);
    setPositions(toDraftPositions(DEFAULT_FDR, teams));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (gwWeightsError) {
      setFormError(gwWeightsError);
      return;
    }

    const last = Number(lastWeight);
    const current = Number(thisWeight);
    if (lastWeight.trim() === '' || !(last >= 0 && last <= 1)) {
      setFormError('Weights must be numbers between 0 and 1.');
      return;
    }
    if (Math.abs(last + current - 1) > 1e-9) {
      setFormError('Last-season and this-season weights must add up to 1.');
      return;
    }

    const parsed: Record<number, number> = {};
    for (const team of teams) {
      const value = Number(positions[team.code]);
      if (!isValidPosition(value)) {
        setFormError(`${team.name}: position must be a whole number from 1 to 20.`);
        return;
      }
      parsed[team.code] = value;
    }

    save.mutate(
      {
        gameweekWeights: gwWeightNumbers.map((w) => roundHalfAwayFromZero(w, 4)),
        lastSeasonWeight: roundHalfAwayFromZero(last, 4),
        lastSeasonLabel: label.trim().slice(0, 20),
        lastSeasonPositions: parsed,
      },
      { onSuccess: onDone },
    );
  };

  const sortedTeams = [...teams].sort(
    (a, b) =>
      Number(positions[a.code] ?? 99) - Number(positions[b.code] ?? 99) ||
      a.name.localeCompare(b.name),
  );

  return (
    <Card
      title="FDR formula settings"
      description="Applies to everyone viewing the table."
      actions={
        <Button size="sm" variant="ghost" onClick={resetToDefaults}>
          Reset to defaults
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="label">
            Gameweek weights, nearest first (must add up to {FDR_GAMEWEEK_WEIGHTS_TOTAL})
          </legend>
          <div className="grid max-w-xl grid-cols-5 gap-2">
            {gwWeights.map((value, i) => (
              <div key={ORDINALS[i]}>
                <label htmlFor={`gw-weight-${i}`} className="text-xs text-slate-500">
                  {ORDINALS[i]} GW
                </label>
                <input
                  id={`gw-weight-${i}`}
                  className="input px-2"
                  type="number"
                  min={0}
                  max={FDR_GAMEWEEK_WEIGHTS_TOTAL}
                  step={0.1}
                  value={value}
                  onChange={(e) =>
                    setGwWeights((prev) => prev.map((w, j) => (j === i ? e.target.value : w)))
                  }
                />
              </div>
            ))}
          </div>
          <p
            className={cn(
              'mt-1 text-xs',
              gwWeightsError ? 'font-medium text-red-600' : 'text-emerald-700',
            )}
            aria-live="polite"
          >
            Total: {gwWeightsTotal} / {FDR_GAMEWEEK_WEIGHTS_TOTAL}
            {gwWeightsError ? '' : ' ✓'}
          </p>
        </fieldset>

        <fieldset>
          <legend className="label">Position weights (must add up to 1)</legend>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <div>
              <label htmlFor="w-last" className="text-xs text-slate-500">
                Last season
              </label>
              <input
                id="w-last"
                className="input"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={lastWeight}
                onChange={(e) => onLastWeightChange(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="w-this" className="text-xs text-slate-500">
                This season
              </label>
              <input
                id="w-this"
                className="input"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={thisWeight}
                onChange={(e) => onThisWeightChange(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Multiplier = 0.8 + 0.01 × last-season position × <strong>{lastWeight || '?'}</strong> +
            0.01 × this-season position × <strong>{thisWeight || '?'}</strong>
          </p>
        </fieldset>

        <fieldset>
          <legend className="label">Last season’s final positions</legend>
          <div className="mb-3 max-w-xs">
            <label htmlFor="season-label" className="text-xs text-slate-500">
              Season label
            </label>
            <input
              id="season-label"
              className="input"
              value={label}
              maxLength={20}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2025/26"
            />
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Promoted teams default to {FDR_DEFAULT_LAST_SEASON_POSITION}.
          </p>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {sortedTeams.map((team) => (
              <label key={team.code} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{team.name}</span>
                <input
                  className="input w-16 py-1 text-right"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={positions[team.code] ?? ''}
                  onChange={(e) =>
                    setPositions((prev) => ({ ...prev, [team.code]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>

        {formError && <Alert tone="error">{formError}</Alert>}
        {save.isError && <Alert tone="error">Save failed: {errorMessage(save.error)}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Save settings
          </Button>
          <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
