'use client';

import { useDaily, useWaitingParticipants } from '@daily-co/daily-react';
import type { DailyWaitingParticipant } from '@daily-co/daily-js';
import { UserPlus } from 'lucide-react';

/**
 * Hôte : demandes d'entrée des personnes en salle d'attente (salle privée avec « knocking »,
 * événement Daily « waiting-participant-added »).
 */
export function WaitingParticipants() {
  const daily = useDaily();
  const { waitingParticipants } = useWaitingParticipants();
  const waiting = waitingParticipants as DailyWaitingParticipant[];

  if (waiting.length === 0) return null;

  function answer(id: string, grant: boolean) {
    void daily?.updateWaitingParticipant(id, { grantRequestedAccess: grant });
  }

  return (
    <div className="fixed left-1/2 top-4 z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {waiting.map((p) => (
        <div key={p.id} role="alert" className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-4 shadow-lg">
          <span className="flex items-center gap-2.5 text-sm text-charcoal">
            <UserPlus className="h-4 w-4 flex-none text-sage" aria-hidden="true" />
            {p.name || 'Un participant'} attend dans la salle d’attente
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => answer(p.id, false)}
              className="flex h-10 items-center justify-center rounded-[10px] border border-divider text-[13px] text-charcoal hover:border-sage"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => answer(p.id, true)}
              className="flex h-10 items-center justify-center rounded-[10px] bg-sage text-[13px] font-semibold text-ink hover:bg-sage-deep"
            >
              Faire entrer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
