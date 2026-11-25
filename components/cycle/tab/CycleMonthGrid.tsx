'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CycleEntry } from '@/lib/types';
import { dayInfo, entrySymptoms, flowLevel, painLevel, PAIN_LABELS, FLOW_LEVEL_LABELS, type Cycle, type Durations } from '@/lib/cycle/engine';
import { SYMPTOM_LABELS } from '@/lib/cycle-constants';
import { FLOW_COLOR, PAIN_COLOR, PHASE_UI, SYMPTOM_SHORT, fmtMonth } from './cycle-ui';

const DOW = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

export function FlowDrops({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span aria-hidden className="inline-flex gap-[2px]">
      {[1, 2, 3].map((k) => (
        <span key={k} className="h-[6px] w-[6px] rounded-full border" style={{ borderColor: FLOW_COLOR, background: k <= level ? FLOW_COLOR : 'transparent' }} />
      ))}
    </span>
  );
}

export function PainBars({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span aria-hidden className="inline-flex items-end gap-[1px]">
      {[1, 2, 3].map((k) => (
        <span key={k} className="w-[3px] rounded-[1px]" style={{ height: 3 + k * 2, background: k <= level ? (level === 3 ? PAIN_COLOR.strong : PAIN_COLOR.light) : PAIN_COLOR.off }} />
      ))}
    </span>
  );
}

export function CycleMonthGrid({
  year,
  month0,
  cycles,
  durations,
  entries,
  today,
  selected,
  phasesOff,
  firstName,
  onMonth,
  onPick,
}: {
  year: number;
  month0: number;
  cycles: Cycle[];
  durations: Durations;
  entries: CycleEntry[];
  today: string;
  selected: string | null;
  /** Situation particulière : pas de phases estimées, seulement les saisies. */
  phasesOff: boolean;
  firstName: string;
  onMonth: (delta: number) => void;
  onPick: (date: string) => void;
}) {
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month0, 1));
    const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
    const len = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    const out: (null | ReturnType<typeof cell>)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= len; d++) out.push(cell(`${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
    while (out.length % 7) out.push(null);
    return out;

    function cell(date: string) {
      const info = dayInfo(date, cycles, durations, byDate, today);
      const e = info.entry;
      const phase = phasesOff ? (e?.is_period ? 'menstrual' : null) : info.phase;
      const fl = e ? flowLevel(e) : 0;
      const pl = e ? painLevel(e.period_pain) : 0;
      const syms = e ? entrySymptoms(e) : [];
      const isToday = date === today;
      const future = date > today;
      const noted = !!e;
      const titleParts = [
        phase ? `${PHASE_UI[phase].label}${info.cycleDay ? ` · J${info.cycleDay}` : ''}${info.estimated ? ' (estimé)' : ''}` : '',
        fl ? `flux ${FLOW_LEVEL_LABELS[fl].toLowerCase()}` : '',
        pl ? `douleur ${PAIN_LABELS[pl].toLowerCase()}` : '',
        syms.length ? syms.map((k) => SYMPTOM_LABELS[k].toLowerCase()).join(', ') : '',
        e?.temperature != null ? `${Number(e.temperature).toFixed(1).replace('.', ',')} °C` : '',
      ].filter(Boolean);
      return {
        date,
        n: +date.slice(8, 10),
        phase,
        estimated: info.estimated,
        cycleDay: info.cycleDay,
        isToday,
        future,
        noted,
        fl,
        pl,
        sym: syms.length ? `${SYMPTOM_SHORT[syms[0]] ?? syms[0]}${syms.length > 1 ? ` +${syms.length - 1}` : ''}` : !noted && !future && info.cycleDay ? 'rien noté' : info.cycleDay === 1 && !info.estimated ? 'J1' : '',
        hasSym: syms.length > 0,
        temp: e?.temperature != null ? `${Number(e.temperature).toFixed(1).replace('.', ',')}°` : '',
        title: titleParts.length ? titleParts.join(' · ') : future ? '' : 'rien noté',
      };
    }
  }, [year, month0, cycles, durations, byDate, today, phasesOff]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onMonth(-1)} aria-label="Mois précédent" className="flex h-9 w-9 items-center justify-center rounded-lg border border-divider text-charcoal hover:bg-cream">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="min-w-[150px] text-center text-base font-semibold text-charcoal">{fmtMonth(year, month0)}</h3>
        <button type="button" onClick={() => onMonth(1)} aria-label="Mois suivant" className="flex h-9 w-9 items-center justify-center rounded-lg border border-divider text-charcoal hover:bg-cream">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((w) => (
          <span key={w} className="py-1 text-center text-xs text-stone">{w}</span>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <span key={`b${i}`} aria-hidden className="min-h-[74px]" />
          ) : (
            <button
              key={c.date}
              type="button"
              title={c.title}
              aria-label={`${c.n} : ${c.title || 'rien'}`}
              aria-pressed={selected === c.date}
              onClick={() => onPick(c.date)}
              className={cn('flex min-h-[74px] flex-col gap-1 rounded-lg border p-[6px] text-left transition', selected === c.date ? 'border-2 border-charcoal' : c.isToday ? 'border-2 border-sage' : '')}
              style={{
                background: c.phase ? PHASE_UI[c.phase].bg : 'transparent',
                borderColor: selected === c.date ? undefined : c.isToday ? undefined : c.estimated && c.phase ? PHASE_UI[c.phase].border : 'transparent',
                borderStyle: c.estimated && !c.isToday && selected !== c.date ? 'dashed' : 'solid',
              }}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className={cn('text-xs font-semibold', c.isToday ? 'text-sage' : 'text-charcoal')}>{c.n}</span>
                {c.temp ? <span className="text-[10px] text-stone">{c.temp}</span> : null}
              </span>
              <span className="flex min-h-[10px] items-end gap-[6px]">
                <FlowDrops level={c.fl} />
                <PainBars level={c.pl} />
              </span>
              <span className={cn('text-[10px] leading-tight', c.hasSym ? 'text-[#F0C2D8]' : 'text-mist')}>{c.sym}</span>
            </button>
          )
        )}
      </div>
      <span className="text-xs text-stone">Tout vient de ce que {firstName} saisit dans son app. Cliquez sur un jour pour voir le détail.</span>
    </div>
  );
}

export function CycleLegend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const Row = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <span className="flex items-center gap-2"><span className="inline-flex w-[26px] flex-none justify-center">{icon}</span>{label}</span>
  );
  const Swatch = ({ bg, border, dashed }: { bg: string; border: string; dashed?: boolean }) => (
    <span className="h-[15px] w-[22px] rounded border-[1.5px]" style={{ background: bg, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' }} />
  );
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone">{title}</span>
      {children}
    </div>
  );
  const toggle = (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? 'Replier la légende' : 'Afficher la légende'} title={open ? 'Replier la légende' : 'Afficher la légende'} className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-divider text-charcoal hover:bg-cream">
      {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
  if (!open) {
    return (
      <aside aria-label="Légende du calendrier, repliée" className="flex w-12 flex-none flex-col items-center gap-3 rounded-2xl border border-divider bg-surface py-3">
        {toggle}
        <span className="text-[13px] font-semibold tracking-wide text-stone" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Légende</span>
      </aside>
    );
  }
  return (
    <aside aria-label="Légende du calendrier" className="flex w-[190px] flex-none flex-col gap-4 rounded-2xl border border-divider bg-surface p-4 text-xs text-charcoal">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Légende</h3>{toggle}</div>
      <Group title="Phase">
        {(Object.keys(PHASE_UI) as (keyof typeof PHASE_UI)[]).map((p) => (
          <Row key={p} icon={<Swatch bg={PHASE_UI[p].bg} border={PHASE_UI[p].bg} />} label={PHASE_UI[p].label} />
        ))}
        <Row icon={<Swatch bg={PHASE_UI.follicular.bg} border={PHASE_UI.follicular.border} dashed />} label="Estimé" />
        <Row icon={<Swatch bg="transparent" border="#6DD4B8" />} label="Aujourd’hui" />
      </Group>
      <Group title="Flux">
        <Row icon={<FlowDrops level={1} />} label="Léger" />
        <Row icon={<FlowDrops level={2} />} label="Moyen" />
        <Row icon={<FlowDrops level={3} />} label="Abondant" />
      </Group>
      <Group title="Douleur">
        <Row icon={<PainBars level={1} />} label="Légère" />
        <Row icon={<PainBars level={2} />} label="Modérée" />
        <Row icon={<PainBars level={3} />} label="Forte" />
      </Group>
      <Group title="Aussi dans la case">
        <Row icon={<span className="text-[10px] text-stone">36,3°</span>} label="Température" />
        <Row icon={<span className="text-[10px] text-[#F0C2D8]">+1</span>} label="Autres symptômes" />
      </Group>
    </aside>
  );
}
