import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { formatMonthLabel, isMonthKey, type MonthKey } from '@/domain/league';
import { useAuth } from '@/features/auth';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatTile,
} from '@/components/ui';
import { formatDateTime, formatGold } from '@/utils/format';
import { MonthAdminBar } from '../components/MonthAdminBar';
import { MonthPicker } from '../components/MonthPicker';
import { ParticipantsEditor } from '../components/ParticipantsEditor';
import { PointsTable } from '../components/PointsTable';
import { PrizeBreakdown } from '../components/PrizeBreakdown';
import { PrizesTable } from '../components/PrizesTable';
import { RulesNote } from '../components/RulesNote';
import { useMonthOptions, useMonthView } from '../hooks/useMonthView';

/** Route `/league/:monthKey?` — redirects to the current month when none is given. */
export function LeaguePage() {
  const { monthKey } = useParams();

  if (!monthKey) return <RedirectToDefaultMonth />;
  if (!isMonthKey(monthKey)) {
    return (
      <EmptyState
        title="Unknown month"
        action={
          <Link to="/league" className="text-sm font-medium text-brand-700 hover:underline">
            Go to the current month
          </Link>
        }
      >
        Months look like <code>/league/2026-11</code>.
      </EmptyState>
    );
  }
  // Keyed so local UI state (e.g. the participants editor) resets when the month changes.
  return <MonthView key={monthKey} monthKey={monthKey} />;
}

function RedirectToDefaultMonth() {
  const { defaultMonthKey, isPending, error, refetch } = useMonthOptions();
  if (defaultMonthKey) return <Navigate to={`/league/${defaultMonthKey}`} replace />;
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <EmptyState title="No gameweeks found">
      FPL has not published this season’s schedule yet.
    </EmptyState>
  );
}

function MonthView({ monthKey }: { monthKey: MonthKey }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const view = useMonthView(monthKey);
  const [editing, setEditing] = useState(false);

  const optionIndex = view.options.findIndex((o) => o.key === monthKey);
  const previousMonthKey = optionIndex > 0 ? view.options[optionIndex - 1]?.key : undefined;

  const header = (
    <PageHeader
      title={`Mini-league · ${formatMonthLabel(monthKey)}`}
      description="Monthly prizes for the selected league members."
      actions={
        <MonthPicker
          options={view.options}
          value={monthKey}
          onChange={(key) => void navigate(`/league/${key}`)}
        />
      }
    />
  );

  if (view.isPending) {
    return (
      <>
        {header}
        <LoadingState />
      </>
    );
  }
  if (view.error) {
    return (
      <>
        {header}
        <ErrorState error={view.error} onRetry={view.refetch} />
      </>
    );
  }

  const { standings, gameweeks, participants, scores } = view;
  const first = gameweeks[0];
  const last = gameweeks[gameweeks.length - 1];
  const hasNoGameweeks = gameweeks.length === 0;

  let finalizeBlockedReason: string | undefined;
  if (!participants.length) finalizeBlockedReason = 'Choose participants first.';
  else if (standings.monthState !== 'final')
    finalizeBlockedReason = 'Available once FPL has confirmed every gameweek of the month.';
  else if (scores.failedEntryIds.length) finalizeBlockedReason = 'Some scores failed to load.';

  return (
    <>
      {header}
      <div className="space-y-6">
        {isAdmin && !editing && (
          <MonthAdminBar
            month={view.monthDoc}
            monthKey={monthKey}
            canFinalize={view.canFinalize}
            finalizeBlockedReason={finalizeBlockedReason}
            buildSnapshot={view.buildSnapshot}
            onEditParticipants={() => setEditing(true)}
          />
        )}

        {isAdmin && editing && (
          <ParticipantsEditor
            monthKey={monthKey}
            leagueId={view.leagueId}
            current={participants}
            previousMonthKey={previousMonthKey}
            onDone={() => setEditing(false)}
          />
        )}

        {view.isFinalized && view.monthDoc?.snapshot && (
          <Alert tone="success" title="Finalized">
            Results were frozen on{' '}
            {formatDateTime(view.monthDoc.snapshot.finalizedAt, view.timeZone)}
            {view.monthDoc.updatedBy ? ` by ${view.monthDoc.updatedBy}` : ''}.
          </Alert>
        )}

        {hasNoGameweeks ? (
          <EmptyState title="No gameweeks this month">
            No gameweek deadline falls in {formatMonthLabel(monthKey)} ({view.timeZone}).
          </EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Participants" value={participants.length} />
              <StatTile label="Pot" value={formatGold(standings.prizes.pot)} />
              <StatTile
                label="Gameweeks"
                value={first && last ? `GW${first.id}–${last.id}` : '–'}
                hint={`${gameweeks.length} deadline${gameweeks.length === 1 ? '' : 's'} this month`}
              />
              <StatTile
                label="Awarded so far"
                value={formatGold(standings.totalAwarded)}
                hint={
                  standings.monthState === 'final'
                    ? 'All results final'
                    : 'Includes provisional prizes'
                }
              />
            </div>

            {participants.length === 0 ? (
              <EmptyState
                title="No participants yet"
                action={
                  isAdmin &&
                  !editing && <Button onClick={() => setEditing(true)}>Choose participants</Button>
                }
              >
                An admin needs to pick which league members play in {formatMonthLabel(monthKey)}.
              </EmptyState>
            ) : (
              <>
                <PrizeBreakdown standings={standings} timeZone={view.timeZone} />
                <ScoresSection view={view} />
              </>
            )}
          </>
        )}

        <RulesNote />
      </div>
    </>
  );
}

function ScoresSection({ view }: { view: ReturnType<typeof useMonthView> }) {
  const { scores, standings } = view;

  if (scores.isPending) return <LoadingState label="Loading FPL scores…" />;
  if (scores.failedEntryIds.length > 0) {
    const names = view.participants
      .filter((p) => scores.failedEntryIds.includes(p.entryId))
      .map((p) => p.playerName)
      .join(', ');
    return (
      <ErrorState
        title={`Could not load scores for ${names}`}
        error={scores.errors[0]}
        onRetry={scores.refetch}
      />
    );
  }

  return (
    <>
      {scores.needed && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" loading={scores.isFetching} onClick={scores.refetch}>
            Refresh scores
          </Button>
        </div>
      )}
      <PointsTable standings={standings} />
      <PrizesTable standings={standings} />
    </>
  );
}
