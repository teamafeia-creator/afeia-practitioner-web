'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { SlotPicker } from './SlotPicker';

interface BookingStepDateProps {
  slug: string;
  consultationTypeId: string;
  consultationTypeName: string;
  onSelectSlot: (date: string, time: string) => void;
  onBack: () => void;
}

export function BookingStepDate({
  slug,
  consultationTypeId,
  consultationTypeName,
  onSelectSlot,
  onBack,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-teal/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-charcoal" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            Choisissez une date
          </h2>
          <p className="text-sm text-warmgray">{consultationTypeName}</p>
        </div>
      </div>

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
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-teal to-teal-deep px-6 py-3 text-sm font-medium text-white hover:shadow-teal-glow transition-all"
          >
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
