'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { SlotPicker } from './SlotPicker';
import { WaitlistForm } from './WaitlistForm';

interface ConsultationTypeOption {
  id: string;
  name: string;
}

interface BookingStepDateProps {
  slug: string;
  consultationTypeId: string;
  consultationTypeName: string;
  onSelectSlot: (date: string, time: string) => void;
  onBack: () => void;
  practitionerSlug?: string;
  consultationTypes?: ConsultationTypeOption[];
}

export function BookingStepDate({
  slug,
  consultationTypeId,
  consultationTypeName,
  onSelectSlot,
  onBack,
  practitionerSlug,
  consultationTypes,
}: BookingStepDateProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  const hasNoAvailableDays = !loadingDays && availableDays.size === 0;

  // Load available days for the month
  const loadAvailableDays = useCallback(async () => {
    setLoadingDays(true);
    try {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(
        `/api/booking/${slug}/available-days?month=${monthStr}&consultation_type_id=${consultationTypeId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableDays(new Set(data.available_days || []));
      }
    } catch (error) {
      console.error('Error loading available days:', error);
    } finally {
      setLoadingDays(false);
    }
  }, [currentMonth, slug, consultationTypeId]);

  useEffect(() => {
    loadAvailableDays();
  }, [loadAvailableDays]);

  // Load slots for selected date
  const loadSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/booking/${slug}/slots?date=${date}&consultation_type_id=${consultationTypeId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  }, [slug, consultationTypeId]);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, loadSlots]);

  const handleSelectSlot = (time: string) => {
    setSelectedSlot(time);
  };

  const handleConfirmSlot = () => {
    if (selectedDate && selectedSlot) {
      onSelectSlot(selectedDate, selectedSlot);
    }
  };

  const handleChangeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return direction === 'prev'
        ? new Date(year, month - 1, 1)
        : new Date(year, month + 1, 1);
    });
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
  };

  const effectiveSlug = practitionerSlug || slug;
  const effectiveTypes = consultationTypes || [];

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
            Choisissez une date
          </h2>
          <p className="text-sm text-stone">{consultationTypeName}</p>
        </div>
      </div>

      {/* No available days: show waitlist form prominently */}
      {hasNoAvailableDays ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 text-center">
            <Bell className="h-8 w-8 text-amber-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-charcoal mb-1">
              Aucun creneau disponible pour le moment
            </h3>
            <p className="text-sm text-stone">
              Inscrivez-vous a la liste d&apos;attente pour etre prevenu(e) des qu&apos;un creneau se libere.
            </p>
          </div>

          <div className="rounded-xl border border-teal/15 bg-white/70 p-6">
            <WaitlistForm
              practitionerSlug={effectiveSlug}
              consultationTypes={effectiveTypes}
              preselectedTypeId={consultationTypeId}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-teal/15 bg-white/70 p-4">
            <MiniCalendar
              currentMonth={currentMonth}
              availableDays={availableDays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onChangeMonth={handleChangeMonth}
              loading={loadingDays}
            />
          </div>

          {selectedDate && (
            <SlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={handleSelectSlot}
              date={selectedDate}
              loading={loadingSlots}
            />
          )}

          {selectedSlot && selectedDate && (
            <div className="flex justify-end">
              <button
                onClick={handleConfirmSlot}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-sage to-sage-dark px-6 py-3 text-sm font-medium text-white hover:shadow-teal-glow transition-all"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Waitlist link when slots are available */}
          {effectiveTypes.length > 0 && (
            <div className="border-t border-stone/10 pt-4">
              {!showWaitlistForm ? (
                <button
                  onClick={() => setShowWaitlistForm(true)}
                  className="text-sm text-stone hover:text-teal transition-colors flex items-center gap-2 mx-auto"
                >
                  <Bell className="h-4 w-4" />
                  Aucun creneau ne vous convient ? Inscrivez-vous a la liste d&apos;attente
                </button>
              ) : (
                <div className="rounded-xl border border-teal/15 bg-white/70 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-charcoal">
                      Liste d&apos;attente
                    </h3>
                    <button
                      onClick={() => setShowWaitlistForm(false)}
                      className="text-xs text-stone hover:text-charcoal transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                  <WaitlistForm
                    practitionerSlug={effectiveSlug}
                    consultationTypes={effectiveTypes}
                    preselectedTypeId={consultationTypeId}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
