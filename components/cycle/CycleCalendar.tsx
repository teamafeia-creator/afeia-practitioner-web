'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CycleEntry, CycleProfile } from '../../lib/types';
import { CYCLE_PHASES, SYMPTOM_LABELS, FLOW_LABELS } from '../../lib/cycle-constants';
import { buildPhaseMap, identifyCycleStarts } from '../../lib/cycle-utils';
import type { SymptomKey } from '../../lib/types';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getMonthDays(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0, Sunday = 6 (ISO)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function getFlowBg(intensity: string | null): string {
  switch (intensity) {
    case 'spotting': return 'bg-rose/20';
    case 'light': return 'bg-rose/35';
    case 'medium': return 'bg-rose/50';
    case 'heavy': return 'bg-rose/70';
    default: return 'bg-rose/30';
  }
}

function getPhaseBg(phase: string, predicted: boolean): string {
  const opacity = predicted ? 'opacity-40' : '';
  const meta = CYCLE_PHASES[phase as keyof typeof CYCLE_PHASES];
  if (!meta) return '';
  return `${meta.bgClass} ${opacity}`;
}

function extractSymptoms(entry: CycleEntry): string[] {
  const symptoms: string[] = [];
  const keys: SymptomKey[] = [
    'cramps', 'bloating', 'headache', 'breast_tenderness', 'mood_swings',
    'fatigue', 'acne', 'cravings', 'insomnia', 'water_retention',
    'back_pain', 'nausea', 'libido_high',
  ];
  for (const k of keys) {
    if (entry[`symptom_${k}` as keyof CycleEntry]) {
      symptoms.push(SYMPTOM_LABELS[k]);
    }
  }
  return symptoms;
}

export function CycleCalendar({
  entries,
  cycleProfile,
  month: initialMonth,
  year: initialYear,
  onMonthChange,
}: {
  entries: CycleEntry[];
  cycleProfile: CycleProfile;
  month: number; // 0-indexed
  year: number;
  onMonthChange?: (month: number, year: number) => void;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const cycleStarts = useMemo(() => identifyCycleStarts(entries), [entries]);

  const phaseMap = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return buildPhaseMap(
      cycleStarts,
      cycleProfile.average_cycle_length,
      cycleProfile.average_period_length,
      start,
      end
    );
  }, [cycleStarts, cycleProfile, month, year]);

  const entryMap = useMemo(() => {
    const m = new Map<string, CycleEntry>();
    for (const e of entries) m.set(e.date, e);
    return m;
  }, [entries]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthLabel = new Date(year, month).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  function navigate(dir: -1 | 1) {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newMonth, newYear);
  }

  function handleDayHover(
    e: React.MouseEvent,
    date: Date
  ) {
    const key = date.toISOString().slice(0, 10);
    const phaseInfo = phaseMap.get(key);
    const entry = entryMap.get(key);

    const lines: string[] = [];
    if (phaseInfo) {
      const meta = CYCLE_PHASES[phaseInfo.phase];
      lines.push(`J${phaseInfo.cycleDay} \u2014 ${meta.label}`);
      if (phaseInfo.predicted) lines.push('(Prédiction)');
    }
    if (entry) {
      if (entry.is_period) {
        lines.push(`Règles${entry.flow_intensity ? ` (${FLOW_LABELS[entry.flow_intensity]})` : ''}`);
      }
      if (entry.period_pain != null && entry.period_pain > 0) {
        lines.push(`Douleur: ${entry.period_pain}/10`);
      }
      const symptoms = extractSymptoms(entry);
      if (symptoms.length > 0) {
        lines.push(symptoms.join(', '));
      }
    }

    if (lines.length > 0) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ x: rect.left, y: rect.top - 4, content: lines.join('\n') });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-1.5 hover:bg-cream transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-stone" />
        </button>
        <p className="text-sm font-medium text-charcoal capitalize">{monthLabel}</p>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg p-1.5 hover:bg-cream transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-stone" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {DAYS_FR.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium uppercase text-stone">
            {d}
          </div>
        ))}
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-9" />;
          }
          const key = date.toISOString().slice(0, 10);
          const phaseInfo = phaseMap.get(key);
          const entry = entryMap.get(key);
          const isToday = key === today;

          let bgClass = '';
          if (entry?.is_period) {
            bgClass = getFlowBg(entry.flow_intensity);
          } else if (phaseInfo) {
            bgClass = getPhaseBg(phaseInfo.phase, phaseInfo.predicted);
          }

          const hasSymptoms = entry ? extractSymptoms(entry).length > 0 : false;

          return (
            <div
              key={key}
              className={`relative flex h-9 items-center justify-center rounded-md text-xs transition-colors cursor-default ${bgClass} ${
                isToday ? 'ring-1 ring-charcoal/30' : ''
              } ${phaseInfo?.predicted ? 'border border-dashed border-stone/20' : ''}`}
              onMouseEnter={(e) => handleDayHover(e, date)}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={`${isToday ? 'font-bold text-charcoal' : 'text-charcoal/80'}`}>
                {date.getDate()}
              </span>
              {hasSymptoms && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-charcoal/40" />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg bg-charcoal px-3 py-2 text-xs text-white shadow-lg whitespace-pre-line pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-100%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        {(Object.entries(CYCLE_PHASES) as [string, typeof CYCLE_PHASES[keyof typeof CYCLE_PHASES]][]).map(
          ([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
              <span className="text-[10px] text-stone">{meta.label}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
