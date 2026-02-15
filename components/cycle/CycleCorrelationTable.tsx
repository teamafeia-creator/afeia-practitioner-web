'use client';

import { useMemo } from 'react';
import type { CycleEntry, CycleProfile, CyclePhase, JournalEntry, WearableSummary } from '../../lib/types';
import { CYCLE_PHASES } from '../../lib/cycle-constants';
import { identifyCycleStarts, getCycleDay, getCyclePhaseForDay } from '../../lib/cycle-utils';

type PhaseStats = {
  count: number;
  energySum: number;
  energyCount: number;
  sleepSum: number;
  sleepCount: number;
  hrvSum: number;
  hrvCount: number;
  bloatingCount: number;
  fatigueCount: number;
  crampsCount: number;
  moodSwingsCount: number;
};

function emptyStats(): PhaseStats {
  return {
    count: 0,
    energySum: 0,
    energyCount: 0,
    sleepSum: 0,
    sleepCount: 0,
    hrvSum: 0,
    hrvCount: 0,
    bloatingCount: 0,
    fatigueCount: 0,
    crampsCount: 0,
    moodSwingsCount: 0,
  };
}

function energyToNum(val?: string): number | null {
  if (val === 'Bas') return 2;
  if (val === 'Moyen') return 5;
  if (val === 'Élevé') return 8;
  return null;
}

const PHASE_ORDER: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal_early', 'luteal_late'];

function cellColor(value: number, goodLow: boolean = false): string {
  // green if good, orange if medium, red if bad
  const threshold = goodLow
    ? { good: 20, med: 50 }
    : { good: 6, med: 4 };

  if (goodLow) {
    if (value <= threshold.good) return 'bg-sage/10 text-sage';
    if (value <= threshold.med) return 'bg-gold/10 text-gold';
    return 'bg-rose/10 text-rose';
  }
  if (value >= threshold.good) return 'bg-sage/10 text-sage';
  if (value >= threshold.med) return 'bg-gold/10 text-gold';
  return 'bg-rose/10 text-rose';
}

export function CycleCorrelationTable({
  entries,
  cycleProfile,
  journalEntries,
  wearableSummaries,
}: {
  entries: CycleEntry[];
  cycleProfile: CycleProfile;
  journalEntries: JournalEntry[];
  wearableSummaries: WearableSummary[];
}) {
  const cycleStarts = useMemo(() => identifyCycleStarts(entries), [entries]);

  const stats = useMemo(() => {
    const phaseStats: Record<CyclePhase, PhaseStats> = {
      menstrual: emptyStats(),
      follicular: emptyStats(),
      ovulation: emptyStats(),
      luteal_early: emptyStats(),
      luteal_late: emptyStats(),
    };

    const journalMap = new Map<string, JournalEntry>();
    for (const j of journalEntries) journalMap.set(j.date, j);

    const wearableMap = new Map<string, WearableSummary>();
    for (const w of wearableSummaries) wearableMap.set(w.date, w);

    // For each cycle entry, determine its phase and accumulate stats
    for (const entry of entries) {
      // Find the relevant cycle start
      let startDate: Date | null = null;
      for (let i = cycleStarts.length - 1; i >= 0; i--) {
        const csStr = cycleStarts[i].toISOString().slice(0, 10);
        if (entry.date >= csStr) {
          startDate = cycleStarts[i];
          break;
        }
      }
      if (!startDate) continue;

      const day = getCycleDay(entry.date, startDate);
      const phase = getCyclePhaseForDay(day, cycleProfile.average_cycle_length, cycleProfile.average_period_length);
      const ps = phaseStats[phase];
      ps.count++;

      // Journal data
      const journal = journalMap.get(entry.date);
      if (journal?.energy) {
        const e = energyToNum(journal.energy);
        if (e !== null) { ps.energySum += e; ps.energyCount++; }
      }

      // Wearable data
      const wearable = wearableMap.get(entry.date);
      if (wearable?.sleep_duration != null) { ps.sleepSum += wearable.sleep_duration; ps.sleepCount++; }
      if (wearable?.hrv_avg != null) { ps.hrvSum += wearable.hrv_avg; ps.hrvCount++; }

      // Symptoms
      if (entry.symptom_bloating) ps.bloatingCount++;
      if (entry.symptom_fatigue) ps.fatigueCount++;
      if (entry.symptom_cramps) ps.crampsCount++;
      if (entry.symptom_mood_swings) ps.moodSwingsCount++;
    }

    return phaseStats;
  }, [entries, cycleStarts, cycleProfile, journalEntries, wearableSummaries]);

  const rows = [
    {
      label: 'Énergie moy.',
      getValue: (ps: PhaseStats) => ps.energyCount > 0 ? (ps.energySum / ps.energyCount).toFixed(1) : '—',
      getNum: (ps: PhaseStats) => ps.energyCount > 0 ? ps.energySum / ps.energyCount : null,
      goodLow: false,
    },
    {
      label: 'Sommeil moy. (h)',
      getValue: (ps: PhaseStats) => ps.sleepCount > 0 ? (ps.sleepSum / ps.sleepCount).toFixed(1) : '—',
      getNum: (ps: PhaseStats) => ps.sleepCount > 0 ? ps.sleepSum / ps.sleepCount : null,
      goodLow: false,
    },
    {
      label: 'HRV moy.',
      getValue: (ps: PhaseStats) => ps.hrvCount > 0 ? Math.round(ps.hrvSum / ps.hrvCount).toString() : '—',
      getNum: (ps: PhaseStats) => ps.hrvCount > 0 ? ps.hrvSum / ps.hrvCount : null,
      goodLow: false,
    },
    {
      label: '% Ballonnements',
      getValue: (ps: PhaseStats) => ps.count > 0 ? `${Math.round((ps.bloatingCount / ps.count) * 100)}%` : '—',
      getNum: (ps: PhaseStats) => ps.count > 0 ? (ps.bloatingCount / ps.count) * 100 : null,
      goodLow: true,
    },
    {
      label: '% Fatigue',
      getValue: (ps: PhaseStats) => ps.count > 0 ? `${Math.round((ps.fatigueCount / ps.count) * 100)}%` : '—',
      getNum: (ps: PhaseStats) => ps.count > 0 ? (ps.fatigueCount / ps.count) * 100 : null,
      goodLow: true,
    },
    {
      label: '% Crampes',
      getValue: (ps: PhaseStats) => ps.count > 0 ? `${Math.round((ps.crampsCount / ps.count) * 100)}%` : '—',
      getNum: (ps: PhaseStats) => ps.count > 0 ? (ps.crampsCount / ps.count) * 100 : null,
      goodLow: true,
    },
    {
      label: '% Sautes humeur',
      getValue: (ps: PhaseStats) => ps.count > 0 ? `${Math.round((ps.moodSwingsCount / ps.count) * 100)}%` : '—',
      getNum: (ps: PhaseStats) => ps.count > 0 ? (ps.moodSwingsCount / ps.count) * 100 : null,
      goodLow: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-stone">Indicateur</th>
            {PHASE_ORDER.map((phase) => {
              const meta = CYCLE_PHASES[phase];
              return (
                <th key={phase} className="px-3 py-2 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                    <span className="text-[10px] font-medium text-stone">{meta.label}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/5">
              <td className="px-3 py-2 font-medium text-stone">{row.label}</td>
              {PHASE_ORDER.map((phase) => {
                const ps = stats[phase];
                const val = row.getValue(ps);
                const num = row.getNum(ps);
                const colorClass = num !== null ? cellColor(num, row.goodLow) : '';
                return (
                  <td key={phase} className={`px-3 py-2 text-center font-medium ${colorClass}`}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Row: total days */}
          <tr className="border-t border-black/10">
            <td className="px-3 py-2 font-medium text-stone">Jours de données</td>
            {PHASE_ORDER.map((phase) => (
              <td key={phase} className="px-3 py-2 text-center text-stone">
                {stats[phase].count}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
