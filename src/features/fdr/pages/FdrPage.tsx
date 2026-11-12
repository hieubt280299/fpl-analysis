import { useState } from 'react';
import { FDR_BLANK_GAMEWEEK_VALUE } from '@/config/fdr';
import { useAuth } from '@/features/auth';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StaleDataNotice,
} from '@/components/ui';
import { formatDateTime, formatPercent } from '@/utils/format';
import { FdrSettingsPanel } from '../components/FdrSettingsPanel';
import { FdrTable } from '../components/FdrTable';
import { useFdrTable } from '../hooks/useFdrTable';

export function FdrPage() {
  const fdr = useFdrTable();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  const first = fdr.gameweekIds[0];
  const last = fdr.gameweekIds[fdr.gameweekIds.length - 1];
  const { gameweekWeights, positionWeights } = fdr.formula;
  const expectedLastSeason = fdr.seasons?.previous ?? null;
  const lastSeasonOutdated =
    expectedLastSeason !== null && fdr.settings.lastSeasonLabel !== expectedLastSeason;

  return (
    <>
      <PageHeader
        title="Fixture difficulty"
        info={
          <div className="space-y-1">
            <p>Lower AVG = easier next 5 GWs. Click a column to sort.</p>
            <p className="font-mono text-xs">
              AVG = (FDR × GW weight, summed) × (0.8 + 0.01 × last season pos ×{' '}
              {positionWeights.lastSeason} + 0.01 × this season pos × {positionWeights.thisSeason}),
              1 decimal
            </p>
            <p>Double GW: 1 ÷ (1/FDR1 + 1/FDR2). Blank GW: {FDR_BLANK_GAMEWEEK_VALUE}.</p>
          </div>
        }
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
      ) : fdr.seasonOver ? (
        <EmptyState title="No more gameweeks">
          The season is over. The table comes back with next season’s fixtures.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {isAdmin && !editing && lastSeasonOutdated && (
            <Alert
              tone="warning"
              action={
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Update
                </Button>
              }
            >
              New season: please enter the {expectedLastSeason} final table.
            </Alert>
          )}

          {isAdmin && editing && (
            <FdrSettingsPanel
              settings={fdr.settings}
              teams={fdr.teams}
              gameweekIds={fdr.gameweekIds}
              positionWeights={positionWeights}
              expectedLastSeason={expectedLastSeason}
              onDone={() => setEditing(false)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              {first === last ? `GW${first}` : `GW${first}–${last}`}
            </p>
            <p className="text-sm text-slate-500">
              GW weights <strong>{gameweekWeights.join(' · ')}</strong> · last season{' '}
              <strong>{formatPercent(positionWeights.lastSeason)}</strong> · this season{' '}
              <strong>{formatPercent(positionWeights.thisSeason)}</strong>
            </p>
          </div>

          <StaleDataNotice
            error={fdr.refreshError}
            updatedAt={fdr.dataUpdatedAt}
            onRetry={fdr.refetch}
            retrying={fdr.isFetching}
          />

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
              <p>
                Updated{' '}
                <strong className="text-slate-700">
                  {fdr.dataUpdatedAt ? formatDateTime(fdr.dataUpdatedAt.toISOString()) : '–'}
                </strong>
              </p>
              <p>
                This season’s table:{' '}
                {fdr.positionSource === 'official' ? 'from FPL' : 'worked out from results'}
              </p>
              {fdr.settings.updatedAt && (
                <p>
                  Settings changed {formatDateTime(fdr.settings.updatedAt.toISOString())}
                  {isAdmin && fdr.settings.updatedBy ? ` by ${fdr.settings.updatedBy}` : ''}
                </p>
              )}
            </div>
          </div>
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
    { label: `No match (${FDR_BLANK_GAMEWEEK_VALUE})`, className: 'bg-fdr-blank' },
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
