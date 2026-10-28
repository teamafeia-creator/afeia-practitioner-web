'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type Tone = 'mint' | 'warm' | 'blue' | 'pink';

export interface StatTile {
  label: string;
  value: string;
  /** Pastille à droite du titre (ratio, détail). */
  pill?: string;
  pillTone?: 'up' | 'down' | 'flat';
  icon: string;
  tone: Tone;
  /** Série brute pour la courbe ; absente = pas de courbe. */
  series?: number[];
}

export interface StatCategory {
  label: string;
  tiles: StatTile[];
}

export interface PeriodOption<K extends string> {
  key: K;
  label: string;
  title: string;
}

export const ICONS = {
  cal: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  loop: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  book: 'M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  share: 'M4 12v8h16v-8M16 6l-4-4-4 4M12 2v13',
  check: 'M20 6L9 17l-5-5',
  msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  ring: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2',
} as const;

const TONES: Record<Tone, [string, string]> = {
  mint: ['#23383B', '#6DD4B8'],
  warm: ['#373131', '#E8A87C'],
  blue: ['#1F2640', '#A9B8EC'],
  pink: ['#3A2733', '#F0C2D8'],
};

const PILL: Record<'up' | 'down' | 'flat', [string, string]> = {
  up: ['#23383B', '#6DD4B8'],
  down: ['#373131', '#E8A87C'],
  flat: ['#1C2230', '#8B95A5'],
};

function sparkPaths(series: number[]) {
  const n = series.length;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1;
  const pts = series.map((v, i) => `${Math.round((i / (n - 1)) * 200)},${Math.round(36 - ((v - lo) / span) * 32)}`);
  const line = pts.join(' ');
  return { line, area: `0,40 ${line} 200,40` };
}

export function StatsCarousel<K extends string>({
  categories,
  periods,
  period,
  onPeriod,
  loading,
}: {
  categories: StatCategory[];
  periods: PeriodOption<K>[];
  period: K;
  onPeriod: (k: K) => void;
  loading?: boolean;
}) {
  const [cat, setCat] = useState(0);
  const N = categories.length;
  const current = categories[cat];
  const go = (i: number) => setCat((i + N) % N);
  const periodTitle = periods.find((p) => p.key === period)?.title ?? '';

  return (
    <section aria-label="Statistiques" className="flex flex-col gap-3.5 pt-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <h2 className="text-lg font-semibold text-charcoal">{periodTitle} · {current.label}</h2>
        <span className="text-[13px] text-stone">{cat + 1} / {N}</span>
        <span className="flex-1" />
        <div role="group" aria-label="Période" className="flex gap-0.5 rounded-[10px] border border-divider bg-surface p-[3px]">
          {periods.map((p) => {
            const on = p.key === period;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => onPeriod(p.key)}
                className={`h-[34px] rounded-lg px-3 text-[13px] font-medium ${on ? 'bg-sage-light text-sage' : 'text-charcoal hover:text-sage'}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => go(cat - 1)}
            aria-label={`Catégorie précédente : ${categories[(cat - 1 + N) % N].label}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface text-charcoal hover:border-sage"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(cat + 1)}
            aria-label={`Catégorie suivante : ${categories[(cat + 1) % N].label}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface text-charcoal hover:border-sage"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading} className="grid grid-cols-[repeat(auto-fit,minmax(max(240px,calc((100%-32px)/3)),1fr))] gap-4">
        {current.tiles.map((k) => {
          const [tint, c] = TONES[k.tone];
          const spark = k.series && k.series.length >= 2 ? sparkPaths(k.series) : null;
          const pill = PILL[k.pillTone ?? 'flat'];
          return (
            <div key={k.label} className="relative flex min-h-[168px] flex-col gap-3.5 overflow-hidden rounded-[18px] border border-divider bg-surface px-[22px] py-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]" style={{ background: tint, color: c }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={k.icon} />
                  </svg>
                </span>
                <span className="flex-1 text-sm text-[#C9CFDA]">{k.label}</span>
                {k.pill && (
                  <span className="whitespace-nowrap rounded-full px-[9px] py-[3px] text-xs font-semibold" style={{ background: pill[0], color: pill[1] }}>
                    {k.pill}
                  </span>
                )}
              </div>
              <span className={`font-serif text-[38px] font-medium leading-none tracking-[-0.01em] tabular-nums ${loading ? 'opacity-50' : ''}`}>{k.value}</span>
              {spark && (
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" width="100%" height="40" aria-hidden="true" className="mt-auto block">
                  <polygon points={spark.area} fill={c} opacity="0.10" />
                  <polyline points={spark.line} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5">
        {categories.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => go(i)}
            aria-label={c.label}
            aria-current={i === cat ? 'true' : undefined}
            className="h-2 rounded transition-[width] duration-200"
            style={{ width: i === cat ? 22 : 8, background: i === cat ? '#6DD4B8' : '#2A3140' }}
          />
        ))}
      </div>
    </section>
  );
}
