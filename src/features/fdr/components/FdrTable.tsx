import { useMemo, useState, type ReactNode } from 'react';
import type { FdrCell, FdrRow, LeagueTableRow, PositionSource, Team } from '@/domain/fdr';
import { Card, cn } from '@/components/ui';
import { fdrCellClass, heatScale } from '../utils/colors';
import {
  DEFAULT_FDR_SORT,
  nextSort,
  sortFdrRows,
  type FdrSort,
  type FdrSortKey,
} from '../utils/sort';

interface Props {
  rows: readonly FdrRow[];
  gameweekIds: readonly number[];
  teamsById: ReadonlyMap<number, Team>;
  leagueTable: readonly LeagueTableRow[];
  lastSeasonLabel: string;
  positionSource: PositionSource;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function round2(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function FixtureCell({ cell, teamsById }: { cell: FdrCell; teamsById: ReadonlyMap<number, Team> }) {
  const isBlank = cell.fixtures.length === 0;
  const lines = cell.fixtures.map((f) => {
    const opp = teamsById.get(f.opponentId);
    return `${opp?.name ?? '?'} (${f.isHome ? 'home' : 'away'}) — difficulty ${f.difficulty}`;
  });
  if (cell.fixtures.length > 1) {
    const parts = cell.fixtures.map((f) => `1/${f.difficulty}`).join(' + ');
    lines.push(`Double GW: 1 / (${parts}) = ${round2(cell.value)}`);
  }
  const title = isBlank ? `GW${cell.gameweek}: blank — counts as ${cell.value}` : lines.join('\n');

  return (
    <td className={cn('!px-1.5 text-center', fdrCellClass(cell.value, isBlank))} title={title}>
      {isBlank ? (
        <span className="text-xs font-semibold">BLANK</span>
      ) : (
        <div className="space-y-0.5">
          {cell.fixtures.map((f) => (
            <div key={f.fixtureId} className="leading-tight">
              <span className="text-base font-semibold">{f.difficulty}</span>
              <span className="ml-1 text-[11px] font-medium opacity-75">
                {teamsById.get(f.opponentId)?.shortName ?? '?'}
                {f.isHome ? ' (H)' : ' (A)'}
              </span>
            </div>
          ))}
          {cell.fixtures.length > 1 && (
            <div className="text-[10px] font-semibold uppercase opacity-75">
              DGW = {round2(cell.value)}
            </div>
          )}
        </div>
      )}
    </td>
  );
}

function SortableHeader({
  sortKey,
  sort,
  onSort,
  align = 'right',
  title,
  className,
  children,
}: {
  sortKey: FdrSortKey;
  sort: FdrSort;
  onSort: (key: FdrSortKey) => void;
  align?: 'left' | 'right' | 'center';
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th aria-sort={ariaSort} className={cn('!p-0', className)} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex w-full items-center gap-1 px-3 py-2 uppercase hover:bg-white/10 focus-visible:ring-inset',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
        )}
      >
        {children}
        <span aria-hidden="true" className={cn('text-[10px]', !active && 'opacity-40')}>
          {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

export function FdrTable({
  rows,
  gameweekIds,
  teamsById,
  leagueTable,
  lastSeasonLabel,
  positionSource,
}: Props) {
  const [requestedSort, setSort] = useState<FdrSort>(DEFAULT_FDR_SORT);
  // A gameweek column that scrolled out of the window falls back to the default order.
  const sort =
    typeof requestedSort.key === 'number' && !gameweekIds.includes(requestedSort.key)
      ? DEFAULT_FDR_SORT
      : requestedSort;
  const onSort = (key: FdrSortKey) => setSort(nextSort(sort, key));

  const sortedRows = useMemo(() => sortFdrRows(rows, sort), [rows, sort]);
  const heat = useMemo(() => heatScale(rows.map((r) => r.score)), [rows]);
  const tableByTeam = useMemo(() => new Map(leagueTable.map((r) => [r.team.id, r])), [leagueTable]);
  const header = { sort, onSort };

  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <SortableHeader {...header} sortKey="avg" title="Rank by AVG (ties share a rank)">
                Rank
              </SortableHeader>
              <SortableHeader
                {...header}
                sortKey="team"
                align="left"
                className="sticky left-0 z-10"
              >
                Team
              </SortableHeader>
              <SortableHeader
                {...header}
                sortKey="lastSeason"
                title={`Final position in ${lastSeasonLabel}`}
              >
                Last season
              </SortableHeader>
              <SortableHeader
                {...header}
                sortKey="thisSeason"
                title={
                  positionSource === 'official'
                    ? 'Current position — official table from FPL'
                    : 'Current position — calculated from finished matches'
                }
              >
                This season
              </SortableHeader>
              {gameweekIds.map((gw) => (
                <SortableHeader key={gw} {...header} sortKey={gw} align="center">
                  GW{gw}
                </SortableHeader>
              ))}
              <SortableHeader {...header} sortKey="avg">
                AVG
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const standing = tableByTeam.get(row.team.id);
              return (
                <tr key={row.team.id}>
                  <td className="num text-slate-500">{row.rank}</td>
                  <td className="sticky left-0 z-10 bg-inherit font-medium">{row.team.name}</td>
                  <td className="num">{row.lastSeasonPosition}</td>
                  <td
                    className="num"
                    title={
                      standing
                        ? `P${standing.played} W${standing.won} D${standing.drawn} L${standing.lost} · ` +
                          `GD ${signed(standing.goalDifference)} · ${standing.points} pts`
                        : undefined
                    }
                  >
                    {row.thisSeasonPosition}
                  </td>
                  {row.cells.map((cell) => (
                    <FixtureCell key={cell.gameweek} cell={cell} teamsById={teamsById} />
                  ))}
                  <td
                    className="num font-semibold"
                    style={{ backgroundColor: heat(row.score) }}
                    title={`Unrounded: ${row.rawScore.toFixed(3)}`}
                  >
                    {row.score.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
