'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PractitionerPublicProfile } from '@/lib/queries/booking';
import { PractitionerHeader } from './components/PractitionerHeader';
import { BookingStepType } from './components/BookingStepType';
import { BookingStepDate } from './components/BookingStepDate';
import { BookingStepGroupSession, type GroupSessionOption } from './components/BookingStepGroupSession';
import { BookingStepContact, type ContactFormData } from './components/BookingStepContact';
import { BookingStepConfirm } from './components/BookingStepConfirm';

type Step = 'type' | 'date' | 'group_session' | 'contact' | 'confirm';

interface Confirmation {
  appointment_id?: string;
  registration_id?: string;
  starts_at: string;
  ends_at: string;
  consultation_type_name: string;
  duration_minutes?: number;
  practitioner_name: string;
  practitioner_address: string | null;
  ics_download_url?: string;
  session_title?: string;
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
  const [selectedGroupSession, setSelectedGroupSession] = useState<GroupSessionOption | null>(null);
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

  const isGroupType = !!(selectedType && 'is_group' in selectedType && (selectedType as Record<string, unknown>).is_group);

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
    setSelectedGroupSession(null);

    // Check if this type is a group type
    const ct = practitioner.consultation_types.find(t => t.id === typeId);
    if (ct && 'is_group' in ct && (ct as Record<string, unknown>).is_group) {
      setStep('group_session');
    } else {
      setStep('date');
    }
  };

  const handleSelectSlot = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setPrefillSlotUnavailable(false);
    setStep('contact');
  };

  const handleSelectGroupSession = (session: GroupSessionOption) => {
    setSelectedGroupSession(session);
    setStep('contact');
  };

  const handleSubmitContact = async (data: ContactFormData) => {
    setSubmitting(true);
    setBookingError(null);
    setContactEmail(data.email);

    try {
      if (selectedGroupSession) {
        // Group session registration flow
        const res = await fetch(`/api/booking/${slug}/group-sessions/${selectedGroupSession.id}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            first_name: data.first_name,
            email: data.email,
            phone: data.phone,
            reason: data.reason || null,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          if (result.error === 'FULL') {
            setBookingError('Cette seance est malheureusement complete. Veuillez en choisir une autre.');
            setStep('group_session');
          } else if (result.error === 'DUPLICATE') {
            setBookingError(result.message || 'Vous etes deja inscrit a cette seance.');
          } else {
            setBookingError(result.message || result.error || 'Une erreur est survenue.');
          }
          return;
        }

        setConfirmation({
          registration_id: result.registration_id,
          starts_at: result.starts_at,
          ends_at: result.ends_at,
          consultation_type_name: selectedType?.name || '',
          practitioner_name: result.practitioner_name,
          practitioner_address: practitioner.booking_address,
          session_title: result.session_title,
        });
        setStep('confirm');
      } else {
        // Individual appointment booking flow (existing)
        if (!selectedDate || !selectedTime || !selectedTypeId) return;

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
      }
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
    setSelectedGroupSession(null);
    setConfirmation(null);
    setBookingError(null);
    setContactEmail('');
    setPrefillSlotUnavailable(false);
  };

  // Format date/time for display
  let dateFormatted = '';
  let timeFormatted = '';

  if (selectedGroupSession) {
    const gs = selectedGroupSession;
    dateFormatted = dateFormatter.format(new Date(gs.starts_at));
    timeFormatted = `${timeFormatter.format(new Date(gs.starts_at))} - ${timeFormatter.format(new Date(gs.ends_at))}`;
  } else if (selectedDate) {
    dateFormatted = dateFormatter.format(new Date(selectedDate + 'T12:00:00'));
    timeFormatted = selectedTime || '';
  }

  const contactStepBackTarget = selectedGroupSession ? 'group_session' : 'date';

  // Determine progress steps for display
  const progressSteps: readonly string[] = isGroupType || selectedGroupSession
    ? ['type', 'group_session', 'contact']
    : ['type', 'date', 'contact'];

  const currentStepForProgress: string = step === 'group_session' ? 'group_session' : step;

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
          {progressSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  currentStepForProgress === s
                    ? 'bg-teal'
                    : progressSteps.indexOf(currentStepForProgress) > i
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

      {step === 'group_session' && selectedTypeId && (
        <BookingStepGroupSession
          slug={slug}
          consultationTypeId={selectedTypeId}
          onSelectSession={handleSelectGroupSession}
          onBack={() => setStep('type')}
        />
      )}

      {step === 'contact' && (
        <BookingStepContact
          practitionerName={practitioner.full_name}
          cancellationPolicyText={selectedGroupSession ? null : practitioner.cancellation_policy_text}
          cancellationPolicyHours={selectedGroupSession ? null : practitioner.cancellation_policy_hours}
          dateFormatted={dateFormatted}
          timeFormatted={timeFormatted}
          consultationTypeName={selectedGroupSession ? selectedGroupSession.title : (selectedType?.name || '')}
          onSubmit={handleSubmitContact}
          onBack={() => setStep(contactStepBackTarget)}
          submitting={submitting}
          error={bookingError}
        />
      )}

      {step === 'confirm' && confirmation && (
        <BookingStepConfirm
          confirmation={{
            appointment_id: confirmation.appointment_id || confirmation.registration_id || '',
            starts_at: confirmation.starts_at,
            ends_at: confirmation.ends_at,
            consultation_type_name: confirmation.session_title || confirmation.consultation_type_name,
            duration_minutes: confirmation.duration_minutes || 0,
            practitioner_name: confirmation.practitioner_name,
            practitioner_address: confirmation.practitioner_address,
            ics_download_url: confirmation.ics_download_url || '',
          }}
          email={contactEmail}
          onReset={handleReset}
          isGroupSession={!!confirmation.registration_id}
        />
      )}
    </div>
  );
}
