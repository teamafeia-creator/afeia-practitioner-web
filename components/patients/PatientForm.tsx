'use client';

import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import type { NewPatient } from '../../lib/patients/types';
import { getErrorMessage } from '../../lib/errors';
import { validatePatientInput } from '../../lib/patients/validation';

type PatientFormValues = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  notes: string;
};

type Props = {
  onSubmit: (values: NewPatient) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  serverError?: string | null;
};

const DEFAULT_VALUES: PatientFormValues = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  notes: ''
};

export function PatientForm({ onSubmit, submitLabel = 'Ajouter le patient', loading = false, serverError }: Props) {
  const [values, setValues] = useState<PatientFormValues>(DEFAULT_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PatientFormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const normalizedValues = useMemo<NewPatient>(() => {
    const trimOrNull = (value: string) => (value.trim() ? value.trim() : null);
    return {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      date_of_birth: trimOrNull(values.date_of_birth),
      gender: trimOrNull(values.gender),
      email: trimOrNull(values.email),
      phone: trimOrNull(values.phone),
      notes: trimOrNull(values.notes)
    };
  }, [values]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validatePatientInput(normalizedValues);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await onSubmit(normalizedValues);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Input
            label="Prénom *"
            name="first_name"
            value={values.first_name}
            onChange={(event) => setValues((prev) => ({ ...prev, first_name: event.target.value }))}
            aria-invalid={Boolean(fieldErrors.first_name)}
            required
          />
          {fieldErrors.first_name ? <p className="text-xs text-aubergine">{fieldErrors.first_name}</p> : null}
        </div>
        <div className="space-y-1">
          <Input
            label="Nom *"
            name="last_name"
            value={values.last_name}
            onChange={(event) => setValues((prev) => ({ ...prev, last_name: event.target.value }))}
            aria-invalid={Boolean(fieldErrors.last_name)}
            required
          />
          {fieldErrors.last_name ? <p className="text-xs text-aubergine">{fieldErrors.last_name}</p> : null}
        </div>

        <Input
          label="Date de naissance"
          type="date"
          name="date_of_birth"
          value={values.date_of_birth}
          onChange={(event) => setValues((prev) => ({ ...prev, date_of_birth: event.target.value }))}
        />
        <label className="block">
          <span className="text-xs font-medium text-warmgray">Genre</span>
          <select
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            name="gender"
            value={values.gender}
            onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))}
          >
            <option value="">Non renseigné</option>
            <option value="female">Femme</option>
            <option value="male">Homme</option>
            <option value="other">Autre</option>
          </select>
        </label>

        <div className="space-y-1">
          <Input
            label="Email"
            type="email"
            name="email"
            value={values.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? <p className="text-xs text-aubergine">{fieldErrors.email}</p> : null}
        </div>
        <Input
          label="Téléphone"
          type="tel"
          name="phone"
          value={values.phone}
          onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-warmgray">Notes</label>
        <Textarea
          className="mt-2"
          name="notes"
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Contexte, préférences, informations utiles..."
        />
      </div>

      {(formError || serverError) ? (
        <div role="alert" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
          <div className="font-medium text-marine">Une erreur est survenue</div>
          <div className="text-marine mt-1">{formError || serverError}</div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={loading} variant="cta">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
