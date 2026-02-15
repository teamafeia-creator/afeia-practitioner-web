'use client';

import type { CyclePhase } from '../../lib/types';
import { CYCLE_PHASES } from '../../lib/cycle-constants';

export function CyclePhaseBadge({
  phase,
  cycleDay,
  compact = false,
}: {
  phase: CyclePhase;
  cycleDay: number;
  compact?: boolean;
}) {
  const meta = CYCLE_PHASES[phase];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.bgClass} ${meta.textClass}`}
        title={meta.description}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
        J{cycleDay}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bgClass} ${meta.textClass}`}
      title={meta.description}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
      J{cycleDay} &mdash; {meta.label}
    </span>
  );
}
