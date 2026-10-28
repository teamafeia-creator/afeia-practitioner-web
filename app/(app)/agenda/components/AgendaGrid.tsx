'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

export type AgendaView = 'jour' | 'semaine' | 'liste';

export interface AgendaEvent {
  id: string;
  kind: 'appointment' | 'group';
  start: Date;
  end: Date;
  name: string;
  typeName: string;
  color: string;
  visio: boolean;
  /** Séance passée sans note : à compléter. */
  needsNotes?: boolean;
}

const PX = 56;
const DOW = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function hm(d: Date) {
  const m = d.getMinutes();
  return `${d.getHours()} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

function chip(visio: boolean) {
  return visio ? { label: 'Visio', bg: '#1F2640', fg: '#A9B8EC' } : { label: 'Cabinet', bg: '#23383B', fg: '#6DD4B8' };
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function AgendaGrid({
  view,
  days,
  events,
  selectedId,
  onSelect,
  onOpenDay,
  onSlot,
  loading,
}: {
  view: AgendaView;
  days: Date[];
  events: AgendaEvent[];
  selectedId: string | null;
  onSelect: (e: AgendaEvent) => void;
  onOpenDay: (d: Date) => void;
  onSlot: (d: Date) => void;
  loading?: boolean;
}) {
  const now = useNow();

  if (view === 'liste') {
    return (
      <div className={`flex flex-col ${loading ? 'opacity-60' : ''}`}>
        {days.map((d, i) => {
          const ev = events.filter((e) => sameDay(e.start, d)).sort((a, b) => a.start.getTime() - b.start.getTime());
          const isToday = sameDay(d, now);
          const label = dayFmt.format(d);
          return (
            <div key={d.toISOString()} className={`flex flex-col ${i > 0 ? 'border-t border-divider' : ''}`}>
              <div className="flex items-baseline gap-2.5 px-5 pb-1.5 pt-3.5">
                <span className="text-[15px] font-semibold text-charcoal">{isToday ? `Aujourd’hui · ${label}` : label.charAt(0).toUpperCase() + label.slice(1)}</span>
                {ev.length > 0 && <span className="text-[13px] text-stone">{ev.length} séance{ev.length > 1 ? 's' : ''}</span>}
              </div>
              {ev.map((e) => {
                const c = chip(e.visio);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelect(e)}
                    className={`flex items-center gap-3.5 px-5 py-2.5 text-left text-charcoal ${selectedId === e.id ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'}`}
                  >
                    <span className="w-[92px] flex-none text-sm tabular-nums">{hm(e.start)} – {hm(e.end)}</span>
                    <span className="w-[3px] self-stretch rounded-sm" style={{ background: e.color }} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {e.kind === 'group' && <Users className="h-3.5 w-3.5" aria-hidden="true" />}
                        {e.name}
                      </span>
                      <span className="text-[13px] text-stone">{e.typeName}{e.needsNotes ? ' · notes à compléter' : ''}</span>
                    </span>
                    <span className="rounded-full px-2.5 py-[3px] text-xs font-medium" style={{ background: c.bg, color: c.fg }}>{c.label}</span>
                  </button>
                );
              })}
              {ev.length === 0 && <span className="px-5 pb-3.5 pt-1 text-[13px] text-stone">Aucune séance</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Plage horaire : 8 h – 19 h, élargie si une séance déborde
  const inRange = events.filter((e) => days.some((d) => sameDay(e.start, d)));
  const h0 = Math.min(8, ...inRange.map((e) => e.start.getHours()));
  const h1 = Math.max(19, ...inRange.map((e) => Math.ceil(e.end.getHours() + e.end.getMinutes() / 60)));
  const hours = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
  const height = (h1 - h0) * PX;
  const isDay = view === 'jour';
  const cols = isDay ? '56px minmax(0,1fr)' : '56px repeat(7,minmax(0,1fr))';
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - h0) * PX;

  return (
    <div className={`grid ${isDay ? 'min-w-[320px]' : 'min-w-[720px]'} ${loading ? 'opacity-60' : ''}`} style={{ gridTemplateColumns: cols }}>
      <div className="border-b border-divider" />
      {days.map((d) => {
        const today = sameDay(d, now);
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onOpenDay(d)}
            aria-label={`Voir la journée du ${dayFmt.format(d)}`}
            className="flex flex-col items-center gap-0.5 border-b border-l border-divider py-3 text-charcoal"
          >
            <span className="text-xs uppercase tracking-[0.06em] text-stone">{DOW[(d.getDay() + 6) % 7]}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold"
              style={today ? { background: '#6DD4B8', color: '#0A0E14' } : undefined}
            >
              {d.getDate()}
            </span>
          </button>
        );
      })}

      <div className="relative" style={{ height }}>
        {hours.map((h, i) => (
          <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-stone" style={{ top: i * PX }}>
            {i === 0 ? '' : `${h} h`}
          </span>
        ))}
      </div>
      {days.map((d) => {
        const today = sameDay(d, now);
        const ev = events.filter((e) => sameDay(e.start, d));
        return (
          <div
            key={d.toISOString()}
            className="relative border-l border-divider"
            style={{
              height,
              background: today ? '#171D27' : undefined,
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 55px, #1F2533 55px, #1F2533 56px)',
            }}
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const y = e.nativeEvent.offsetY;
              const halfHours = Math.floor(y / (PX / 2));
              const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h0, 0);
              slot.setMinutes(halfHours * 30);
              onSlot(slot);
            }}
          >
            {ev.map((e) => {
              const top = ((e.start.getHours() + e.start.getMinutes() / 60) - h0) * PX;
              const h = Math.max(24, ((e.end.getTime() - e.start.getTime()) / 3600000) * PX - 4);
              const selected = selectedId === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelect(e)}
                  aria-label={`${e.name}, ${e.typeName}, ${hm(e.start)}`}
                  className="absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded-lg px-2 py-1.5 text-left text-charcoal"
                  style={{
                    top,
                    height: h,
                    background: `${e.color}29`,
                    borderLeft: `3px solid ${e.color}`,
                    outline: selected ? `2px solid ${e.color}` : e.needsNotes ? '1px dashed #E8A87C' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  <span className="flex items-center gap-1 truncate text-xs font-semibold">
                    {e.kind === 'group' && <Users className="h-3 w-3 flex-none" aria-hidden="true" />}
                    {e.name}
                  </span>
                  <span className="truncate text-[11px] text-[#C9CFDA]">{e.typeName}{e.visio ? ' · visio' : ''}</span>
                  {isDay && <span className="text-[11px] text-stone">{hm(e.start)} – {hm(e.end)}</span>}
                </button>
              );
            })}
            {today && nowTop >= 0 && nowTop <= height && (
              <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 h-0.5 bg-[#E57B7B]" style={{ top: nowTop }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
