import type { ReactNode } from 'react';
import { formatMonthLabel, gameweekProgress, gameweekResultState } from '@/domain/league';
import { ResultStateBadge } from '@/features/league';
import {
  Alert,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  RefreshPointsButton,
  StaleDataNotice,
} from '@/components/ui';
import { useGameweekView, type GameweekView } from '../hooks/useGameweekView';
import { ImportanceSection } from '../components/ImportanceSection';
import { MatchesCard } from '../components/MatchesCard';
import { OwnershipMatrix } from '../components/OwnershipMatrix';

/** Route `/gameweek` — live view of FPL's current gameweek for the mini-league. */
export function GameweekPage() {
  const view = useGameweekView();
  const { gameweek } = view;

  const header = (
    <PageHeader
      title={gameweek ? `Gameweek ${gameweek.id}` : 'Current GW'}
      info={
        <ul className="list-disc space-y-0.5 pl-4">
          <li>FPL’s current gameweek, with live points.</li>
          <li>
            Teams: the players chosen for this GW’s month, or everyone in the league if none are
            chosen yet.
          </li>
          <li>Points update by themselves while a match is on.</li>
        </ul>
      }
      actions={
        gameweek && (
          <ResultStateBadge
            state={gameweekResultState(gameweek)}
            gameweek={gameweek}
            progress={gameweekProgress(gameweek, view.eventStatus)}
          />
        )
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
        <ErrorState error={view.error} onRetry={view.refetchSeason} />
      </>
    );
  }
  if (!gameweek) {
    return (
      <>
        {header}
        <EmptyState title="The season has not started">
          This page shows the current gameweek once the first deadline has passed.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        <StaleDataNotice
          error={view.refreshError}
          updatedAt={view.updatedAt}
          onRetry={() => void view.refresh()}
          retrying={view.isFetching}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <TeamsNote view={view} />
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
            {view.autoRefreshing && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
                title="A match is on: points update by themselves"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live · auto-updates
              </span>
            )}
            <RefreshPointsButton
              refresh={view.refresh}
              isFetching={view.isFetching}
              updatedAt={view.updatedAt}
            />
          </div>
        </div>

        <LineupsGate view={view}>
          <ImportanceSection view={view} />
        </LineupsGate>
        <MatchesCard view={view} />
        <LineupsGate view={view} quiet>
          <OwnershipMatrix view={view} />
        </LineupsGate>
      </div>
    </>
  );
}

function TeamsNote({ view }: { view: GameweekView }) {
  const { people } = view;
  if (people.isPending || people.participants.length === 0) return null;
  const month = people.monthKey ? formatMonthLabel(people.monthKey) : null;
  return (
    <p className="text-xs text-slate-500">
      {people.source === 'month' && month
        ? `${people.participants.length} players of ${month}`
        : `All ${people.participants.length} league members${month ? ` (no players chosen for ${month} yet)` : ''}`}
    </p>
  );
}

/**
 * Pending / error / empty states for sections built from the teams' picks and live points.
 * `quiet`: render nothing instead of repeating a state the first section already shows.
 */
function LineupsGate({
  view,
  quiet = false,
  children,
}: {
  view: GameweekView;
  quiet?: boolean;
  children: ReactNode;
}) {
  const { people, live, picks } = view;
  if (people.error) {
    return quiet ? null : <ErrorState error={people.error} onRetry={people.refetch} />;
  }
  if (live.error) {
    return quiet ? null : <ErrorState error={live.error} onRetry={live.refetch} />;
  }
  if (people.isPending || live.isPending || picks.isPending) {
    return quiet ? null : <LoadingState label="Loading teams…" />;
  }
  if (people.participants.length === 0) {
    return quiet ? null : <EmptyState title="No teams yet">The league has no members.</EmptyState>;
  }

  const failed = people.participants.filter((p) => picks.failedEntryIds.includes(p.entryId));
  return (
    <>
      {!quiet && failed.length > 0 && (
        <ErrorState
          title={`Could not load the team of ${failed.map((p) => p.playerName).join(', ')}`}
          error={picks.errors[0]}
          onRetry={picks.refetch}
        />
      )}
      {view.lineups.length > 0
        ? children
        : !quiet && (
            <Alert tone="warning" title="No teams loaded">
              Try again in a few minutes.
            </Alert>
          )}
    </>
  );
}
