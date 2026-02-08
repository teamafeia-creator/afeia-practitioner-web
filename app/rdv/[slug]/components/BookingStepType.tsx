'use client';

import { ChevronRight, Clock } from 'lucide-react';

interface ConsultationTypeOption {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  color: string;
  description: string | null;
}

export function BookingStepType({
  types,
  onSelect,
}: {
  types: ConsultationTypeOption[];
  onSelect: (typeId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-charcoal">
        Choisissez votre type de seance
      </h2>

      <div className="space-y-3">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className="w-full text-left rounded-xl border border-teal/15 bg-white/70 p-4 hover:border-teal/40 hover:bg-white/90 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="font-medium text-charcoal">{type.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-warmgray">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {type.duration_minutes} min
                  </span>
                  {type.price_cents != null && (
                    <span>{formatPrice(type.price_cents)}</span>
                  )}
                </div>
                {type.description && (
                  <p className="mt-2 text-xs text-warmgray leading-relaxed">
                    {type.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-warmgray group-hover:text-teal transition-colors flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatPrice(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros);
}
