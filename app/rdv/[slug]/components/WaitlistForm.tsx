'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

interface ConsultationTypeOption {
  id: string;
  name: string;
}

interface WaitlistFormProps {
  practitionerSlug: string;
  consultationTypes: ConsultationTypeOption[];
  preselectedTypeId?: string | null;
}

const DAYS_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export function WaitlistForm({
  practitionerSlug,
  consultationTypes,
  preselectedTypeId,
}: WaitlistFormProps) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consultationTypeId, setConsultationTypeId] = useState(preselectedTypeId || '');
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<string>('any');
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [allDays, setAllDays] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleDay = (day: number) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    setAllDays(false);
  };

  const handleToggleAllDays = () => {
    if (allDays) {
      setAllDays(false);
    } else {
      setAllDays(true);
      setPreferredDays([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/booking/${practitionerSlug}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          consultation_type_id: consultationTypeId || undefined,
          preferred_time_of_day: preferredTimeOfDay,
          preferred_days: allDays ? [] : preferredDays,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === 'DUPLICATE') {
          setError('Vous etes deja inscrit(e) sur la liste d\'attente.');
        } else {
          setError(result.error || result.message || 'Une erreur est survenue.');
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-sage/20 bg-sage-light/30 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <CheckCircle className="h-10 w-10 text-sage" />
        </div>
        <p className="text-sm font-medium text-charcoal">Inscription confirmee !</p>
        <p className="text-sm text-stone">
          Vous serez prevenu(e) par email des qu&apos;un creneau correspondant se libere.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Prenom"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          minLength={2}
          placeholder="Votre prenom"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="votre@email.com"
        />
      </div>

      <Input
        label="Telephone (optionnel)"
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="06 12 34 56 78"
      />

      {consultationTypes.length > 1 && (
        <Select
          label="Type de consultation"
          value={consultationTypeId}
          onChange={e => setConsultationTypeId(e.target.value)}
        >
          <option value="">Tous types</option>
          {consultationTypes.map(ct => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </Select>
      )}

      <Select
        label="Preference horaire"
        value={preferredTimeOfDay}
        onChange={e => setPreferredTimeOfDay(e.target.value)}
      >
        <option value="any">Peu importe</option>
        <option value="morning">Matin (avant 12h)</option>
        <option value="afternoon">Apres-midi (12h-17h)</option>
        <option value="evening">Soir (apres 17h)</option>
      </Select>

      <div>
        <span className="text-xs font-medium text-stone block mb-2">Jours preferes</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleAllDays}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              allDays
                ? 'bg-teal text-white border-teal'
                : 'bg-white text-charcoal border-divider hover:border-sage'
            }`}
          >
            Tous les jours
          </button>
          {DAYS_LABELS.map(day => (
            <button
              key={day.value}
              type="button"
              onClick={() => handleToggleDay(day.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                !allDays && preferredDays.includes(day.value)
                  ? 'bg-teal text-white border-teal'
                  : 'bg-white text-charcoal border-divider hover:border-sage'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={submitting}
      >
        S&apos;inscrire a la liste d&apos;attente
      </Button>
    </form>
  );
}
