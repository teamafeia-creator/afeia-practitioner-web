'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';
import { useCanJoin } from '@/hooks/useCanJoin';

/**
 * « Rejoindre la visio » (praticien, jeton d'hôte) : visible de 15 min avant le début
 * jusqu'à la fin de la séance, pour une séance qui a une salle Daily.
 */
export function JoinVisioButton({
  appointmentId,
  startsAt,
  endsAt,
  label = 'Rejoindre',
  className = '',
}: {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
  label?: string;
  className?: string;
}) {
  const canJoin = useCanJoin(startsAt, endsAt);
  if (!canJoin) return null;
  return (
    <Link
      href={`/consultation/video/${appointmentId}`}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-sage px-3 text-[13px] font-semibold text-ink hover:bg-sage-deep ${className}`}
    >
      <Video className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
