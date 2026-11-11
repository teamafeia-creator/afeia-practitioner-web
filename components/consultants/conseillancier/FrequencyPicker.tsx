'use client';

import { cn } from '../../../lib/cn';
import { TRACK_UNITS, type TrackFrequency, type TrackUnit } from '../../../lib/observance-tracking';

function Chip({ on, onClick, children, round }: { on: boolean; onClick: () => void; children: React.ReactNode; round?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-7 rounded-full border text-xs transition-colors',
        round ? 'w-7 font-semibold' : 'px-3',
        on ? 'border-sage bg-sage text-ink' : 'border-divider text-charcoal/80 hover:border-sage/40'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Choix de la fréquence d'un item de la checklist :
 * « Tous les jours », ou un nombre de fois (1 à 7, ou libre) par jour, semaine, mois ou an.
 */
export function FrequencyPicker({ value, onChange }: { value: TrackFrequency; onChange: (next: TrackFrequency) => void }) {
  const custom = value.mode === 'custom';
  const count = value.mode === 'custom' ? value.count : 1;
  const unit: TrackUnit = value.mode === 'custom' ? value.unit : 'week';

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-divider bg-surface-raised p-3">
      <div role="radiogroup" aria-label="Type de fréquence" className="flex flex-wrap gap-1.5">
        <Chip on={!custom} onClick={() => onChange({ mode: 'daily' })}>
          Tous les jours
        </Chip>
        <Chip on={custom} onClick={() => onChange({ mode: 'custom', count, unit })}>
          Personnalisée
        </Chip>
      </div>
      {custom ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 text-xs text-stone">Nombre de fois</span>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} round on={count === n} onClick={() => onChange({ mode: 'custom', count: n, unit })}>
                {n}
              </Chip>
            ))}
            <input
              type="number"
              min={1}
              aria-label="Autre nombre de fois"
              placeholder="Autre"
              value={count > 7 ? count : ''}
              onChange={(event) => {
                const n = parseInt(event.target.value, 10);
                if (n > 0) onChange({ mode: 'custom', count: n, unit });
              }}
              className={cn(
                'h-7 w-[72px] rounded-full border bg-ink px-2.5 text-xs text-charcoal placeholder:text-mist',
                count > 7 ? 'border-sage' : 'border-divider'
              )}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 text-xs text-stone">Par</span>
            {TRACK_UNITS.map((u) => (
              <Chip key={u.value} on={unit === u.value} onClick={() => onChange({ mode: 'custom', count, unit: u.value })}>
                {u.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
