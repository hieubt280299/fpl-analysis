import { useMemo, useState } from 'react';
import { LEAGUE_RULES } from '@/config/league';
import { formatMonthLabel, type MonthKey, type Participant } from '@/domain/league';
import { useLeagueMembers } from '@/lib/fpl/queries';
import { Alert, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { formatGold } from '@/utils/format';
import { useMonthDoc, useSaveParticipants } from '../hooks/useMonths';
import { MAX_PENALTY_FREE_POINTS, isValidPenaltyFree } from '../model';

interface Props {
  monthKey: MonthKey;
  leagueId: number;
  current: readonly Participant[];
  currentPenaltyFree: Readonly<Record<number, number>>;
  /** First gameweek of the month — the only one the penalty-free allowance applies to. */
  penaltyFreeGameweek: number | null;
  previousMonthKey?: MonthKey;
  onDone: () => void;
}

interface Row extends Participant {
  rank: number | null;
  totalPoints: number | null;
  /** In the saved month but no longer in the FPL league. */
  departed: boolean;
}

/** Admin: choose which league members take part in a month, and their penalty-free allowance. */
export function ParticipantsEditor({
  monthKey,
  leagueId,
  current,
  currentPenaltyFree,
  penaltyFreeGameweek,
  previousMonthKey,
  onDone,
}: Props) {
  const league = useLeagueMembers(leagueId);
  const previousMonth = useMonthDoc(previousMonthKey);
  const save = useSaveParticipants();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(current.map((p) => p.entryId)),
  );
  const [allowances, setAllowances] = useState<Record<number, string>>(() =>
    Object.fromEntries(Object.entries(currentPenaltyFree).map(([id, pts]) => [id, String(pts)])),
  );
  const [bulkAllowance, setBulkAllowance] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const members: Row[] = (league.data?.members ?? []).map((m) => ({ ...m, departed: false }));
    const memberIds = new Set(members.map((m) => m.entryId));
    const departed: Row[] = current
      .filter((p) => !memberIds.has(p.entryId))
      .map((p) => ({ ...p, rank: null, totalPoints: null, departed: true }));
    return [...members, ...departed];
  }, [league.data, current]);

  const previousParticipants = previousMonth.data?.participants ?? [];
  const gwLabel = penaltyFreeGameweek ? `GW${penaltyFreeGameweek}` : 'the first GW';

  const toggle = (entryId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });

  const applyToSelected = () =>
    setAllowances((prev) => {
      const next = { ...prev };
      for (const id of selected) next[id] = bulkAllowance;
      return next;
    });

  const handleSave = () => {
    setFormError(null);
    const participants = rows
      .filter((r) => selected.has(r.entryId))
      .map(({ entryId, playerName, entryName }) => ({ entryId, playerName, entryName }));

    const penaltyFree: Record<number, number> = {};
    for (const p of participants) {
      const raw = (allowances[p.entryId] ?? '').trim();
      if (raw === '') continue;
      const points = Number(raw);
      if (!isValidPenaltyFree(points)) {
        setFormError(
          `${p.playerName}: penalty-free points must be a whole number from 0 to ${MAX_PENALTY_FREE_POINTS}.`,
        );
        return;
      }
      if (points > 0) penaltyFree[p.entryId] = points;
    }

    save.mutate({ monthKey, leagueId, participants, penaltyFree }, { onSuccess: onDone });
  };

  return (
    <Card
      title={`Participants — ${formatMonthLabel(monthKey)}`}
      description={
        league.data ? `From “${league.data.leagueName}” (league ${leagueId})` : undefined
      }
      actions={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set(rows.map((r) => r.entryId)))}
          >
            Select all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          {previousMonthKey && previousParticipants.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set(previousParticipants.map((p) => p.entryId)))}
            >
              Copy {formatMonthLabel(previousMonthKey, 'short')}
            </Button>
          )}
        </>
      }
    >
      {league.isPending && <LoadingState label="Loading league members…" />}
      {league.isError && <ErrorState error={league.error} onRetry={() => void league.refetch()} />}

      {league.data && (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <div className="mr-auto min-w-0">
              <p className="font-medium text-slate-800">Penalty-free points ({gwLabel} only)</p>
              <p className="text-xs text-slate-500">
                Transfer hits up to this many points are waived, e.g. 8 turns −4 into 0 and −16 into
                −8. Default 0.
              </p>
            </div>
            <label className="sr-only" htmlFor="bulk-allowance">
              Points for all selected players
            </label>
            <input
              id="bulk-allowance"
              className="input w-20 py-1 text-right"
              type="number"
              min={0}
              max={MAX_PENALTY_FREE_POINTS}
              step={4}
              placeholder="0"
              value={bulkAllowance}
              onChange={(e) => setBulkAllowance(e.target.value)}
            />
            <Button size="sm" variant="secondary" onClick={applyToSelected}>
              Apply to selected
            </Button>
          </div>

          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {rows.map((row) => {
              const isSelected = selected.has(row.entryId);
              return (
                <li
                  key={row.entryId}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                      checked={isSelected}
                      onChange={() => toggle(row.entryId)}
                    />
                    <span className="w-8 text-right text-xs tabular-nums text-slate-400">
                      {row.rank ?? '–'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {row.playerName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {row.entryName}
                        {row.departed && ' · no longer in the league'}
                        {row.totalPoints !== null && ` · ${row.totalPoints} pts`}
                      </span>
                    </span>
                  </label>
                  {isSelected && (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                      <span className="hidden sm:inline">Penalty-free</span>
                      <input
                        className="input w-16 py-1 text-right"
                        type="number"
                        min={0}
                        max={MAX_PENALTY_FREE_POINTS}
                        step={4}
                        placeholder="0"
                        aria-label={`Penalty-free points for ${row.playerName}`}
                        value={allowances[row.entryId] ?? ''}
                        onChange={(e) =>
                          setAllowances((prev) => ({ ...prev, [row.entryId]: e.target.value }))
                        }
                      />
                    </label>
                  )}
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                This league has no members.
              </li>
            )}
          </ul>
        </>
      )}

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
          <strong>{selected.size}</strong> selected · pot{' '}
          <strong>{formatGold(selected.size * LEAGUE_RULES.entryFee)}</strong>
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={save.isPending} disabled={!league.data}>
            Save participants
          </Button>
        </div>
      </div>
    </Card>
  );
}
