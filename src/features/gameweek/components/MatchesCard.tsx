import { useState } from 'react';
import { matchState, type Match } from '@/domain/gameweek';
import { Badge, Card, cn, ErrorState, LoadingState } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import type { GameweekView, Lookups } from '../hooks/useGameweekView';
import { MatchDetails } from './MatchDetails';

function MatchStatus({ match, timeZone }: { match: Match; timeZone: string }) {
  switch (matchState(match)) {
    case 'live':
      return (
        <Badge tone="info" title="Match is on">
          In play ({match.minutes}’)
        </Badge>
      );
    case 'done-provisional':
      return (
        <Badge tone="success" title="Full time, waiting for FPL to confirm">
          Done (P)
        </Badge>
      );
    case 'done':
      return <Badge tone="success">Done</Badge>;
    default:
      return (
        <span className="whitespace-nowrap text-xs text-slate-500">
          {match.kickoff ? formatDateTime(match.kickoff, timeZone) : 'No date yet'}
        </span>
      );
  }
}

function MatchRow({
  match,
  lookups,
  timeZone,
}: {
  match: Match;
  lookups: Lookups;
  timeZone: string;
}) {
  const [open, setOpen] = useState(false);
  const started = matchState(match) !== 'upcoming';
  const home = lookups.team(match.homeTeamId);
  const away = lookups.team(match.awayTeamId);
  const score = started ? `${match.homeGoals ?? 0} – ${match.awayGoals ?? 0}` : '? – ?';

  const content = (
    <>
      <span className="truncate text-right">
        <span className="sm:hidden">{home?.shortName}</span>
        <span className="hidden sm:inline">{home?.name ?? match.homeTeamId}</span>
      </span>
      <span className="text-center font-bold tabular-nums text-slate-900">{score}</span>
      <span className="truncate">
        <span className="sm:hidden">{away?.shortName}</span>
        <span className="hidden sm:inline">{away?.name ?? match.awayTeamId}</span>
      </span>
      <span className="flex items-center justify-end gap-1.5">
        <MatchStatus match={match} timeZone={timeZone} />
        {started && (
          <span
            className={cn('text-slate-400 transition-transform', open && 'rotate-180')}
            aria-hidden
          >
            ▾
          </span>
        )}
      </span>
    </>
  );
  const rowClass =
    'grid min-h-11 w-full grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-left text-sm sm:gap-3 sm:px-4';

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      {started ? (
        <button
          type="button"
          className={cn(rowClass, 'hover:bg-slate-50 focus-visible:bg-slate-50')}
          aria-expanded={open}
          aria-label={`${home?.name ?? ''} ${score} ${away?.name ?? ''}: ${open ? 'hide' : 'show'} details`}
          onClick={() => setOpen((v) => !v)}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
      {open && <MatchDetails match={match} lookups={lookups} />}
    </li>
  );
}

function MatchGroup({
  title,
  matches,
  lookups,
  timeZone,
}: {
  title: string;
  matches: Match[];
  lookups: Lookups;
  timeZone: string;
}) {
  if (matches.length === 0) return null;
  return (
    <div>
      <h3 className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:px-4">
        {title}
      </h3>
      <ul>
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} lookups={lookups} timeZone={timeZone} />
        ))}
      </ul>
    </div>
  );
}

/** The gameweek's matches: started ones (tap for goals, assists, bonus, cards), then upcoming. */
export function MatchesCard({ view }: { view: GameweekView }) {
  const { list, isPending, error, refetch } = view.matches;
  const timeZone = view.people.timeZone;
  const started = list.filter((m) => matchState(m) !== 'upcoming');
  const upcoming = list.filter((m) => matchState(m) === 'upcoming');

  return (
    <Card
      title="Matches"
      info={
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Tap a match to see goals, assists, bonus points and cards.</li>
          <li>Done (P): full time, FPL has not confirmed the result yet.</li>
          <li>Bonus “from BPS”: worked out from the BPS until FPL adds it.</li>
          <li>
            Times are {timeZone === 'Asia/Ho_Chi_Minh' ? 'Vietnam time' : `${timeZone} time`}.
          </li>
        </ul>
      }
      flush
    >
      {isPending ? (
        <LoadingState label="Loading matches…" />
      ) : error ? (
        <div className="p-3 sm:p-4">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : list.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No matches in this gameweek.</p>
      ) : (
        <>
          <MatchGroup
            title="Live & finished"
            matches={started}
            lookups={view.lookups}
            timeZone={timeZone}
          />
          <MatchGroup
            title="Upcoming"
            matches={upcoming}
            lookups={view.lookups}
            timeZone={timeZone}
          />
        </>
      )}
    </Card>
  );
}
