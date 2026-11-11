import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FDR_BLANK_GAMEWEEK_VALUE, FDR_WINDOW_SIZE } from '@/config/fdr';
import { useAuth } from '@/features/auth';
import { Button, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { formatDateTime, formatPercent } from '@/utils/format';
import { FdrSettingsPanel } from '../components/FdrSettingsPanel';
import { FdrTable } from '../components/FdrTable';
import { useFdrTable } from '../hooks/useFdrTable';

export function FdrPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get('from'));
  const fdr = useFdrTable(Number.isInteger(requested) && requested > 0 ? requested : undefined);
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  const setStart = (gw: number) => {
    setSearchParams(gw === fdr.defaultStart ? {} : { from: String(gw) }, { replace: true });
  };

  const lastStart = Math.max(1, fdr.totalGameweeks - FDR_WINDOW_SIZE + 1);
  const first = fdr.gameweekIds[0];
  const last = fdr.gameweekIds[fdr.gameweekIds.length - 1];
  const { gameweekWeights, positionWeights } = fdr.formula;

  return (
    <>
      <PageHeader
        title="Fixture difficulty"
        description={`Teams ranked by weighted difficulty of their next ${FDR_WINDOW_SIZE} gameweeks, adjusted for team strength. Lower AVG = easier run. Click a column header to sort.`}
        actions={
          isAdmin &&
          !editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Formula settings
            </Button>
          )
        }
      />

      {fdr.isPending ? (
        <LoadingState label="Loading fixtures…" />
      ) : fdr.error ? (
        <ErrorState error={fdr.error} onRetry={fdr.refetch} />
      ) : (
        <div className="space-y-4">
          {isAdmin && editing && (
            <FdrSettingsPanel
              settings={fdr.settings}
              teams={fdr.teams}
              onDone={() => setEditing(false)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                aria-label="Earlier gameweeks"
                disabled={fdr.start <= 1}
                onClick={() => setStart(fdr.start - 1)}
              >
                ‹
              </Button>
              <label htmlFor="fdr-start" className="sr-only">
                First gameweek
              </label>
              <select
                id="fdr-start"
                className="input h-8 w-auto py-0 pr-8"
                value={fdr.start}
                onChange={(e) => setStart(Number(e.target.value))}
              >
                {Array.from({ length: lastStart }, (_, i) => i + 1).map((gw) => (
                  <option key={gw} value={gw}>
                    GW{gw}–{Math.min(gw + FDR_WINDOW_SIZE - 1, fdr.totalGameweeks)}
                    {gw === fdr.defaultStart ? ' (next)' : ''}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Later gameweeks"
                disabled={fdr.start >= lastStart}
                onClick={() => setStart(fdr.start + 1)}
              >
                ›
              </Button>
              {fdr.start !== fdr.defaultStart && (
                <Button variant="ghost" size="sm" onClick={() => setStart(fdr.defaultStart)}>
                  Next GW
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-500">
              GW weights <strong>{gameweekWeights.join(' · ')}</strong> · last season (
              {fdr.settings.lastSeasonLabel}){' '}
              <strong>{formatPercent(positionWeights.lastSeason)}</strong> · this season{' '}
              <strong>{formatPercent(positionWeights.thisSeason)}</strong>
            </p>
          </div>

          <FdrTable
            rows={fdr.rows}
            gameweekIds={fdr.gameweekIds}
            teamsById={fdr.teamsById}
            leagueTable={fdr.leagueTable}
            lastSeasonLabel={fdr.settings.lastSeasonLabel}
            positionSource={fdr.positionSource}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <FdrLegend />
            <div className="space-y-0.5 text-right text-xs text-slate-500">
              <p className="flex items-center justify-end gap-2">
                <span>
                  FPL data updated{' '}
                  <strong className="text-slate-700">
                    {fdr.dataUpdatedAt ? formatDateTime(fdr.dataUpdatedAt.toISOString()) : '–'}
                  </strong>
                </span>
                <Button size="sm" variant="ghost" loading={fdr.isFetching} onClick={fdr.refetch}>
                  Refresh
                </Button>
              </p>
              <p>
                This-season positions:{' '}
                {fdr.positionSource === 'official'
                  ? 'official table from FPL'
                  : 'calculated from results (FPL table unavailable)'}
              </p>
              {fdr.settings.updatedAt && (
                <p>
                  Formula settings changed {formatDateTime(fdr.settings.updatedAt.toISOString())}
                  {isAdmin && fdr.settings.updatedBy ? ` by ${fdr.settings.updatedBy}` : ''}
                </p>
              )}
            </div>
          </div>

          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <summary className="cursor-pointer font-medium text-slate-800">
              How AVG is calculated
            </summary>
            <div className="mt-3 space-y-2">
              <p>
                For GW{first}–{last}, each gameweek’s FDR (official FPL difficulty) is weighted,
                nearest first, by {gameweekWeights.join(', ')} (always summing to 10). The sum is
                multiplied by a team-strength factor and rounded to one decimal:
              </p>
              <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs">
                {`AVG = ROUND( (${gameweekWeights.map((w, i) => `FDR${i + 1}×${w}`).join(' + ')})
        × (0.8 + 0.01×LastSeasonPos×${positionWeights.lastSeason} + 0.01×ThisSeasonPos×${positionWeights.thisSeason}), 1 )`}
              </pre>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Double gameweek: FDR = 1 ÷ (1/M1 + 1/M2), where M1 and M2 are the two fixtures’
                  difficulties (e.g. 2 and 3 → 1.2).
                </li>
                <li>Blank gameweek: FDR = {FDR_BLANK_GAMEWEEK_VALUE}.</li>
                <li>
                  “This season” is the official current table published by FPL (falls back to a
                  table calculated from finished matches if FPL’s is unavailable).
                </li>
              </ul>
            </div>
          </details>
        </div>
      )}
    </>
  );
}

function FdrLegend() {
  const items = [
    { label: '1–2 Easy', className: 'bg-fdr-2' },
    { label: '3 Medium', className: 'bg-fdr-3' },
    { label: '4 Hard', className: 'bg-fdr-4' },
    { label: '5 Very hard', className: 'bg-fdr-5' },
    { label: `Blank GW (${FDR_BLANK_GAMEWEEK_VALUE})`, className: 'bg-fdr-blank' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${i.className}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
