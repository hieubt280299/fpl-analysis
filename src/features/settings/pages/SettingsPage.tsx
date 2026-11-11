import { useState, type FormEvent } from 'react';
import { COMMON_TIME_ZONES } from '@/config/league';
import { isValidTimeZone } from '@/domain/league';
import { RequireAdmin } from '@/features/auth';
import { fplApi } from '@/lib/fpl/client';
import { Alert, Button, Card, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { errorMessage } from '@/utils/errors';
import { useLeagueSettings, useSaveLeagueSettings } from '../hooks/useSettings';
import { isValidLeagueId, type LeagueSettings } from '../model';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="League-wide configuration. Admins only." />
      <RequireAdmin>
        <LeagueSettingsSection />
      </RequireAdmin>
    </>
  );
}

function LeagueSettingsSection() {
  const settings = useLeagueSettings();
  if (settings.isPending) return <LoadingState />;
  if (settings.isError)
    return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
  // Remount the form when the saved settings change so the inputs start from the saved values.
  return <LeagueSettingsForm key={JSON.stringify(settings.data)} saved={settings.data} />;
}

function LeagueSettingsForm({ saved }: { saved: LeagueSettings }) {
  const save = useSaveLeagueSettings();
  const [leagueId, setLeagueId] = useState(String(saved.leagueId));
  const [timeZone, setTimeZone] = useState(saved.timeZone);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedLeagueName, setSavedLeagueName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSavedLeagueName(null);

    const id = Number(leagueId.trim());
    if (!isValidLeagueId(id)) {
      setFormError('League ID must be a positive whole number (the number in the league URL).');
      return;
    }
    if (!isValidTimeZone(timeZone.trim())) {
      setFormError(`“${timeZone}” is not a valid IANA time zone (e.g. Asia/Ho_Chi_Minh).`);
      return;
    }

    setVerifying(true);
    let leagueName: string;
    try {
      leagueName = (await fplApi.leagueStandingsPage(id, 1)).league.name;
    } catch (error) {
      setFormError(`Could not verify league ${id}: ${errorMessage(error)}`);
      return;
    } finally {
      setVerifying(false);
    }

    save.mutate(
      { leagueId: id, timeZone: timeZone.trim() },
      { onSuccess: () => setSavedLeagueName(leagueName) },
    );
  };

  return (
    <Card
      title="Mini-league"
      description="Which FPL classic league to manage, and how gameweeks are grouped into months."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="grid max-w-xl gap-5">
        <div>
          <label htmlFor="leagueId" className="label">
            FPL classic league ID
          </label>
          <input
            id="leagueId"
            className="input"
            inputMode="numeric"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            From the league URL: fantasy.premierleague.com/leagues/<strong>758527</strong>
            /standings/c
          </p>
        </div>

        <div>
          <label htmlFor="timeZone" className="label">
            Time zone for month boundaries
          </label>
          <input
            id="timeZone"
            className="input"
            list="time-zones"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            required
          />
          <datalist id="time-zones">
            {COMMON_TIME_ZONES.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            A gameweek belongs to the month its deadline falls in, in this time zone.
          </p>
        </div>

        {formError && <Alert tone="error">{formError}</Alert>}
        {save.isError && <Alert tone="error">Save failed: {errorMessage(save.error)}</Alert>}
        {savedLeagueName && <Alert tone="success">Saved. Managing “{savedLeagueName}”.</Alert>}

        <div>
          <Button type="submit" loading={verifying || save.isPending}>
            Verify & save
          </Button>
        </div>
      </form>
    </Card>
  );
}
