import type { ReactNode } from 'react';
import { matchBonus, type Match, type MatchStatEntry, type MatchStatId } from '@/domain/gameweek';
import type { Lookups } from '../hooks/useGameweekView';
import { playerLabel } from '../utils/labels';

function both(match: Match, id: MatchStatId): MatchStatEntry[] {
  const stat = match.stats[id];
  return stat ? [...stat.home, ...stat.away] : [];
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-slate-700">{title}</h4>
      <ul className="space-y-0.5 text-sm text-slate-600">{children}</ul>
    </div>
  );
}

function StatLine({
  entry,
  lookups,
  suffix,
}: {
  entry: MatchStatEntry;
  lookups: Lookups;
  suffix?: string;
}) {
  return (
    <li>
      {playerLabel(entry.playerId, lookups)} ({entry.value}){suffix}
    </li>
  );
}

function CardMark({ red }: { red: boolean }) {
  return (
    <span
      className={`mr-1.5 inline-block h-3 w-2 rounded-[1px] align-[-1px] ${red ? 'bg-red-600' : 'bg-yellow-400'}`}
      aria-label={red ? 'Red card' : 'Yellow card'}
    />
  );
}

/** Goals, assists, bonus and cards of a started match (as on fplgameweek.com). */
export function MatchDetails({ match, lookups }: { match: Match; lookups: Lookups }) {
  const goals = both(match, 'goals_scored');
  const ownGoals = both(match, 'own_goals');
  const assists = both(match, 'assists');
  const { bonus, projected } = matchBonus(match);
  const yellows = both(match, 'yellow_cards');
  const reds = both(match, 'red_cards');
  const penaltySaves = both(match, 'penalties_saved');
  const penaltyMisses = both(match, 'penalties_missed');
  const none = <li className="text-slate-400">None</li>;

  return (
    <div className="grid gap-x-6 gap-y-3 bg-slate-50 px-3 py-3 sm:grid-cols-2 sm:px-4">
      <Section title="Goals">
        {goals.length + ownGoals.length === 0 && none}
        {goals.map((g) => (
          <StatLine key={`g${g.playerId}`} entry={g} lookups={lookups} />
        ))}
        {ownGoals.map((g) => (
          <StatLine key={`og${g.playerId}`} entry={g} lookups={lookups} suffix=" own goal" />
        ))}
      </Section>
      <Section title="Assists">
        {assists.length === 0 && none}
        {assists.map((a) => (
          <StatLine key={a.playerId} entry={a} lookups={lookups} />
        ))}
      </Section>
      <Section
        title={
          <>
            Bonus points
            {projected && <span className="ml-1 font-normal text-slate-400">(from BPS)</span>}
          </>
        }
      >
        {bonus.length === 0 && none}
        {bonus.map((b) => (
          <StatLine key={b.playerId} entry={b} lookups={lookups} />
        ))}
      </Section>
      <Section title="Cards">
        {yellows.length + reds.length === 0 && none}
        {reds.map((c) => (
          <li key={`r${c.playerId}`}>
            <CardMark red />
            {playerLabel(c.playerId, lookups)}
          </li>
        ))}
        {yellows.map((c) => (
          <li key={`y${c.playerId}`}>
            <CardMark red={false} />
            {playerLabel(c.playerId, lookups)}
          </li>
        ))}
      </Section>
      {penaltySaves.length + penaltyMisses.length > 0 && (
        <Section title="Penalties">
          {penaltySaves.map((p) => (
            <StatLine key={`s${p.playerId}`} entry={p} lookups={lookups} suffix=" saved" />
          ))}
          {penaltyMisses.map((p) => (
            <StatLine key={`m${p.playerId}`} entry={p} lookups={lookups} suffix=" missed" />
          ))}
        </Section>
      )}
    </div>
  );
}
