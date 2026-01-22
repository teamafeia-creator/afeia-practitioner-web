import type { Patient } from './types';

export function getPatientDisplayName(patient: Pick<Patient, 'first_name' | 'last_name'>): string {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

export function formatBirthDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('fr-FR');
}
