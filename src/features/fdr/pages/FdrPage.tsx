import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FDR_GAMEWEEK_WEIGHTS, FDR_WINDOW_SIZE } from '@/config/fdr';
import { useAuth } from '@/features/auth';
import { Button, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { formatPercent } from '@/utils/format';
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

  return (
    <>
      <PageHeader
        title="Fixture difficulty"
        description={`Teams ranked by weighted difficulty of their next ${FDR_WINDOW_SIZE} gameweeks, adjusted for team strength. Lower AVG = easier run.`}
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
              Weights: last season ({fdr.settings.lastSeasonLabel}){' '}
              <strong>{formatPercent(fdr.weights.lastSeason)}</strong> · this season{' '}
              <strong>{formatPercent(fdr.weights.thisSeason)}</strong>
            </p>
          </div>

          <FdrTable
            rows={fdr.rows}
            gameweekIds={fdr.gameweekIds}
            teamsById={fdr.teamsById}
            leagueTable={fdr.leagueTable}
            lastSeasonLabel={fdr.settings.lastSeasonLabel}
          />

          <FdrLegend />

          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <summary className="cursor-pointer font-medium text-slate-800">
              How AVG is calculated
            </summary>
            <div className="mt-3 space-y-2">
              <p>
                For GW{first}–{last}, each fixture’s official FPL difficulty is weighted (nearest
                first): {FDR_GAMEWEEK_WEIGHTS.join(', ')}. The sum is multiplied by a team-strength
                factor and rounded to one decimal:
              </p>
              <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs">
                {`AVG = ROUND( (${FDR_GAMEWEEK_WEIGHTS.map((w, i) => `FDR${i + 1}×${w.toFixed(1)}`).join(' + ')})
        × (0.8 + 0.01×LastSeasonPos×${fdr.weights.lastSeason} + 0.01×ThisSeasonPos×${fdr.weights.thisSeason}), 1 )`}
              </pre>
              <p>
                “This season” is the live league table built from finished matches. A double
                gameweek uses the average difficulty of its fixtures; a blank gameweek counts as 5.
              </p>
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
    { label: 'Blank GW', className: 'bg-fdr-blank' },
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
