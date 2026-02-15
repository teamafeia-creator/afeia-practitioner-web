'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type TransitTimelineProps = {
  data: Array<{ date: string; bristol_type: number }>;
  days?: number;
};

function getBristolColor(type: number): string {
  if (type >= 3 && type <= 4) return 'bg-emerald-500';
  if (type >= 1 && type <= 2) return 'bg-orange-400';
  return 'bg-red-400';
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

export function TransitTimeline({ data, days = 30 }: TransitTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    const today = new Date();
    const result: Array<{ date: string; label: string; bristol_type: number | null }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = data.find((e) => e.date === dateStr);
      result.push({
        date: dateStr,
        label: dateFormatter.format(d),
        bristol_type: entry?.bristol_type ?? null,
      });
    }

    return result;
  }, [data, days]);

  return (
    <div className="relative">
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {points.map((point, i) => (
          <div
            key={point.date}
            className="relative flex flex-col items-center"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={cn(
                'h-3 w-3 rounded-full transition-transform flex-shrink-0',
                point.bristol_type !== null
                  ? getBristolColor(point.bristol_type)
                  : 'bg-gray-200',
                hoveredIndex === i && 'scale-150'
              )}
            />
            {/* Tooltip */}
            {hoveredIndex === i && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                {point.label}
                {point.bristol_type !== null ? ` — Type ${point.bristol_type}` : ' — Pas de donnée'}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-3 mt-1 text-[10px] text-stone">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-400" />
          <span>Constipation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <span>Diarrhée</span>
        </div>
      </div>
    </div>
  );
}
