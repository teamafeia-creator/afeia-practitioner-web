'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface BookingStepContactProps {
  practitionerName: string;
  cancellationPolicyText: string | null;
  cancellationPolicyHours: number | null;
  dateFormatted: string;
  timeFormatted: string;
  consultationTypeName: string;
  onSubmit: (data: ContactFormData) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}

export interface ContactFormData {
  name: string;
  first_name: string;
  email: string;
  phone: string;
  reason: string;
  consent_rgpd: boolean;
  consent_cancellation: boolean;
}

export function BookingStepContact({
  practitionerName,
  cancellationPolicyText,
  cancellationPolicyHours,
  dateFormatted,
  timeFormatted,
  consultationTypeName,
  onSubmit,
  onBack,
  submitting,
  error,
}: BookingStepContactProps) {
  const [form, setForm] = useState<ContactFormData>({
    name: '',
    first_name: '',
    email: '',
    phone: '',
    reason: '',
    consent_rgpd: false,
    consent_cancellation: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasCancellationPolicy = !!(cancellationPolicyText || cancellationPolicyHours);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = 'Nom requis';
    if (!form.first_name.trim()) errs.first_name = 'Prenom requis';

    if (!form.email.trim()) {
      errs.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email invalide';
    }

    const cleanPhone = form.phone.replace(/[\s.\-]/g, '');
    if (!cleanPhone) {
      errs.phone = 'Telephone requis';
    } else if (!/^0\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Format: 10 chiffres commencant par 0';
    }

    if (!form.consent_rgpd) {
      errs.consent_rgpd = 'Consentement requis';
    }

    if (hasCancellationPolicy && !form.consent_cancellation) {
      errs.consent_cancellation = 'Acceptation requise';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-sage-light transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-charcoal" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            Vos coordonnees
          </h2>
          <p className="text-sm text-stone">
            {consultationTypeName} — {dateFormatted} a {timeFormatted}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-stone mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10"
              placeholder="Dupont"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-stone mb-1">
              Prenom *
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full rounded-lg border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10"
              placeholder="Marie"
            />
            {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-stone mb-1">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-lg border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10"
            placeholder="marie@exemple.fr"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-stone mb-1">
            Telephone *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full rounded-lg border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10"
            placeholder="06 12 34 56 78"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-stone mb-1">
            Motif de la consultation (optionnel)
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
            className="w-full min-h-[80px] rounded-lg border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/10"
            placeholder="Decrivez brievement la raison de votre visite..."
          />
        </div>

        {/* RGPD consent */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent_rgpd}
              onChange={(e) => setForm(prev => ({ ...prev, consent_rgpd: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-sage/30 text-sage focus:ring-sage/50"
            />
            <span className="text-xs text-stone leading-relaxed">
              J&apos;accepte que mes donnees soient traitees par {practitionerName} via AFEIA
              pour la gestion de mon rendez-vous. *
            </span>
          </label>
          {errors.consent_rgpd && <p className="text-xs text-red-500 ml-7">{errors.consent_rgpd}</p>}

          {hasCancellationPolicy && (
            <>
              {cancellationPolicyText && (
                <div className="rounded-lg bg-stone/5 p-3 text-xs text-stone">
                  {cancellationPolicyText}
                </div>
              )}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent_cancellation}
                  onChange={(e) => setForm(prev => ({ ...prev, consent_cancellation: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-sage/30 text-sage focus:ring-sage/50"
                />
                <span className="text-xs text-stone leading-relaxed">
                  J&apos;ai lu et j&apos;accepte la politique d&apos;annulation. *
                </span>
              </label>
              {errors.consent_cancellation && (
                <p className="text-xs text-red-500 ml-7">{errors.consent_cancellation}</p>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-br from-sage to-sage-dark px-6 py-3 text-sm font-medium text-white hover:shadow-teal-glow transition-all disabled:opacity-50"
        >
          {submitting ? 'Reservation en cours...' : 'Confirmer mon rendez-vous'}
        </button>
      </form>
    </div>
  );
}
