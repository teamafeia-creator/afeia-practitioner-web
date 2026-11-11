'use client';

import { useEffect, useState } from 'react';

/** Le praticien peut rejoindre la visio de 15 min avant le début jusqu'à la fin de la séance. */
export const JOIN_OPENS_BEFORE_MS = 15 * 60 * 1000;

export function canJoinVideo(startsAt: string | Date, endsAt: string | Date, now: number = Date.now()): boolean {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return now >= start - JOIN_OPENS_BEFORE_MS && now <= end;
}

/** Comme canJoinVideo, réévalué chaque minute. */
export function useCanJoin(startsAt: string | Date | null | undefined, endsAt: string | Date | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!startsAt || !endsAt) return false;
  return canJoinVideo(startsAt, endsAt, now);
}
