'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PractitionerPublicProfile } from '@/lib/queries/booking';
import { PractitionerHeader } from './components/PractitionerHeader';
import { BookingStepType } from './components/BookingStepType';
import { BookingStepDate } from './components/BookingStepDate';
import { BookingStepContact, type ContactFormData } from './components/BookingStepContact';
import { BookingStepConfirm } from './components/BookingStepConfirm';

type Step = 'type' | 'date' | 'contact' | 'confirm';

interface Confirmation {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  consultation_type_name: string;
  duration_minutes: number;
  practitioner_name: string;
  practitioner_address: string | null;
  ics_download_url: string;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function BookingPageClient({
  practitioner,
  slug,
}: {
  practitioner: PractitionerPublicProfile;
  slug: string;
}) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('type');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [prefillSlotUnavailable, setPrefillSlotUnavailable] = useState(false);
  const [prefillChecked, setPrefillChecked] = useState(false);

  const selectedType = useMemo(
    () => practitioner.consultation_types.find(t => t.id === selectedTypeId),
    [selectedTypeId, practitioner.consultation_types]
  );

  // Handle pre-fill from query params (waitlist notification link)
  const checkPrefillSlot = useCallback(async (
    prefillDate: string,
    prefillTime: string,
    prefillTypeId: string,
  ) => {
    try {
      const res = await fetch(
        `/api/booking/${slug}/slots?date=${prefillDate}&consultation_type_id=${prefillTypeId}`
      );
      if (!res.ok) return false;
      const data = await res.json();
      const slots: string[] = data.slots || [];
      return slots.includes(prefillTime);
    } catch {
      return false;
    }
  }, [slug]);

  useEffect(() => {
    if (prefillChecked) return;

    const prefillDate = searchParams.get('date');
    const prefillTime = searchParams.get('time');
    const prefillTypeId = searchParams.get('consultation_type_id');

    if (!prefillDate || !prefillTime || !prefillTypeId) {
      setPrefillChecked(true);
      return;
    }

    // Validate the type exists
    const typeExists = practitioner.consultation_types.some(t => t.id === prefillTypeId);
    if (!typeExists) {
      setPrefillChecked(true);
      return;
    }

    // Check if the slot is still available
    checkPrefillSlot(prefillDate, prefillTime, prefillTypeId).then(available => {
      if (available) {
        setSelectedTypeId(prefillTypeId);
        setSelectedDate(prefillDate);
        setSelectedTime(prefillTime);
        setStep('contact');
      } else {
        // Slot no longer available — go to date step with a message
        setSelectedTypeId(prefillTypeId);
        setPrefillSlotUnavailable(true);
        setStep('date');
      }
      setPrefillChecked(true);
    });
  }, [searchParams, practitioner.consultation_types, checkPrefillSlot, prefillChecked]);

  const handleSelectType = (typeId: string) => {
    setSelectedTypeId(typeId);
    setPrefillSlotUnavailable(false);
    setStep('date');
  };

  const handleSelectSlot = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setPrefillSlotUnavailable(false);
    setStep('contact');
  };

  const handleSubmitContact = async (data: ContactFormData) => {
    if (!selectedDate || !selectedTime || !selectedTypeId) return;

    setSubmitting(true);
    setBookingError(null);
    setContactEmail(data.email);

    try {
      const startsAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      const res = await fetch(`/api/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_type_id: selectedTypeId,
          starts_at: startsAt,
          name: data.name,
          first_name: data.first_name,
          email: data.email,
          phone: data.phone,
          reason: data.reason || null,
          consent_rgpd: data.consent_rgpd,
          consent_cancellation: data.consent_cancellation,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === 'SLOT_CONFLICT') {
          setBookingError('Ce creneau vient d\'etre reserve. Veuillez en choisir un autre.');
          setStep('date');
        } else {
          setBookingError(result.message || result.error || 'Une erreur est survenue.');
        }
        return;
      }

      setConfirmation(result);
      setStep('confirm');
    } catch {
      setBookingError('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('type');
    setSelectedTypeId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setConfirmation(null);
    setBookingError(null);
    setContactEmail('');
    setPrefillSlotUnavailable(false);
  };

  // Format date/time for display
  const dateFormatted = selectedDate
    ? dateFormatter.format(new Date(selectedDate + 'T12:00:00'))
    : '';
  const timeFormatted = selectedTime || '';

  // Show loading while checking prefill params
  if (!prefillChecked && searchParams.get('date')) {
    return (
      <div>
        <PractitionerHeader practitioner={practitioner} />
        <div className="text-center py-12 text-stone">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <PractitionerHeader practitioner={practitioner} />

      {/* Progress steps */}
      {step !== 'confirm' && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['type', 'date', 'contact'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  step === s
                    ? 'bg-teal'
                    : ['type', 'date', 'contact'].indexOf(step) > i
                      ? 'bg-teal/40'
                      : 'bg-stone/20'
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Prefill slot unavailable message */}
      {prefillSlotUnavailable && step === 'date' && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm text-amber-800">
            Ce creneau n&apos;est malheureusement plus disponible. Veuillez en choisir un autre.
          </p>
        </div>
      )}

      {/* Step content */}
      {step === 'type' && (
        <BookingStepType
          types={practitioner.consultation_types}
          onSelect={handleSelectType}
        />
      )}

      {step === 'date' && selectedTypeId && (
        <BookingStepDate
          slug={slug}
          consultationTypeId={selectedTypeId}
          consultationTypeName={selectedType?.name || ''}
          onSelectSlot={handleSelectSlot}
          onBack={() => setStep('type')}
          practitionerSlug={slug}
          consultationTypes={practitioner.consultation_types}
        />
      )}

      {step === 'contact' && (
        <BookingStepContact
          practitionerName={practitioner.full_name}
          cancellationPolicyText={practitioner.cancellation_policy_text}
          cancellationPolicyHours={practitioner.cancellation_policy_hours}
          dateFormatted={dateFormatted}
          timeFormatted={timeFormatted}
          consultationTypeName={selectedType?.name || ''}
          onSubmit={handleSubmitContact}
          onBack={() => setStep('date')}
          submitting={submitting}
          error={bookingError}
        />
      )}

      {step === 'confirm' && confirmation && (
        <BookingStepConfirm
          confirmation={confirmation}
          email={contactEmail}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
