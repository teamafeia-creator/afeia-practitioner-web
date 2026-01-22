import type { NewPatient } from './types';

export type PatientFormErrors = Partial<Record<keyof NewPatient, string>>;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePatientInput(values: NewPatient): PatientFormErrors {
  const errors: PatientFormErrors = {};

  if (!values.first_name.trim()) {
    errors.first_name = 'Le prénom est obligatoire.';
  }

  if (!values.last_name.trim()) {
    errors.last_name = 'Le nom est obligatoire.';
  }

  if (values.email && !isValidEmail(values.email)) {
    errors.email = 'Merci de renseigner un email valide.';
  }

  return errors;
}
