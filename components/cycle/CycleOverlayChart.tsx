'use client';

import { useMemo, useState } from 'react';
import type { CycleEntry, CycleProfile, JournalEntry, WearableSummary } from '../../lib/types';
import { CYCLE_PHASES } from '../../lib/cycle-constants';
import { identifyCycleStarts, buildPhaseMap } from '../../lib/cycle-utils';

type DataSeries = {
  key: string;
  label: string;
  color: string;
};

const AVAILABLE_SERIES: DataSeries[] = [
  { key: 'energy', label: 'Énergie (Journal)', color: '#D4A060' },
  { key: 'mood', label: 'Humeur (Journal)', color: '#D4738B' },
  { key: 'sleep_duration', label: 'Sommeil (heures)', color: '#5B8C6E' },
  { key: 'sleep_score', label: 'Score sommeil', color: '#5B8C8E' },
  { key: 'hrv', label: 'HRV moyenne', color: '#8B5CF6' },
  { key: 'activity', label: 'Activité', color: '#C4856C' },
];

function convertEnergy(val?: string | null): number | null {
  if (!val) return null;
  if (val === 'Bas') return 2;
  if (val === 'Moyen') return 5;
  if (val === 'Élevé') return 8;
  return null;
}

function convertMood(val?: string | null): number | null {
  if (!val) return null;
  if (val === '🙁' || val === 'Negatif') return 2;
  if (val === '😐' || val === 'Neutre') return 5;
  if (val === '🙂' || val === 'Positif') return 8;
  return null;
}

function extractDataPoint(
  key: string,
  date: string,
  journalMap: Map<string, JournalEntry>,
  wearableMap: Map<string, WearableSummary>
): number | null {
  const journal = journalMap.get(date);
  const wearable = wearableMap.get(date);

  switch (key) {
    case 'energy':
      return convertEnergy(journal?.energy);
    case 'mood':
      return convertMood(journal?.mood);
    case 'sleep_duration':
      return wearable?.sleep_duration != null ? Math.min(wearable.sleep_duration, 12) : null;
    case 'sleep_score':
      return wearable?.sleep_score != null ? wearable.sleep_score / 10 : null;
    case 'hrv':
      return wearable?.hrv_avg != null ? Math.min(wearable.hrv_avg / 15, 10) : null;
    case 'activity':
      return wearable?.activity_level != null ? Math.min(wearable.activity_level, 10) : null;
    default:
      return null;
  }
}

export function CycleOverlayChart({
  entries,
  cycleProfile,
  journalEntries,
  wearableSummaries,
  daysToShow = 60,
}: {
  entries: CycleEntry[];
  cycleProfile: CycleProfile;
  journalEntries: JournalEntry[];
  wearableSummaries: WearableSummary[];
  daysToShow?: number;
}) {
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['energy']);

  const cycleStarts = useMemo(() => identifyCycleStarts(entries), [entries]);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysToShow);
    return { start, end };
  }, [daysToShow]);

  const dates = useMemo(() => {
    const arr: string[] = [];
    const d = new Date(dateRange.start);
    while (d <= dateRange.end) {
      arr.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [dateRange]);

  const phaseMap = useMemo(
    () =>
      buildPhaseMap(
        cycleStarts,
        cycleProfile.average_cycle_length,
        cycleProfile.average_period_length,
        dateRange.start,
        dateRange.end
      ),
    [cycleStarts, cycleProfile, dateRange]
  );

  const journalMap = useMemo(() => {
    const m = new Map<string, JournalEntry>();
    for (const j of journalEntries) m.set(j.date, j);
    return m;
  }, [journalEntries]);

  const wearableMap = useMemo(() => {
    const m = new Map<string, WearableSummary>();
    for (const w of wearableSummaries) m.set(w.date, w);
    return m;
  }, [wearableSummaries]);

  // SVG dimensions
  const width = 800;
  const height = 300;
  const paddingLeft = 32;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 32;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Build phase bands (contiguous ranges of same phase)
  const phaseBands = useMemo(() => {
    const bands: { phase: string; startIdx: number; endIdx: number; predicted: boolean }[] = [];
    let current: typeof bands[0] | null = null;

    for (let i = 0; i < dates.length; i++) {
      const info = phaseMap.get(dates[i]);
      if (!info) {
        if (current) {
          bands.push(current);
          current = null;
        }
        continue;
      }
      if (current && current.phase === info.phase && current.predicted === info.predicted) {
        current.endIdx = i;
      } else {
        if (current) bands.push(current);
        current = { phase: info.phase, startIdx: i, endIdx: i, predicted: info.predicted };
      }
    }
    if (current) bands.push(current);
    return bands;
  }, [dates, phaseMap]);

  // Build data lines
  const dataLines = useMemo(() => {
    return selectedSeries.map((key) => {
      const series = AVAILABLE_SERIES.find((s) => s.key === key)!;
      const points: { x: number; y: number; date: string }[] = [];

      for (let i = 0; i < dates.length; i++) {
        const val = extractDataPoint(key, dates[i], journalMap, wearableMap);
        if (val !== null) {
          const x = paddingLeft + (i / (dates.length - 1)) * chartW;
          const y = paddingTop + (1 - val / 10) * chartH;
          points.push({ x, y, date: dates[i] });
        }
      }

      return { key, color: series.color, label: series.label, points };
    });
  }, [selectedSeries, dates, journalMap, wearableMap, chartW, chartH]);

  function toggleSeries(key: string) {
    setSelectedSeries((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 2) {
        return [prev[1], key];
      }
      return [...prev, key];
    });
  }

  // X axis labels (show ~6 dates)
  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(dates.length / 6));
    const labels: { idx: number; label: string }[] = [];
    for (let i = 0; i < dates.length; i += step) {
      const d = new Date(dates[i]);
      labels.push({
        idx: i,
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      });
    }
    return labels;
  }, [dates]);

  return (
    <div className="space-y-3">
      {/* Series selector */}
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedSeries.includes(s.key)
                ? 'text-white'
                : 'bg-cream text-stone hover:bg-cream/80'
            }`}
            style={
              selectedSeries.includes(s.key)
                ? { backgroundColor: s.color }
                : undefined
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: 500 }}
          role="img"
          aria-label="Graphique superposition cycle et données de suivi"
        >
          {/* Phase background bands */}
          {phaseBands.map((band, i) => {
            const x1 = paddingLeft + (band.startIdx / (dates.length - 1)) * chartW;
            const x2 = paddingLeft + (band.endIdx / (dates.length - 1)) * chartW;
            const meta = CYCLE_PHASES[band.phase as keyof typeof CYCLE_PHASES];
            return (
              <rect
                key={i}
                x={x1}
                y={paddingTop}
                width={Math.max(x2 - x1, 2)}
                height={chartH}
                fill={meta?.color || '#ccc'}
                opacity={band.predicted ? 0.08 : 0.12}
              />
            );
          })}

          {/* Y axis grid lines */}
          {[0, 2.5, 5, 7.5, 10].map((v) => {
            const y = paddingTop + (1 - v / 10) * chartH;
            return (
              <g key={v}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e5e5e5"
                  strokeWidth="0.5"
                />
                <text x={paddingLeft - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Data polylines */}
          {dataLines.map((line) => {
            if (line.points.length < 2) return null;
            const d = line.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <g key={line.key}>
                <path d={d} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" />
                {line.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={line.color} />
                ))}
              </g>
            );
          })}

          {/* X axis labels */}
          {xLabels.map(({ idx, label }) => {
            const x = paddingLeft + (idx / (dates.length - 1)) * chartW;
            return (
              <text
                key={idx}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-stone">
        <span className="font-medium text-charcoal">Phases :</span>
        {(Object.entries(CYCLE_PHASES) as [string, typeof CYCLE_PHASES[keyof typeof CYCLE_PHASES]][]).map(
          ([key, meta]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${meta.dotClass}`} />
              {meta.label}
            </span>
          )
        )}
        {dataLines.length > 0 && (
          <>
            <span className="font-medium text-charcoal ml-2">Courbes :</span>
            {dataLines.map((line) => (
              <span key={line.key} className="flex items-center gap-1">
                <span className="h-0.5 w-3 rounded" style={{ backgroundColor: line.color }} />
                {line.label}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
