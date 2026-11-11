import { useMemo, useState } from 'react';
import { LEAGUE_RULES } from '@/config/league';
import { formatMonthLabel, type MonthKey, type Participant } from '@/domain/league';
import { useLeagueMembers } from '@/lib/fpl/queries';
import { Alert, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { formatGold } from '@/utils/format';
import { useMonthDoc, useSaveParticipants } from '../hooks/useMonths';

interface Props {
  monthKey: MonthKey;
  leagueId: number;
  current: readonly Participant[];
  previousMonthKey?: MonthKey;
  onDone: () => void;
}

interface Row extends Participant {
  rank: number | null;
  totalPoints: number | null;
  /** In the saved month but no longer in the FPL league. */
  departed: boolean;
}

/** Admin: choose which league members take part in a month. */
export function ParticipantsEditor({
  monthKey,
  leagueId,
  current,
  previousMonthKey,
  onDone,
}: Props) {
  const league = useLeagueMembers(leagueId);
  const previousMonth = useMonthDoc(previousMonthKey);
  const save = useSaveParticipants();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(current.map((p) => p.entryId)),
  );

  const rows = useMemo<Row[]>(() => {
    const members: Row[] = (league.data?.members ?? []).map((m) => ({ ...m, departed: false }));
    const memberIds = new Set(members.map((m) => m.entryId));
    const departed: Row[] = current
      .filter((p) => !memberIds.has(p.entryId))
      .map((p) => ({ ...p, rank: null, totalPoints: null, departed: true }));
    return [...members, ...departed];
  }, [league.data, current]);

  const previousParticipants = previousMonth.data?.participants ?? [];

  const toggle = (entryId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });

  const handleSave = () => {
    const participants = rows
      .filter((r) => selected.has(r.entryId))
      .map(({ entryId, playerName, entryName }) => ({ entryId, playerName, entryName }));
    save.mutate({ monthKey, leagueId, participants }, { onSuccess: onDone });
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
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {rows.map((row) => (
            <li key={row.entryId}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  checked={selected.has(row.entryId)}
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
                  </span>
                </span>
                {row.totalPoints !== null && (
                  <span className="text-xs tabular-nums text-slate-500">{row.totalPoints} pts</span>
                )}
              </label>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">
              This league has no members.
            </li>
          )}
        </ul>
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
