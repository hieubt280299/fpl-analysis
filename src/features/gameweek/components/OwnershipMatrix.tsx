import { useState } from 'react';
import { MATRIX_PAGE_SIZE } from '@/config/gameweek';
import type { MatrixCell } from '@/domain/gameweek';
import { Card, cn, Pagination } from '@/components/ui';
import type { GameweekView } from '../hooks/useGameweekView';
import { PlayerMatchStatus } from './PlayerMatchStatus';
import { PlayerName } from './PlayerName';

function Cell({ cell }: { cell: MatrixCell | undefined }) {
  if (!cell) return <td />;
  if (cell.multiplier === 0) {
    return (
      <td className="num text-xs text-slate-400" title="On the bench">
        bench
      </td>
    );
  }
  return (
    <td
      className={cn('num', cell.isCaptain && 'bg-emerald-100 font-semibold')}
      title={cell.isCaptain ? `Captain ×${cell.multiplier}` : undefined}
    >
      {cell.points}
      {cell.isCaptain && (
        <sup className="ml-0.5 text-[10px] font-semibold text-emerald-800">
          {cell.multiplier === 3 ? 'TC' : 'C'}
        </sup>
      )}
    </td>
  );
}

/**
 * Players counting for at least one manager (rows) × managers (columns). A cell shows the points
 * the player scores for that manager. Ordered by live points, 20 rows per page.
 */
export function OwnershipMatrix({ view }: { view: GameweekView }) {
  const [page, setPage] = useState(1);
  const { matrix, lineups, lookups, teamPoints } = view;
  const byEntry = new Map(view.people.participants.map((p) => [p.entryId, p] as const));
  const columns = lineups.flatMap((l) => {
    const participant = byEntry.get(l.entryId);
    return participant ? [participant] : [];
  });

  const pageCount = Math.max(1, Math.ceil(matrix.length / MATRIX_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = matrix.slice((current - 1) * MATRIX_PAGE_SIZE, current * MATRIX_PAGE_SIZE);

  return (
    <Card
      title="Who owns whom"
      info={
        <ul className="list-disc space-y-0.5 pl-4">
          <li>
            Players who count for at least one team (starting XI after subs, or all 15 with Bench
            Boost).
          </li>
          <li>Each cell: the points that player gives that team. C = captain ×2, TC = ×3.</li>
          <li>“bench” = owned but not counting. Empty = not owned.</li>
          <li>Match: Done, In play (minute), or the match still to come (H = home, A = away).</li>
          <li>Ordered by live points.</li>
        </ul>
      }
      description={`${matrix.length} players`}
      flush
    >
      {matrix.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No players to show.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10">Player</th>
                  <th>Match</th>
                  <th className="num">Pts</th>
                  {columns.map((p) => (
                    <th key={p.entryId} className="num" title={`${p.playerName} · ${p.entryName}`}>
                      <span className="inline-block max-w-[6rem] truncate align-bottom">
                        {p.playerName}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.playerId}>
                    {/* Pinned so names stay visible while swiping across managers on a phone. */}
                    <td className="sticky left-0 z-10 max-w-[9rem] truncate bg-inherit sm:max-w-none">
                      <PlayerName playerId={row.playerId} lookups={lookups} />
                    </td>
                    <td>
                      <PlayerMatchStatus
                        playerId={row.playerId}
                        lookups={lookups}
                        timeZone={view.people.timeZone}
                      />
                    </td>
                    <td className="num font-semibold">{row.points}</td>
                    {columns.map((p) => (
                      <Cell key={p.entryId} cell={row.cells[p.entryId]} />
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky left-0 z-10">Total</td>
                  <td />
                  <td />
                  {columns.map((p) => (
                    <td key={p.entryId} className="num" title="Live GW points (before hits)">
                      {teamPoints.get(p.entryId) ?? 0}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination
            page={current}
            pageCount={pageCount}
            onChange={setPage}
            label="Player pages"
          />
        </>
      )}
    </Card>
  );
}
