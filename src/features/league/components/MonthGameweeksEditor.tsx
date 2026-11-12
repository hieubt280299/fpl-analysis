import { useState } from 'react';
import {
  applyMonthGameweekEdit,
  editableGameweeks,
  formatMonthLabel,
  type Gameweek,
  type GameweekMonthOverrides,
  type LeagueMonth,
  type MonthKey,
} from '@/domain/league';
import { useSaveCalendarSettings } from '@/features/settings';
import { Alert, Button, Card } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

interface Props {
  monthKey: MonthKey;
  /** Current grouping of this season's gameweeks (admin moves applied). */
  months: readonly LeagueMonth[];
  gameweeks: readonly Gameweek[];
  automaticMonths: ReadonlyMap<number, MonthKey>;
  overrides: GameweekMonthOverrides;
  finalizedMonths: ReadonlySet<MonthKey>;
  currentSeason: string | null;
  timeZone: string;
  onDone: () => void;
}

/** Admin: choose which gameweeks belong to this month (e.g. join a short month to the next). */
export function MonthGameweeksEditor({
  monthKey,
  months,
  gameweeks,
  automaticMonths,
  overrides,
  finalizedMonths,
  currentSeason,
  timeZone,
  onDone,
}: Props) {
  const save = useSaveCalendarSettings();
  const { previous, current, next, candidates } = editableGameweeks(
    months,
    monthKey,
    finalizedMonths,
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set(current?.gameweekIds ?? []));
  const [formError, setFormError] = useState<string | null>(null);
  const byId = new Map(gameweeks.map((gw) => [gw.id, gw]));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });

  const resetToDates = () =>
    setSelected(new Set(candidates.filter((id) => automaticMonths.get(id) === monthKey)));

  const handleSave = () => {
    setFormError(null);
    if (!currentSeason) {
      setFormError('FPL data is not loaded yet. Try again.');
      return;
    }
    const result = applyMonthGameweekEdit({
      months,
      monthKey,
      selected: [...selected],
      automatic: automaticMonths,
      overrides,
      locked: finalizedMonths,
    });
    if ('error' in result) {
      setFormError(result.error);
      return;
    }
    save.mutate({ season: currentSeason, gameweekMonths: result.overrides }, { onSuccess: onDone });
  };

  const groups: Array<{ month: LeagueMonth; label: string }> = [
    ...(previous ? [{ month: previous, label: formatMonthLabel(previous.key) }] : []),
    ...(current ? [{ month: current, label: `${formatMonthLabel(monthKey)} (this month)` }] : []),
    ...(next ? [{ month: next, label: formatMonthLabel(next.key) }] : []),
  ];

  return (
    <Card
      title={`Gameweeks in ${formatMonthLabel(monthKey)}`}
      info="Tick the GWs for this month. You can take GWs from the month before or after (no gaps). Finalized months can’t change."
      actions={
        <Button size="sm" variant="ghost" onClick={resetToDates}>
          Reset to deadlines
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {groups.map(({ month, label }) => (
          <fieldset key={month.key}>
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </legend>
            <ul className="space-y-1">
              {month.gameweekIds.map((id) => {
                const gw = byId.get(id);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                        checked={selected.has(id)}
                        onChange={() => toggle(id)}
                      />
                      <span className="font-medium">GW{id}</span>
                      {gw && (
                        <span className="text-xs text-slate-500">
                          {formatDateTime(gw.deadline, timeZone)}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      {formError && (
        <Alert tone="error" className="mt-4">
          {formError}
        </Alert>
      )}
      {save.isError && (
        <Alert tone="error" className="mt-4">
          Could not save: {errorMessage(save.error)}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <strong>{selected.size}</strong> GW{selected.size === 1 ? '' : 's'} selected
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={save.isPending}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
