import { useMemo } from 'react';
import type { FdrCell, FdrRow, LeagueTableRow, Team } from '@/domain/fdr';
import { Card, cn } from '@/components/ui';
import { fdrCellClass, heatScale } from '../utils/colors';

interface Props {
  rows: readonly FdrRow[];
  gameweekIds: readonly number[];
  teamsById: ReadonlyMap<number, Team>;
  leagueTable: readonly LeagueTableRow[];
  lastSeasonLabel: string;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function FixtureCell({ cell, teamsById }: { cell: FdrCell; teamsById: ReadonlyMap<number, Team> }) {
  const isBlank = cell.fixtures.length === 0;
  const title = isBlank
    ? `GW${cell.gameweek}: blank (counts as ${cell.value})`
    : cell.fixtures
        .map((f) => {
          const opp = teamsById.get(f.opponentId);
          return `${opp?.name ?? '?'} (${f.isHome ? 'home' : 'away'}) — difficulty ${f.difficulty}`;
        })
        .join('\n') + (cell.fixtures.length > 1 ? `\nDouble GW: counts as ${cell.value}` : '');

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
        </div>
      )}
    </td>
  );
}

export function FdrTable({ rows, gameweekIds, teamsById, leagueTable, lastSeasonLabel }: Props) {
  const heat = useMemo(() => heatScale(rows.map((r) => r.score)), [rows]);
  const tableByTeam = useMemo(() => new Map(leagueTable.map((r) => [r.team.id, r])), [leagueTable]);

  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="num w-12" title="Rank by AVG (ties share a rank)">
                Rank
              </th>
              <th className="sticky left-0 z-10">Team</th>
              <th className="num" title={`Final position in ${lastSeasonLabel}`}>
                Last season
              </th>
              <th className="num" title="Current position, from finished matches">
                This season
              </th>
              {gameweekIds.map((gw) => (
                <th key={gw} className="text-center">
                  GW{gw}
                </th>
              ))}
              <th className="num">AVG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
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
