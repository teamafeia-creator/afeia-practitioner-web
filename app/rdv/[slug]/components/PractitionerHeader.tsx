'use client';

import { MapPin, Phone } from 'lucide-react';
import type { PractitionerPublicProfile } from '@/lib/queries/booking';

export function PractitionerHeader({
  practitioner,
}: {
  practitioner: PractitionerPublicProfile;
}) {
  return (
    <div className="text-center space-y-3 mb-8">
      {/* Avatar placeholder */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-deep text-white text-xl font-semibold">
        {getInitials(practitioner.full_name)}
      </div>

      <div>
        <h1 className="text-xl font-semibold text-charcoal tracking-tight">
          {practitioner.full_name}
        </h1>
      </div>

      {(practitioner.booking_address || practitioner.booking_phone) && (
        <div className="flex flex-col items-center gap-1 text-sm text-warmgray">
          {practitioner.booking_address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal flex-shrink-0" />
              <span>{practitioner.booking_address}</span>
            </div>
          )}
          {practitioner.booking_phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-teal flex-shrink-0" />
              <span>{practitioner.booking_phone}</span>
            </div>
          )}
        </div>
      )}

      {practitioner.booking_intro_text && (
        <p className="text-sm text-warmgray italic max-w-md mx-auto">
          {practitioner.booking_intro_text}
        </p>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
