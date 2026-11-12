import { useMemo, useState } from 'react';
import type { FdrCell, FdrRow, LeagueTableRow, PositionSource, Team } from '@/domain/fdr';
import { Card, cn, SortHeader } from '@/components/ui';
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

function FixtureCell({ cell, teamsById }: { cell: FdrCell; teamsById: ReadonlyMap<number, Team> }) {
  const isBlank = cell.fixtures.length === 0;
  const lines = cell.fixtures.map((f) => {
    const opp = teamsById.get(f.opponentId);
    return `${opp?.name ?? '?'} (${f.isHome ? 'home' : 'away'}): ${f.difficulty}`;
  });
  if (cell.fixtures.length > 1) {
    const parts = cell.fixtures.map((f) => `1/${f.difficulty}`).join(' + ');
    lines.push(`Double GW: 1 ÷ (${parts}) = ${cell.value.toFixed(1)}`);
  }
  const title = isBlank
    ? `No match in GW${cell.gameweek} (counts as ${cell.value})`
    : lines.join('\n');

  return (
    <td className={cn('!px-1.5 text-center', fdrCellClass(cell.value, isBlank))} title={title}>
      {isBlank ? (
        <span className="text-xs font-semibold">NO MATCH</span>
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
              DGW = {cell.value.toFixed(1)}
            </div>
          )}
        </div>
      )}
    </td>
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
  // A gameweek column that is no longer in the window falls back to the default order.
  const sort =
    typeof requestedSort.key === 'number' && !gameweekIds.includes(requestedSort.key)
      ? DEFAULT_FDR_SORT
      : requestedSort;
  const onSort = (key: FdrSortKey) => setSort(nextSort(sort, key));

  const sortedRows = useMemo(() => sortFdrRows(rows, sort), [rows, sort]);
  const heat = useMemo(() => heatScale(rows.map((r) => r.score)), [rows]);
  const tableByTeam = useMemo(() => new Map(leagueTable.map((r) => [r.team.id, r])), [leagueTable]);
  const header = { activeKey: sort.key, direction: sort.direction, onSort };

  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader {...header} sortKey="avg" title="Rank by AVG">
                Rank
              </SortHeader>
              <SortHeader {...header} sortKey="team" align="left" className="sticky left-0 z-10">
                Team
              </SortHeader>
              <SortHeader
                {...header}
                sortKey="lastSeason"
                title={`Final position ${lastSeasonLabel}`}
              >
                Last season
              </SortHeader>
              <SortHeader
                {...header}
                sortKey="thisSeason"
                title={
                  positionSource === 'official'
                    ? 'Position now (from FPL)'
                    : 'Position now (worked out from results)'
                }
              >
                This season
              </SortHeader>
              {gameweekIds.map((gw) => (
                <SortHeader key={gw} {...header} sortKey={gw} align="center">
                  GW{gw}
                </SortHeader>
              ))}
              <SortHeader {...header} sortKey="avg">
                AVG
              </SortHeader>
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
                    title={`Exact: ${row.rawScore.toFixed(3)}`}
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
