'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

interface MiniCalendarProps {
  currentMonth: Date; // year + month
  availableDays: Set<string>; // "YYYY-MM-DD"
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (direction: 'prev' | 'next') => void;
  loading?: boolean;
}

export function MiniCalendar({
  currentMonth,
  availableDays,
  selectedDate,
  onSelectDate,
  onChangeMonth,
  loading,
}: MiniCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d;
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-based

  // Build grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // firstDay.getDay() returns 0=Sunday; we need Monday-first
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  // Can navigate?
  const canGoPrev = (() => {
    const prevMonth = new Date(year, month - 1, 1);
    const todayDate = new Date(today);
    return prevMonth.getFullYear() > todayDate.getFullYear() ||
      (prevMonth.getFullYear() === todayDate.getFullYear() && prevMonth.getMonth() >= todayDate.getMonth());
  })();

  const canGoNext = (() => {
    const nextMonth = new Date(year, month + 1, 1);
    return nextMonth <= maxDate;
  })();

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onChangeMonth('prev')}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-teal/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-charcoal" />
        </button>
        <span className="text-sm font-semibold text-charcoal">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => onChangeMonth('next')}
          disabled={!canGoNext}
          className="p-2 rounded-lg hover:bg-teal/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-charcoal" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-[11px] font-medium text-warmgray py-1"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="h-10" />;
          }

          const isToday = cell.dateStr === today;
          const isPast = cell.dateStr < today;
          const isBeyondMax = new Date(cell.dateStr) > maxDate;
          const isAvailable = availableDays.has(cell.dateStr);
          const isSelected = cell.dateStr === selectedDate;
          const isDisabled = isPast || isBeyondMax || !isAvailable || loading;

          return (
            <button
              key={cell.dateStr}
              onClick={() => !isDisabled && onSelectDate(cell.dateStr)}
              disabled={isDisabled}
              className={`
                h-10 rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-teal text-white shadow-sm'
                  : isAvailable && !isPast
                    ? 'bg-teal/10 text-teal hover:bg-teal/20'
                    : 'text-warmgray/40'
                }
                ${isToday && !isSelected ? 'ring-1 ring-teal/30' : ''}
                ${isDisabled && !isSelected ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center text-xs text-warmgray">
          Chargement des disponibilites...
        </div>
      )}
    </div>
  );
}
