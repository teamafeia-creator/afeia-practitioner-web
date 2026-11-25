'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { CycleEntry, CycleProfile } from '@/lib/types';
import { SYMPTOM_LABELS } from '@/lib/cycle-constants';
import {
  addDays,
  dayInfo,
  entrySymptoms,
  flowLevel,
  painLevel,
  previewPeriodNote,
  FLOW_LEVEL_LABELS,
  PAIN_LABELS,
  PHASE4_LABELS,
  type Cycle,
  type Durations,
} from '@/lib/cycle/engine';
import type { CycleSettingsInput, PeriodNoteInput } from '@/lib/queries/cycle';
import { PHASE_UI, deName, fmtLong, fmtShort } from './cycle-ui';

/* ---------- pastilles ---------- */

function Pill({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('rounded-full border px-3 text-[13px] transition', small ? 'h-8 text-xs' : 'h-9', on ? 'border-sage bg-sage-light text-sage-dark' : 'border-divider bg-transparent text-charcoal hover:bg-cream')}
    >
      {children}
    </button>
  );
}

const inputCls = 'h-[42px] w-full rounded-[10px] border border-divider bg-surface px-3 text-sm text-charcoal focus:border-sage focus:outline-none';

/* ---------- Détail du jour ---------- */

export function DayModal({
  date,
  cycles,
  durations,
  entries,
  today,
  firstName,
  phasesOff,
  onClose,
  onNavigate,
  onOpenJournal,
  onFixPeriod,
}: {
  date: string;
  cycles: Cycle[];
  durations: Durations;
  entries: CycleEntry[];
  today: string;
  firstName: string;
  phasesOff: boolean;
  onClose: () => void;
  onNavigate: (date: string) => void;
  onOpenJournal: (date: string) => void;
  onFixPeriod: (start: string) => void;
}) {
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const info = dayInfo(date, cycles, durations, byDate, today);
  const e = info.entry;
  const declared = e?.is_period === true;
  const phase = phasesOff ? (declared ? 'menstrual' : null) : info.phase;
  const fl = e ? flowLevel(e) : 0;
  const pl = e ? painLevel(e.period_pain) : 0;
  const syms = e ? entrySymptoms(e) : [];
  const extra = Object.entries(e?.extra_criteria ?? {});
  const future = date > today;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft') onNavigate(addDays(date, -1));
      if (ev.key === 'ArrowRight' && !(addDays(date, 1) > today)) onNavigate(addDays(date, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [date, today, onNavigate]);

  const rows: { l: string; v: string; hi?: boolean; muted?: boolean }[] = [
    // « Non » tant que la consultante n'a pas déclaré ses règles ce jour-là.
    { l: 'Règles', v: declared ? 'Oui' : 'Non', hi: declared },
    { l: 'Flux', v: declared ? (e?.flow_intensity === 'other' ? e.flow_details || 'Autre' : fl ? FLOW_LEVEL_LABELS[fl] : '—') : '—' },
    { l: 'Intensité de la douleur', v: e ? PAIN_LABELS[pl] : '—', hi: pl >= 2 },
    { l: 'Symptômes', v: e ? (syms.length ? syms.map((k) => SYMPTOM_LABELS[k]).join(', ') : 'Aucun') : '—', hi: syms.length > 0 },
    { l: 'Température (facultatif)', v: e?.temperature != null ? `${Number(e.temperature).toFixed(1).replace('.', ',')} °C` : 'Non renseignée', muted: e?.temperature == null },
    ...extra.map(([l, v]) => ({ l, v: v || '—' })),
  ];

  return (
    <Modal isOpen onClose={onClose} title={fmtLong(date)} size="md">
      <div className="flex flex-col gap-3">
        {phase ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-stone">
            <span className="h-[10px] w-[10px] rounded-[3px] border" style={{ background: PHASE_UI[phase].bg, borderColor: PHASE_UI[phase].border }} />
            {PHASE4_LABELS[phase]}{info.cycleDay ? ` · J${info.cycleDay} du cycle` : ''}{info.estimated ? ' (estimé)' : ''}
          </span>
        ) : null}
        <span className="text-xs text-stone">Saisi par {firstName} dans son app</span>
        {!declared && phase === 'menstrual' ? (
          <span className="rounded-lg bg-cream px-3 py-2 text-xs text-charcoal">Règles prévues autour de ce jour : elles restent à « Non » tant que {firstName} ne les a pas déclarées.</span>
        ) : null}
        {!e && !future ? <span className="text-[13px] text-stone">Rien de noté ce jour-là.</span> : null}
        {future ? <span className="text-[13px] text-stone">Jour à venir.</span> : null}
        <div>
          {rows.map((r) => (
            <div key={r.l} className="flex items-baseline justify-between gap-3 border-t border-divider py-2 text-sm">
              <span className="flex-none text-stone">{r.l}</span>
              <span className={cn('text-right', r.hi ? 'font-medium text-[#F0C2D8]' : r.muted ? 'text-stone' : 'text-charcoal')}>{r.v}</span>
            </div>
          ))}
        </div>
        {e?.notes ? (
          <p className="rounded-[10px] bg-cream px-3 py-2 text-[13px] leading-relaxed text-charcoal">
            « {e.notes} »<br /><span className="text-xs text-stone">Journal {deName(firstName)}</span>
          </p>
        ) : null}
        {e?.practitioner_note ? (
          <p className="rounded-[10px] border border-dashed border-divider px-3 py-2 text-[13px] leading-relaxed text-charcoal">
            {e.practitioner_note}<br /><span className="text-xs text-stone">Votre note, visible par vous seulement</span>
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => onOpenJournal(date)} className="self-start text-[13px] text-sage hover:text-sage-dark">Ouvrir le journal de ce jour →</button>
          {info.cycleDay === 1 && !info.estimated ? (
            <button type="button" onClick={() => onFixPeriod(date)} className="self-start text-[13px] text-sage hover:text-sage-dark">Corriger cette date de règles</button>
          ) : null}
        </div>
        <div className="flex justify-between gap-2 border-t border-divider pt-3">
          <Button variant="outline" size="sm" onClick={() => onNavigate(addDays(date, -1))}>‹ Jour précédent</Button>
          <Button variant="outline" size="sm" disabled={addDays(date, 1) > today} onClick={() => onNavigate(addDays(date, 1))}>Jour suivant ›</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Noter des règles ---------- */

const CRITERIA: Record<string, string[]> = {
  Douleurs: ['Aucune', 'Légères', 'Fortes'],
  Caillots: ['Non', 'Oui'],
  Couleur: ['Rouge vif', 'Foncée', 'Brune'],
  'Saignements entre les règles': ['Non', 'Oui'],
};
const FLOWS: { k: NonNullable<PeriodNoteInput['flow']>; l: string }[] = [
  { k: 'light', l: 'Légères' },
  { k: 'medium', l: 'Moyennes' },
  { k: 'heavy', l: 'Abondantes' },
  { k: 'other', l: 'Autre' },
];

export function NotePeriodModal({
  cycles,
  today,
  firstName,
  fixing,
  onClose,
  onSave,
}: {
  cycles: Cycle[];
  today: string;
  firstName: string;
  /** Correction d'une date existante : ancien J1 et fin des règles connues. */
  fixing: { start: string; end: string; flow: PeriodNoteInput['flow'] } | null;
  onClose: () => void;
  onSave: (input: PeriodNoteInput) => Promise<void>;
}) {
  const [start, setStart] = useState(fixing?.start ?? '');
  const [end, setEnd] = useState(fixing?.end ?? '');
  const [flow, setFlow] = useState<PeriodNoteInput['flow']>(fixing?.flow ?? null);
  const [flowTxt, setFlowTxt] = useState('');
  const [crit, setCrit] = useState<{ l: string; v: string }[]>([]);
  const [critNew, setCritNew] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const errs: string[] = [];
  let startErr = '';
  let endErr = '';
  if (!start) { startErr = 'Indiquez le premier jour.'; errs.push('indiquer le premier jour des règles'); }
  else if (start > today) { startErr = 'La date ne peut pas être dans le futur.'; errs.push('choisir une date passée'); }
  if (end && start && end < start) { endErr = 'Le dernier jour doit suivre le premier.'; errs.push('corriger le dernier jour'); }
  const preview = start && !startErr ? previewPeriodNote(start, end && !endErr ? end : null, cycles, fixing?.start ?? null) : 'Indiquez le premier jour pour voir l’effet sur les phases.';
  const suggestions = Object.keys(CRITERIA).filter((l) => !crit.some((c) => c.l === l));

  async function save() {
    if (errs.length) { setTried(true); return; }
    setBusy(true);
    try {
      const criteria: Record<string, string> = {};
      for (const c of crit) if (c.v.trim()) criteria[c.l] = c.v.trim();
      await onSave({ start, end: end || null, flow, flowDetails: flow === 'other' ? flowTxt : null, criteria, note: note || null, fixingStart: fixing?.start ?? null });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={fixing ? 'Corriger la date de règles' : 'Noter des règles'} size="md">
      <div className="flex flex-col gap-4">
        <span className="-mt-2 text-[13px] text-stone">Par exemple une date donnée par {firstName} en séance. Elle la verra dans son app.</span>
        {tried && errs.length ? <div role="alert" className="rounded-[10px] border border-gold/50 bg-gold/10 px-3 py-2 text-[13px] text-charcoal">Pour enregistrer, il reste à : {errs.join(', ')}.</div> : null}
        <div className="flex gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px] text-stone">
            <span className="whitespace-nowrap">Premier jour des règles</span>
            <input type="date" value={start} max={today} onChange={(ev) => setStart(ev.target.value)} className={cn(inputCls, tried && startErr && 'border-gold')} />
            {tried && startErr ? <span className="text-xs text-terracotta">{startErr}</span> : null}
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px] text-stone">
            <span className="whitespace-nowrap">Dernier jour <span className="text-stone/70">(facultatif)</span></span>
            <input type="date" value={end} max={today} onChange={(ev) => setEnd(ev.target.value)} className={cn(inputCls, tried && endErr && 'border-gold')} />
            {tried && endErr ? <span className="text-xs text-terracotta">{endErr}</span> : null}
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-stone">Abondance <span className="text-stone/70">(facultatif)</span></span>
          <div role="group" aria-label="Abondance" className="flex flex-wrap gap-1.5">
            {FLOWS.map((f) => (
              <Pill key={f.k} on={flow === f.k} onClick={() => setFlow(flow === f.k ? null : f.k)}>{f.l}</Pill>
            ))}
          </div>
          {flow === 'other' ? <input type="text" value={flowTxt} onChange={(ev) => setFlowTxt(ev.target.value)} placeholder="Précisez : très abondantes la nuit, spotting, variable selon les jours…" aria-label="Préciser l’abondance" className={cn(inputCls, 'h-[38px]')} /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Autres critères <span className="text-stone/70">(facultatif)</span></span>
          {crit.map((c, i) => (
            <div key={c.l} className="flex items-center gap-2">
              <span className="w-[150px] flex-none text-[13px] text-charcoal">{c.l}</span>
              <div role="group" aria-label={c.l} className="flex flex-1 flex-wrap gap-1.5">
                {(CRITERIA[c.l] ?? []).map((o) => (
                  <Pill key={o} small on={c.v === o} onClick={() => setCrit(crit.map((x, j) => (j === i ? { ...x, v: x.v === o ? '' : o } : x)))}>{o}</Pill>
                ))}
                {!CRITERIA[c.l] ? <input type="text" aria-label={`Valeur : ${c.l}`} value={c.v} onChange={(ev) => setCrit(crit.map((x, j) => (j === i ? { ...x, v: ev.target.value } : x)))} placeholder="Valeur" className={cn(inputCls, 'h-8 min-w-[120px] flex-1 text-[13px]')} /> : null}
              </div>
              <button type="button" onClick={() => setCrit(crit.filter((_, j) => j !== i))} aria-label={`Retirer le critère ${c.l}`} className="h-[30px] w-[30px] rounded-lg text-stone hover:bg-cream">×</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-1.5">
            {suggestions.map((l) => (
              <button key={l} type="button" onClick={() => setCrit([...crit, { l, v: '' }])} className="h-8 rounded-full border border-dashed border-divider px-3 text-xs text-charcoal hover:bg-cream">＋ {l}</button>
            ))}
            <input type="text" aria-label="Autre critère" value={critNew} onChange={(ev) => setCritNew(ev.target.value)} placeholder="Autre critère…" className={cn(inputCls, 'h-8 w-[150px] text-xs')} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const l = critNew.trim();
                if (!l || crit.some((c) => c.l.toLowerCase() === l.toLowerCase())) return;
                setCrit([...crit, { l, v: '' }]);
                setCritNew('');
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          <span>Note <span className="text-stone/70">(facultatif, visible par vous seulement)</span></span>
          <input type="text" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="ex. date donnée en séance, à confirmer" className={inputCls} />
        </label>
        <div className="rounded-[10px] bg-cream px-3 py-2 text-[13px] leading-relaxed text-charcoal">{preview}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save} loading={busy}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Réglages du cycle ---------- */

const CONTRA: { k: CycleSettingsInput['contraception']; l: string }[] = [
  { k: 'aucune', l: 'Aucune' },
  { k: 'pilule', l: 'Pilule' },
  { k: 'sterilet', l: 'Stérilet hormonal' },
  { k: 'implant', l: 'Implant' },
  { k: 'autre', l: 'Autre' },
];
const SITU: { k: CycleSettingsInput['situation']; l: string }[] = [
  { k: 'aucune', l: 'Aucune' },
  { k: 'grossesse', l: 'Grossesse' },
  { k: 'allaitement', l: 'Allaitement' },
  { k: 'perimenopause', l: 'Périménopause' },
  { k: 'autre', l: 'Autre' },
];

export function CycleSettingsModal({
  profile,
  durations,
  mode,
  firstName,
  onClose,
  onSave,
  onStop,
  onRestart,
}: {
  profile: CycleProfile | null;
  durations: Durations;
  mode: 'off' | 'waiting' | 'on' | 'paused';
  firstName: string;
  onClose: () => void;
  onSave: (s: CycleSettingsInput) => Promise<void>;
  onStop: () => Promise<void>;
  onRestart: () => Promise<void>;
}) {
  const known = (v: string | null | undefined): CycleSettingsInput['contraception'] => (['aucune', 'pilule', 'sterilet', 'implant', 'autre'].includes(v ?? '') ? (v as CycleSettingsInput['contraception']) : v ? 'autre' : 'aucune');
  const [s, setS] = useState<CycleSettingsInput>({
    contraception: known(profile?.contraception),
    contraceptionDetails: profile?.contraception_details ?? (profile?.contraception && !['aucune', 'pilule', 'sterilet', 'implant', 'autre'].includes(profile.contraception) ? profile.contraception : ''),
    cycleLengthManual: profile?.cycle_length_manual ?? false,
    cycleLength: profile?.average_cycle_length ?? durations.cycleLength,
    periodLengthManual: profile?.period_length_manual ?? false,
    periodLength: profile?.average_period_length ?? durations.periodLength,
    situation: profile?.situation ?? 'aucune',
    situationDetails: profile?.situation_details ?? '',
  });
  const [stopAsk, setStopAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  const trackHint =
    mode === 'off'
      ? `C’est ${firstName} qui l’active dans son app.`
      : mode === 'paused'
        ? `Désactivé${profile?.tracking_paused_at ? ` le ${fmtShort(profile.tracking_paused_at.slice(0, 10))}` : ''}. Ses données sont conservées.`
        : `Activé${profile?.tracking_activated_by === 'consultant' ? ` par ${firstName}` : ''}${profile?.tracking_activated_at ? ` le ${fmtShort(profile.tracking_activated_at.slice(0, 10))}` : ''}. Vous ou elle pouvez l’arrêter.`;

  const samples = (xs: number[]) => (xs.length ? `(${xs.join(', ')} jours)` : '');
  const Duration = ({ label, manualKey, valueKey, auto, min, max, hint }: { label: string; manualKey: 'cycleLengthManual' | 'periodLengthManual'; valueKey: 'cycleLength' | 'periodLength'; auto: number; min: number; max: number; hint: string }) => {
    const manual = s[manualKey];
    return (
      <div className="flex min-w-[240px] flex-1 flex-col gap-2 rounded-xl border border-divider px-3 py-3">
        <span className="text-[13px] text-stone">{label}</span>
        <div role="group" aria-label={label} className="flex gap-1.5">
          <button type="button" aria-pressed={!manual} onClick={() => setS({ ...s, [manualKey]: false })} className={cn('h-[34px] flex-1 rounded-lg border text-[13px]', !manual ? 'border-sage bg-sage-light text-sage-dark' : 'border-divider text-charcoal hover:bg-cream')}>Calculée · {auto} j</button>
          <button type="button" aria-pressed={manual} onClick={() => setS({ ...s, [manualKey]: true })} className={cn('h-[34px] flex-1 rounded-lg border text-[13px]', manual ? 'border-sage bg-sage-light text-sage-dark' : 'border-divider text-charcoal hover:bg-cream')}>Saisie à la main</button>
        </div>
        {manual ? (
          <label className="flex items-center gap-2 text-[13px] text-stone">
            <input type="number" min={min} max={max} value={s[valueKey]} onChange={(ev) => setS({ ...s, [valueKey]: Number(ev.target.value) || 0 })} className={cn(inputCls, 'h-9 w-20')} /> jours
          </label>
        ) : null}
        <span className="text-xs text-stone">{hint}</span>
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={`Réglages du cycle ${deName(firstName)}`} size="lg">
      <div className="flex flex-col gap-4">
        <span className="-mt-2 text-[13px] text-stone">Ces informations servent à estimer les phases. {firstName} les voit et peut les modifier dans son app.</span>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-3">
          <span className="flex flex-col gap-0.5"><span className="text-sm font-medium text-charcoal">Suivi du cycle</span><span className="text-xs text-stone">{trackHint}</span></span>
          <span className="inline-flex items-center gap-3">
            <span className={cn('text-[13px]', mode === 'on' || mode === 'waiting' ? 'text-sage-dark' : 'text-stone')}>{mode === 'off' ? 'Non activé' : mode === 'paused' ? 'Désactivé' : 'Activé'}</span>
            {(mode === 'on' || mode === 'waiting') && !stopAsk ? <Button variant="outline" size="sm" onClick={() => setStopAsk(true)}>Désactiver</Button> : null}
            {mode === 'paused' ? <Button variant="primary" size="sm" onClick={async () => { setBusy(true); try { await onRestart(); } finally { setBusy(false); } }} loading={busy}>Réactiver</Button> : null}
          </span>
        </div>
        {stopAsk ? (
          <div role="alertdialog" aria-label="Désactiver le suivi du cycle" className="flex flex-col gap-2 rounded-xl border border-rose/40 bg-rose/5 p-3">
            <span className="text-sm font-semibold text-charcoal">Désactiver le suivi du cycle {deName(firstName)} ?</span>
            <span className="text-[13px] leading-relaxed text-charcoal">Le calendrier, les phases et les estimations ne s’afficheront plus, ici comme dans son app. Ses données sont conservées et réapparaîtront si le suivi est réactivé. {firstName} sera prévenue.</span>
            <span className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStopAsk(false)}>Garder le suivi</Button>
              <Button variant="destructive" size="sm" loading={busy} onClick={async () => { setBusy(true); try { await onStop(); } finally { setBusy(false); } }}>Désactiver le suivi</Button>
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Contraception hormonale</span>
          <div role="group" aria-label="Contraception hormonale" className="flex flex-wrap gap-1.5">
            {CONTRA.map((o) => <Pill key={o.k} on={s.contraception === o.k} onClick={() => setS({ ...s, contraception: o.k })}>{o.l}</Pill>)}
          </div>
          {s.contraception === 'autre' ? <input type="text" value={s.contraceptionDetails ?? ''} onChange={(ev) => setS({ ...s, contraceptionDetails: ev.target.value })} placeholder="Précisez : anneau, patch, pilule progestative…" aria-label="Préciser la contraception" className={cn(inputCls, 'h-[38px]')} /> : null}
          {s.contraception !== 'aucune' ? <span className="text-xs text-stone">Avec une contraception hormonale, les phases sont indicatives et les variations souvent atténuées.</span> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Duration label="Durée moyenne du cycle" manualKey="cycleLengthManual" valueKey="cycleLength" auto={durations.cycleSamples.length ? Math.round(durations.cycleSamples.reduce((a, b) => a + b, 0) / durations.cycleSamples.length) : 28} min={21} max={45} hint={durations.cycleSamples.length ? `Calculée sur les ${durations.cycleSamples.length} dernier${durations.cycleSamples.length > 1 ? 's' : ''} cycle${durations.cycleSamples.length > 1 ? 's' : ''} complet${durations.cycleSamples.length > 1 ? 's' : ''} ${samples(durations.cycleSamples)}.` : 'Pas encore de cycle complet : 28 jours par défaut.'} />
          <Duration label="Durée des règles" manualKey="periodLengthManual" valueKey="periodLength" auto={durations.periodSamples.length ? Math.round(durations.periodSamples.reduce((a, b) => a + b, 0) / durations.periodSamples.length) : 5} min={2} max={10} hint={durations.periodSamples.length ? `Calculée sur les ${durations.periodSamples.length} dernier${durations.periodSamples.length > 1 ? 's' : ''} cycle${durations.periodSamples.length > 1 ? 's' : ''} ${samples(durations.periodSamples)}.` : 'Pas encore de règles notées : 5 jours par défaut.'} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Situation particulière</span>
          <div role="group" aria-label="Situation particulière" className="flex flex-wrap gap-1.5">
            {SITU.map((o) => <Pill key={o.k} on={s.situation === o.k} onClick={() => setS({ ...s, situation: o.k })}>{o.l}</Pill>)}
          </div>
          {s.situation === 'autre' ? <input type="text" value={s.situationDetails ?? ''} onChange={(ev) => setS({ ...s, situationDetails: ev.target.value })} placeholder="Précisez : post-partum, arrêt récent de la pilule…" aria-label="Préciser la situation" className={cn(inputCls, 'h-[38px]')} /> : null}
          {s.situation !== 'aucune' ? <span className="text-xs text-gold">{s.situation === 'autre' ? 'Le suivi continue normalement ; votre précision reste visible dans les réglages.' : 'Le suivi est mis en pause : pas de phases estimées ni de prochaines règles affichées.'}</span> : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await onSave(s); } finally { setBusy(false); } }}>Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}
