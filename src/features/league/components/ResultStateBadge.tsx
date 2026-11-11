import type { Gameweek, ResultState } from '@/domain/league';
import { Badge } from '@/components/ui';

export function ResultStateBadge({ state, gameweek }: { state: ResultState; gameweek?: Gameweek }) {
  if (state === 'final') return <Badge tone="success">Final</Badge>;
  if (state === 'pending') return <Badge>Upcoming</Badge>;
  if (gameweek?.status === 'live') {
    return (
      <Badge tone="warning" title="Scores update as matches are played">
        Live
      </Badge>
    );
  }
  return (
    <Badge tone="warning" title="Waiting for FPL to confirm final points">
      Provisional
    </Badge>
  );
}
