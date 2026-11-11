'use client';

import { showToast } from '@/components/ui/Toaster';

/** Lien de consultation à transmettre au consultant (même adresse que dans l'e-mail). */
export function consultantLink(appointmentId: string, joinToken: string): string {
  return `${window.location.origin}/consultation/video/${appointmentId}?token=${joinToken}`;
}

/** Copie le lien consultant dans le presse-papiers et l'annonce. */
export async function copyConsultantLink(appointmentId: string, joinToken: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(consultantLink(appointmentId, joinToken));
    showToast.success('Lien copié');
  } catch {
    showToast.error('Le lien n’a pas pu être copié.');
  }
}
