'use client';

import { useMemo } from 'react';
import type { CycleEntry, CycleProfile, SymptomKey } from '../../lib/types';
import { SYMPTOM_LABELS, SYMPTOM_KEYS, CYCLE_PHASES } from '../../lib/cycle-constants';
import { identifyCycleStarts, getCycleDay, getCyclePhaseForDay } from '../../lib/cycle-utils';

export function SymptomGrid({
  entries,
  cycleProfile,
}: {
  entries: CycleEntry[];
  cycleProfile: CycleProfile;
}) {
  const cycleStarts = useMemo(() => identifyCycleStarts(entries), [entries]);

  // Get the most recent cycle's entries
  const currentCycleEntries = useMemo(() => {
    if (cycleStarts.length === 0) return [];

    const lastStart = cycleStarts[cycleStarts.length - 1];
    const startStr = lastStart.toISOString().slice(0, 10);

    return [...entries]
      .filter((e) => e.date >= startStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, cycleStarts]);

  const lastStart = cycleStarts.length > 0 ? cycleStarts[cycleStarts.length - 1] : null;

  if (currentCycleEntries.length === 0 || !lastStart) {
    return (
      <p className="text-xs text-stone italic">
        Aucune donnée de symptômes pour le cycle en cours.
      </p>
    );
  }

  // Build columns: one per day with data
  const columns = currentCycleEntries.map((entry) => {
    const day = getCycleDay(entry.date, lastStart);
    const phase = getCyclePhaseForDay(day, cycleProfile.average_cycle_length, cycleProfile.average_period_length);
    return { entry, day, phase };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white/90 px-2 py-1 text-left font-medium text-stone min-w-[120px]">
              Symptôme
            </th>
            {columns.map((col) => {
              const meta = CYCLE_PHASES[col.phase];
              return (
                <th
                  key={col.entry.date}
                  className="px-1 py-1 text-center font-normal text-stone min-w-[28px]"
                  title={`${meta.label} — ${col.entry.date}`}
                >
                  <span className="block text-[10px]">J{col.day}</span>
                  <span
                    className={`block mx-auto mt-0.5 h-1 w-4 rounded-full ${meta.dotClass}`}
                    style={{ opacity: 0.5 }}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {SYMPTOM_KEYS.map((symptomKey) => {
            const hasAny = columns.some(
              (col) => col.entry[`symptom_${symptomKey}` as keyof CycleEntry] === true
            );
            if (!hasAny) return null;

            return (
              <tr key={symptomKey} className="border-t border-black/5">
                <td className="sticky left-0 bg-white/90 px-2 py-1 text-stone">
                  {SYMPTOM_LABELS[symptomKey]}
                </td>
                {columns.map((col) => {
                  const active = col.entry[`symptom_${symptomKey}` as keyof CycleEntry] === true;
                  const meta = CYCLE_PHASES[col.phase];
                  return (
                    <td key={col.entry.date} className="px-1 py-1 text-center">
                      {active ? (
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${meta.dotClass}`}
                          style={{ opacity: 0.7 }}
                        />
                      ) : (
                        <span className="inline-block h-3 w-3" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
