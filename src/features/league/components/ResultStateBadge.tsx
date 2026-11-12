import type { Gameweek, GameweekProgress, ResultState } from '@/domain/league';
import { Badge } from '@/components/ui';

/** Labels for a provisional gameweek when FPL's event-status gives more detail. */
const PROGRESS_LABELS: Record<GameweekProgress, { label: string; title: string }> = {
  live: { label: 'Live', title: 'Matches are on now' },
  'in-progress': {
    label: 'In progress',
    title: 'More matches to play',
  },
  'awaiting-bonus': {
    label: 'Awaiting bonus',
    title: 'Matches done, bonus points not added yet',
  },
  'bonus-added': {
    label: 'Bonus added',
    title: 'Bonus added, waiting for final points',
  },
  'tables-updating': {
    label: 'FPL updating',
    title: 'FPL is updating, final points soon',
  },
};

export function ResultStateBadge({
  state,
  gameweek,
  progress,
}: {
  state: ResultState;
  gameweek?: Gameweek;
  /** Finer detail from FPL's event-status, when it refers to this gameweek. */
  progress?: GameweekProgress | null;
}) {
  if (state === 'final') return <Badge tone="success">Final</Badge>;
  if (state === 'pending') return <Badge>Upcoming</Badge>;
  if (progress) {
    const { label, title } = PROGRESS_LABELS[progress];
    return (
      <Badge tone="warning" title={title}>
        {label}
      </Badge>
    );
  }
  if (gameweek?.status === 'live') {
    return (
      <Badge tone="warning" title="Matches are on now">
        Live
      </Badge>
    );
  }
  return (
    <Badge tone="warning" title="Waiting for final points">
      Not final
    </Badge>
  );
}
