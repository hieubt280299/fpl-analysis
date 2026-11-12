import { useState, type FormEvent } from 'react';
import {
  DEFAULT_LAST_SEASON,
  FDR_DEFAULT_LAST_SEASON_POSITION,
  FDR_GAMEWEEK_WEIGHTS_TOTAL,
} from '@/config/fdr';
import { validateGameweekWeights, type PositionWeights, type Team } from '@/domain/fdr';
import { roundHalfAwayFromZero } from '@/domain/shared/math';
import {
  DEFAULT_FDR,
  isValidPosition,
  useSaveFdrSettings,
  type FdrSettings,
} from '@/features/settings';
import { Alert, Button, Card, cn } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { formatPercent } from '@/utils/format';

interface Props {
  settings: FdrSettings;
  teams: readonly Team[];
  /** The gameweeks in the table now, used to label the weight inputs. */
  gameweekIds: readonly number[];
  positionWeights: PositionWeights;
  /** Last season's label for the current FPL season, e.g. "2025/26" (null if unknown). */
  expectedLastSeason: string | null;
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

/** Admin: edit the gameweek weights and (once a year) last season's final table. */
export function FdrSettingsPanel({
  settings,
  teams,
  gameweekIds,
  positionWeights,
  expectedLastSeason,
  onDone,
}: Props) {
  const save = useSaveFdrSettings();
  const [gwWeights, setGwWeights] = useState(() => settings.gameweekWeights.map(formatWeight));
  const [positions, setPositions] = useState(() => toDraftPositions(settings, teams));
  const lastSeasonOutdated =
    expectedLastSeason !== null && settings.lastSeasonLabel !== expectedLastSeason;
  const [showLastSeason, setShowLastSeason] = useState(lastSeasonOutdated);
  const [formError, setFormError] = useState<string | null>(null);

  const gwWeightNumbers = gwWeights.map((w) => (w.trim() === '' ? Number.NaN : Number(w)));
  const gwWeightsTotal = roundHalfAwayFromZero(
    gwWeightNumbers.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    4,
  );
  const gwWeightsError = validateGameweekWeights(gwWeightNumbers);
  const firstGw = gameweekIds[0];
  const weightLabel = (i: number) =>
    gameweekIds[i] !== undefined
      ? `GW${gameweekIds[i]}`
      : firstGw !== undefined
        ? `GW${firstGw + i}`
        : `GW +${i + 1}`;

  const resetToDefaults = () => {
    setGwWeights(DEFAULT_FDR.gameweekWeights.map(formatWeight));
    setPositions(toDraftPositions(DEFAULT_FDR, teams));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (gwWeightsError) {
      setFormError(gwWeightsError);
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
        // The positions are for last season — the label is worked out automatically.
        lastSeasonLabel: showLastSeason
          ? (expectedLastSeason ?? DEFAULT_LAST_SEASON.label)
          : settings.lastSeasonLabel,
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
      title="Formula settings"
      info="Changes apply for everyone."
      actions={
        <Button size="sm" variant="ghost" onClick={resetToDefaults}>
          Reset to defaults
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="label">GW weights (total must be {FDR_GAMEWEEK_WEIGHTS_TOTAL})</legend>
          <div className="grid max-w-xl grid-cols-5 gap-2">
            {gwWeights.map((value, i) => (
              <div key={i}>
                <label htmlFor={`gw-weight-${i}`} className="text-xs text-slate-500">
                  {weightLabel(i)}
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

        <p className="text-sm text-slate-700">
          Position weights: last season <strong>{formatPercent(positionWeights.lastSeason)}</strong>{' '}
          · this season <strong>{formatPercent(positionWeights.thisSeason)}</strong>
        </p>

        <div>
          <Button
            size="sm"
            variant="secondary"
            aria-expanded={showLastSeason}
            onClick={() => setShowLastSeason((v) => !v)}
          >
            {showLastSeason ? 'Hide' : 'Edit'} last season’s table ({settings.lastSeasonLabel})
          </Button>
          {lastSeasonOutdated && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              New season: please enter the {expectedLastSeason} final table.
            </p>
          )}
          {showLastSeason && (
            <fieldset className="mt-3">
              <legend className="label">
                Final positions {expectedLastSeason ?? settings.lastSeasonLabel}
              </legend>
              <p className="mb-2 text-xs text-slate-500">
                New (promoted) teams: {FDR_DEFAULT_LAST_SEASON_POSITION}.
              </p>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                {sortedTeams.map((team) => (
                  <label
                    key={team.code}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
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
          )}
        </div>

        {formError && <Alert tone="error">{formError}</Alert>}
        {save.isError && <Alert tone="error">Save failed: {errorMessage(save.error)}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
          <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
