'use client';

import { ChevronRight, Clock, Users } from 'lucide-react';

interface ConsultationTypeOption {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  color: string;
  description: string | null;
  is_group?: boolean;
  price_per_participant?: boolean;
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
            className="w-full text-left rounded-xl border border-teal/15 bg-white/70 p-4 hover:border-sage/40 hover:bg-white/90 hover:shadow-sm transition-all group relative"
          >
            {type.is_group && (
              <span className="absolute top-3 right-12 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                <Users className="h-3 w-3" />
                Atelier
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="font-medium text-charcoal flex items-center gap-1.5">
                    {type.name}
                    {type.is_group && <Users className="h-3.5 w-3.5 text-blue-600" />}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-stone">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {type.duration_minutes} min
                  </span>
                  {type.price_cents != null && (
                    <span>
                      {formatPrice(type.price_cents)}
                      {type.is_group && type.price_per_participant !== false && (
                        <span className="text-xs text-stone/70"> / pers.</span>
                      )}
                    </span>
                  )}
                </div>
                {type.description && (
                  <p className="mt-2 text-xs text-stone leading-relaxed">
                    {type.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-stone group-hover:text-sage transition-colors flex-shrink-0 mt-1" />
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
