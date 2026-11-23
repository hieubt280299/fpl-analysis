import { useMemo, useState } from 'react';
import type { Gameweek, GameweekCell, MonthStandings } from '@/domain/league';
import { sum } from '@/domain/shared/math';
import { Badge, Card, cn, SortHeader } from '@/components/ui';
import { chipLabel } from '@/utils/format';
import {
  DEFAULT_POINTS_SORT,
  nextPointsSort,
  sortPointsRows,
  type PointsSort,
  type PointsSortKey,
} from '../utils/order';

function placeClass(position: number | null): string | undefined {
  if (position === 1) return 'bg-emerald-300/70 font-semibold';
  if (position === 2) return 'bg-emerald-100';
  return undefined;
}

function positionLabel(position: number | null, tieSize: number): string {
  if (position === null) return '–';
  return tieSize > 1 ? `=${position}` : String(position);
}

function cellTitle(cell: GameweekCell): string | undefined {
  if (cell.points === null) return undefined;
  const parts = [`GW rank ${positionLabel(cell.position, cell.tieSize)}`];
  if (!cell.score) return [...parts, 'No FPL score'].join(' · ');
  if (cell.waivedCost > 0) {
    parts.push(`Hit −${cell.score.transferCost}, ${cell.waivedCost} free → −${cell.transferCost}`);
  } else if (cell.transferCost) {
    parts.push(`Hit −${cell.transferCost}`);
  }
  parts.push(`Bench ${cell.score.benchPoints}`);
  if (cell.score.chip) parts.push(chipLabel(cell.score.chip).long);
  return parts.join(' · ');
}

/** A footer row with an FPL-wide number per gameweek (e.g. the average score). */
function ReferenceRow({
  label,
  columns,
  value,
  monthTotal = false,
}: {
  label: string;
  columns: MonthStandings['columns'];
  value: (gameweek: Gameweek) => number | null | undefined;
  /** Show the sum over the month's gameweeks in the Month column. */
  monthTotal?: boolean;
}) {
  const values = columns.map(({ gameweek }) => value(gameweek) ?? null);
  const known = values.filter((v): v is number => v !== null);
  return (
    <tr>
      <td />
      <td className="sticky left-0 z-10 !font-medium text-slate-600">{label}</td>
      {values.map((v, i) => (
        <td key={columns[i]?.gameweek.id} className="num !font-normal">
          {v ?? <span className="text-slate-300">–</span>}
        </td>
      ))}
      <td className="num !font-normal">
        {monthTotal && known.length > 0 ? sum(known) : <span className="text-slate-300">–</span>}
      </td>
    </tr>
  );
}

/** "−4", or "~~−16~~ −8" when part of the hit was free (penalty-free points). */
function HitNote({ charged, waived }: { charged: number; waived: number }) {
  if (charged <= 0 && waived <= 0) return null;
  return (
    <div className="text-[11px] leading-none">
      {waived > 0 && (
        <span className="mr-1 text-slate-400 line-through" title="Penalty-free points">
          −{charged + waived}
        </span>
      )}
      <span className={charged > 0 ? 'text-red-600' : 'text-emerald-700'}>
        {charged > 0 ? `−${charged}` : 'free'}
      </span>
    </div>
  );
}

/**
 * Tie-breaker stats under a score, shown only when asked for: ties are rare, so points stay the
 * focus. GW cells already show the chip as a badge, so they only need the bench.
 */
function TieBreakerNote({ bench, chips }: { bench: number; chips?: number }) {
  return (
    <div className="whitespace-nowrap text-[11px] font-normal leading-tight text-slate-400">
      bench {bench}
      {chips !== undefined && ` · ${chips} chip${chips === 1 ? '' : 's'}`}
    </div>
  );
}

/** GW cell: gross points (what the GW is ranked on), with the hit shown underneath. */
function ScoreCell({
  cell,
  showTieBreakers,
}: {
  cell: GameweekCell | undefined;
  showTieBreakers: boolean;
}) {
  if (!cell || cell.points === null) {
    return <td className="num text-slate-300">–</td>;
  }
  return (
    <td className={cn('num', placeClass(cell.position))} title={cellTitle(cell)}>
      <div className="flex items-center justify-end gap-1.5">
        {cell.score?.chip && (
          <Badge tone="info" title={chipLabel(cell.score.chip).long}>
            {chipLabel(cell.score.chip).short}
          </Badge>
        )}
        <span>{cell.points}</span>
      </div>
      <HitNote charged={cell.transferCost} waived={cell.waivedCost} />
      {showTieBreakers && <TieBreakerNote bench={cell.score?.benchPoints ?? 0} />}
    </td>
  );
}

export function PointsTable({
  standings,
  penaltyFree,
}: {
  standings: MonthStandings;
  penaltyFree: Readonly<Record<number, number>>;
}) {
  const { columns, rows, monthState, penaltyFreeGameweek } = standings;
  const [sort, setSort] = useState<PointsSort>(DEFAULT_POINTS_SORT);
  const [showTieBreakers, setShowTieBreakers] = useState(false);
  const sortedRows = useMemo(() => sortPointsRows(rows, sort), [rows, sort]);
  const onSort = (key: PointsSortKey) => setSort(nextPointsSort(sort, key));
  // The arrow shows "highest first" as ▼.
  const header = {
    activeKey: sort.key,
    direction: sort.direction === 'desc' ? 'desc' : 'asc',
    onSort,
  } as const;

  const allowances = rows
    .filter((r) => (penaltyFree[r.participant.entryId] ?? 0) > 0)
    .map((r) => `${r.participant.playerName} ${penaltyFree[r.participant.entryId]}`);

  return (
    <Card
      title="Points"
      info={
        <ul className="list-disc space-y-0.5 pl-4">
          <li>GW: FPL points before hits. The hit (−4) is shown under the score.</li>
          <li>Month: total points after hits.</li>
          <li>Live GW: points include expected auto-subs and bonus, like the Current GW page.</li>
          <li>Green = 1st, light green = 2nd. “=” means a shared place.</li>
          <li>Same points? Fewer chips wins, then more bench points (Show chips & bench).</li>
        </ul>
      }
      description={
        allowances.length > 0 && penaltyFreeGameweek ? (
          <span className="text-emerald-700">
            Penalty-free points (GW{penaltyFreeGameweek}): {allowances.join(', ')}
          </span>
        ) : undefined
      }
      actions={
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-700 hover:underline"
          aria-pressed={showTieBreakers}
          onClick={() => setShowTieBreakers((v) => !v)}
        >
          {showTieBreakers ? 'Hide' : 'Show'} chips & bench
        </button>
      }
      flush
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 num">#</th>
              <th className="sticky left-0 z-10">Player</th>
              {columns.map(({ gameweek, state }) => (
                <SortHeader
                  key={gameweek.id}
                  {...header}
                  sortKey={gameweek.id}
                  disabled={state === 'pending'}
                >
                  GW{gameweek.id}
                  {state === 'provisional' && (
                    <span className="h-2 w-2 rounded-full bg-amber-300" title="Not final yet" />
                  )}
                </SortHeader>
              ))}
              <SortHeader {...header} sortKey="month" disabled={monthState === 'pending'}>
                Month
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.participant.entryId}>
                <td className="num text-slate-500">
                  {positionLabel(row.month.position, row.month.tieSize)}
                </td>
                {/* Pinned so names stay visible while swiping across GW columns on a phone. */}
                <td className="sticky left-0 z-10 bg-inherit">
                  <a
                    href={`https://fantasy.premierleague.com/entry/${row.participant.entryId}/history`}
                    target="_blank"
                    rel="noreferrer"
                    className="block max-w-[8rem] truncate font-medium text-slate-900 hover:text-brand-700 hover:underline sm:max-w-none"
                  >
                    {row.participant.playerName}
                  </a>
                  <div className="hidden text-xs text-slate-500 sm:block">
                    {row.participant.entryName}
                  </div>
                </td>
                {columns.map(({ gameweek }) => (
                  <ScoreCell
                    key={gameweek.id}
                    cell={row.gameweeks[gameweek.id]}
                    showTieBreakers={showTieBreakers}
                  />
                ))}
                <td
                  className={cn('num text-base', placeClass(row.month.position))}
                  title="Month total after hits"
                >
                  {monthState === 'pending' ? (
                    <span className="text-slate-300">–</span>
                  ) : (
                    <>
                      {row.month.points}
                      {showTieBreakers && (
                        <TieBreakerNote bench={row.month.benchPoints} chips={row.month.chipsUsed} />
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-xs font-normal text-slate-500">
            <ReferenceRow
              label="FPL average"
              columns={columns}
              value={(gw) => gw.averageScore}
              monthTotal
            />
            <ReferenceRow label="FPL highest" columns={columns} value={(gw) => gw.highestScore} />
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
