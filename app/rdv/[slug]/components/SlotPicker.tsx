'use client';

const DAY_NAMES_FULL = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];
const MONTH_NAMES_FULL = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

export function SlotPicker({
  slots,
  selectedSlot,
  onSelect,
  date,
  loading,
}: {
  slots: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
  date: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-4 text-center text-sm text-stone">
        Chargement des creneaux...
      </div>
    );
  }

  const dateObj = new Date(date + 'T12:00:00');
  const dayName = DAY_NAMES_FULL[dateObj.getDay()];
  const day = dateObj.getDate();
  const monthName = MONTH_NAMES_FULL[dateObj.getMonth()];

  if (slots.length === 0) {
    return (
      <div className="mt-4 rounded-lg bg-stone/5 p-4 text-center text-sm text-stone">
        Aucun creneau disponible le {dayName} {day} {monthName}.
        <br />
        Essayez un autre jour.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-charcoal">
        Creneaux disponibles le {dayName} {day} {monthName} :
      </p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                selectedSlot === slot
                  ? 'bg-sage text-white shadow-sm'
                  : 'bg-white/80 border border-sage/20 text-charcoal hover:border-sage/40 hover:bg-sage-light/50'
              }
            `}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}
