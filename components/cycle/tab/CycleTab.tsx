'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { CycleEntry, CycleProfile } from '@/lib/types';
import { computeOverview, todayIso, COMPARISON_RULES, PHASE4_LABELS, type Cycle } from '@/lib/cycle/engine';
import { getCycleEntries, getCycleProfile, inviteToCycleTracking, notePeriod, saveCycleSettings, setCycleTracking, type CycleSettingsInput, type PeriodNoteInput } from '@/lib/queries/cycle';
import { CycleMonthGrid, CycleLegend } from './CycleMonthGrid';
import { CycleSettingsModal, DayModal, NotePeriodModal } from './CycleModals';
import { ALERT_UI, LEGEND_KEY, fmtShort } from './cycle-ui';

const REGULARITY: Record<string, string> = { regular: 'régulier', somewhat_irregular: 'plutôt irrégulier', irregular: 'irrégulier', unknown: '' };

export function CycleTab({
  consultantId,
  practitionerId,
  firstName,
  practitionerFirstName,
  profile,
  entries,
  onProfile,
  onEntries,
  onOpenJournal,
  onToast,
}: {
  consultantId: string;
  practitionerId: string;
  firstName: string;
  practitionerFirstName: string;
  profile: CycleProfile | null;
  entries: CycleEntry[];
  onProfile: (p: CycleProfile) => void;
  onEntries: (e: CycleEntry[]) => void;
  onOpenJournal: (date: string) => void;
  onToast: (t: { title: string; variant: 'success' | 'error' | 'info' }) => void;
}) {
  const today = todayIso();
  const o = useMemo(() => computeOverview(entries, profile, today), [entries, profile, today]);
  const { mode, cycles, durations, comparison, feels } = o;

  const [month, setMonth] = useState<{ y: number; m: number }>({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 });
  const [day, setDay] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'settings' | null>(null);
  const [fixing, setFixing] = useState<{ start: string; end: string; flow: PeriodNoteInput['flow'] } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [invite, setInvite] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    try { const v = window.localStorage.getItem(LEGEND_KEY); if (v !== null) setLegendOpen(v === '1'); } catch { /* ignore */ }
  }, []);
  const toggleLegend = () => {
    setLegendOpen((v) => { try { window.localStorage.setItem(LEGEND_KEY, v ? '0' : '1'); } catch { /* ignore */ } return !v; });
  };
  useEffect(() => {
    setInvite(`Bonjour ${firstName},\n\nJe vous propose de suivre votre cycle dans votre app : notez vos dates de règles et vos ressentis, cela m’aidera à adapter vos conseils selon les moments du mois. Vous pouvez l’arrêter quand vous voulez.\n\n${practitionerFirstName}`);
  }, [firstName, practitionerFirstName]);

  const reload = useCallback(async () => {
    const [p, e] = await Promise.all([getCycleProfile(consultantId), getCycleEntries(consultantId)]);
    if (p) onProfile(p);
    onEntries(e);
  }, [consultantId, onProfile, onEntries]);

  async function savePeriod(input: PeriodNoteInput) {
    const r = await notePeriod(consultantId, input);
    if (!r.ok) { onToast({ title: 'Les règles n’ont pas pu être notées', variant: 'error' }); return; }
    if (mode === 'off' || mode === 'paused') await setCycleTracking(consultantId, practitionerId, true);
    await reload();
    setModal(null);
    setFixing(null);
    onToast({ title: input.fixingStart ? 'Date corrigée. Les phases et l’historique sont recalculés.' : `Règles notées. Les phases sont recalculées ; ${firstName} les verra dans son app.`, variant: 'success' });
  }

  async function saveSettings(s: CycleSettingsInput) {
    const p = await saveCycleSettings(consultantId, practitionerId, s);
    if (!p) { onToast({ title: 'Les réglages n’ont pas pu être enregistrés', variant: 'error' }); return; }
    onProfile(p);
    setModal(null);
    onToast({ title: 'Réglages enregistrés. Les phases sont recalculées.', variant: 'success' });
  }

  async function setTracking(on: boolean) {
    const p = await setCycleTracking(consultantId, practitionerId, on);
    if (!p) { onToast({ title: 'Le changement n’a pas pu être enregistré', variant: 'error' }); return; }
    onProfile(p);
    setModal(null);
    onToast({ title: on ? `Suivi réactivé. Son historique est de nouveau visible ; ${firstName} en est informée.` : `Suivi du cycle désactivé. Ses données sont conservées ; ${firstName} en est informée.`, variant: 'success' });
  }

  async function sendInvite() {
    setInviting(true);
    try {
      const r = await inviteToCycleTracking(consultantId, practitionerId, invite.trim());
      if (!r.ok) { onToast({ title: 'Le message n’a pas pu être envoyé', variant: 'error' }); return; }
      await reload();
      onToast({ title: `Message envoyé à ${firstName}. Vous recevrez une notification quand elle aura activé le suivi.`, variant: 'success' });
    } finally {
      setInviting(false);
    }
  }

  function openFix(start: string) {
    const c = cycles.find((x) => x.start === start);
    const e = entries.find((x) => x.date === start);
    setDay(null);
    setFixing({ start, end: c?.periodEnd ?? start, flow: (e?.flow_intensity === 'spotting' ? 'light' : e?.flow_intensity) ?? null });
    setModal('add');
  }

  const subtitle =
    mode === 'off'
      ? 'Suivi non activé'
      : mode === 'paused'
        ? `Suivi désactivé${profile?.tracking_paused_at ? ` le ${fmtShort(profile.tracking_paused_at.slice(0, 10))}` : ''} · données conservées`
        : mode === 'waiting'
          ? `Suivi activé${profile?.tracking_activated_at ? ` le ${fmtShort(profile.tracking_activated_at.slice(0, 10))}` : ''} · aucune date de règles pour l’instant`
          : `Suivi à partir des dates de règles que ${firstName} note dans le journal`;

  const invited = !!profile?.invite_sent_at;
  const hasFlags = !!comparison?.possible && comparison.flags.length > 0;
  const phasesOff = o.estimatesPaused;

  // Tuiles : aujourd'hui, prochaines règles, cycle moyen, point saillant (ou régularité).
  const kpis = mode === 'on' ? [
    phasesOff
      ? { l: 'Aujourd’hui', v: `J${comparison?.cycleDay ?? '—'}`, s: 'phases non estimées (situation particulière)' }
      : { l: 'Aujourd’hui', v: o.current ? `J${o.current.cycleDay}` : '—', s: o.current ? PHASE4_LABELS[o.current.phase] + (o.current.estimated ? ' (estimé)' : '') : '' },
    o.nextPeriod
      ? { l: 'Prochaines règles', v: fmtShort(o.nextPeriod.date), s: o.nextPeriod.inDays >= 0 ? `estimées, dans ${o.nextPeriod.inDays} jour${o.nextPeriod.inDays > 1 ? 's' : ''}` : `estimées il y a ${-o.nextPeriod.inDays} jour${-o.nextPeriod.inDays > 1 ? 's' : ''}`, hi: o.nextPeriod.inDays <= -5, tag: 'En retard' }
      : { l: 'Prochaines règles', v: '—', s: 'pas d’estimation' },
    { l: 'Cycle moyen', v: `${durations.cycleLength} j`, s: `${profile?.cycle_length_manual ? 'saisi à la main' : REGULARITY[durations.regularity] || 'calculé'} · règles ${durations.periodLength} j` },
    feels.highlight
      ? { l: `${feels.highlight.sentence.split(' sur ')[0].replace(/^\d+ /, '').replace(/^./, (c) => c.toUpperCase())} ${feels.highlight.phase === 'menstrual' && /2 premiers jours/.test(feels.highlight.sentence) ? 'au début des règles' : `en ${PHASE4_LABELS[feels.highlight.phase].toLowerCase()}`}`, v: `${feels.highlight.hits} / ${feels.highlight.total}`, s: `sur les ${feels.cyclesUsed} dernier${feels.cyclesUsed > 1 ? 's' : ''} cycle${feels.cyclesUsed > 1 ? 's' : ''}`, hi: true, tag: 'À noter' }
      : { l: 'Régularité', v: REGULARITY[durations.regularity] ? REGULARITY[durations.regularity].replace(/^./, (c) => c.toUpperCase()) : '—', s: durations.cycleSamples.length >= 2 ? `sur ${durations.cycleSamples.length} cycles complets` : 'à partir de 2 cycles complets' },
  ] : [];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[26px] font-medium text-charcoal">Cycle</h2>
          <span className="text-sm text-stone">{subtitle}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModal('settings')}>Réglages du cycle</Button>
          {mode === 'on' || mode === 'waiting' ? <Button variant="outline" onClick={() => { setFixing(null); setModal('add'); }}>＋ Noter des règles</Button> : null}
        </div>
      </div>

      {mode === 'paused' ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-divider bg-surface p-6">
          <div className="flex min-w-[280px] flex-1 flex-col gap-2">
            <h3 className="text-lg font-semibold text-charcoal">Le suivi du cycle est désactivé pour {firstName}</h3>
            <p className="text-sm leading-relaxed text-stone">
              Désactivé{profile?.tracking_paused_at ? ` le ${fmtShort(profile.tracking_paused_at.slice(0, 10))}` : ''}. Ses données sont conservées : {cycles.length} cycle{cycles.length > 1 ? 's' : ''}, ses dates de règles et ses saisies du quotidien. Elles réapparaissent telles quelles dès que vous réactivez le suivi.
            </p>
          </div>
          <Button variant="primary" onClick={() => setTracking(true)}>Activer le suivi du cycle pour {firstName}</Button>
        </section>
      ) : null}

      {mode === 'off' ? (
        <section className="flex flex-col gap-3.5 rounded-2xl border border-dashed border-divider bg-surface p-6">
          <h3 className="text-lg font-semibold text-charcoal">Le suivi du cycle n’est pas activé pour {firstName}</h3>
          <p className="text-sm leading-relaxed text-stone">Une fois activé, {firstName} note ses dates de règles et ses ressentis dans son app. Vous voyez ici ses phases estimées, ses ressentis selon la phase et l’historique de ses cycles. C’est {firstName} qui active le suivi : vous pouvez le lui proposer.</p>
          <div className="flex flex-col gap-1.5 rounded-xl bg-surface-raised p-3.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone">Message proposé</span>
            <textarea aria-label={`Message à ${firstName}`} rows={4} value={invite} onChange={(ev) => setInvite(ev.target.value)} className="resize-y rounded-[10px] border border-divider bg-ink px-3 py-2 text-sm leading-relaxed text-charcoal focus:border-sage focus:outline-none" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={sendInvite} loading={inviting} disabled={invited}>{invited ? `✓ Proposé à ${firstName}` : `Proposer le suivi à ${firstName}`}</Button>
            <span className="text-[13px] text-stone">Le message arrive dans sa messagerie, avec un bouton « Activer le suivi du cycle ».</span>
          </div>
        </section>
      ) : null}

      {mode === 'waiting' ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-divider bg-surface p-6">
          <h3 className="text-lg font-semibold text-charcoal">En attente des premières règles</h3>
          <p className="text-sm leading-relaxed text-stone">{firstName} a activé le suivi{profile?.tracking_activated_at ? ` le ${fmtShort(profile.tracking_activated_at.slice(0, 10))}` : ''}. Les phases s’afficheront dès qu’une première date de règles sera notée, par elle dans son app ou par vous avec « ＋ Noter des règles » (par exemple une date donnée en séance).</p>
          <ul className="list-disc pl-5 text-[13px] leading-relaxed text-stone">
            <li>Avec une seule date, les phases sont estimées sur un cycle de 28 jours.</li>
            <li>À partir de 2 cycles complets, la durée moyenne et la régularité sont calculées.</li>
            <li>Les ressentis selon la phase apparaissent à partir de 3 cycles.</li>
          </ul>
        </section>
      ) : null}

      {mode === 'on' && comparison ? (
        <section aria-labelledby="rc-t" className="relative flex flex-col gap-3.5 rounded-2xl border p-5" style={{ background: hasFlags ? `linear-gradient(135deg, ${ALERT_UI.bg}, #1C2230)` : '#151A23', borderColor: hasFlags ? ALERT_UI.border : '#2A3140' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="rc-t" className="text-base font-semibold text-charcoal">
              {hasFlags ? 'À surveiller en priorité' : comparison.possible ? 'Rien d’inhabituel' : 'Depuis ses dernières règles'}{' '}
              <span className="font-normal text-stone">· depuis ses dernières règles, le {fmtShort(comparison.lastPeriodStart)} (J{comparison.cycleDay})</span>
            </h3>
            <span className="inline-flex items-center gap-2.5">
              {comparison.possible ? <span className="text-xs text-stone">Comparé à ses {comparison.previousCycles} cycles précédents, aux mêmes jours</span> : null}
              <button type="button" onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen} className="h-[30px] rounded-lg border border-divider px-2.5 text-xs text-stone hover:bg-surface-raised">{rulesOpen ? 'Masquer les règles' : 'Règles de calcul'}</button>
            </span>
          </div>
          {!comparison.possible ? (
            <p className="text-sm text-stone">Pas encore assez de recul : il faut 2 cycles précédents notés pour comparer ce cycle à ses habitudes ({comparison.previousCycles} pour l’instant).</p>
          ) : null}
          {hasFlags ? (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(comparison.flags.length, 3)}, minmax(0, 1fr))` }}>
              {comparison.flags.map((f) => (
                <div key={f.label} className="flex min-w-0 flex-col gap-1 rounded-xl border p-3" style={{ background: 'rgba(10,14,20,0.55)', borderColor: ALERT_UI.border }}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone">{f.label}</span>
                    <span className="flex-none rounded-full px-2 py-[2px] text-xs font-bold" style={{ background: ALERT_UI.pill, color: ALERT_UI.fg }}>{f.gap}</span>
                  </span>
                  <span className="text-xl font-semibold leading-tight" style={{ color: ALERT_UI.fg }}>{f.value}</span>
                  <span className="text-xs text-stone">{f.usual}</span>
                </div>
              ))}
            </div>
          ) : comparison.possible ? (
            <p className="text-sm text-charcoal">Rien ne s’écarte nettement de ses habitudes pour l’instant.</p>
          ) : null}
          {comparison.possible && comparison.lowData ? <p className="text-[13px] text-gold">Moins de la moitié des jours sont saisis : la comparaison n’est pas fiable.</p> : null}
          {comparison.possible && comparison.okNames.length ? <p className="text-xs leading-relaxed text-stone">Dans ses habitudes : {comparison.okNames.join(', ')}.</p> : null}
          {rulesOpen ? (
            <div role="dialog" aria-label="Règles de calcul" className="absolute right-5 top-24 z-20 flex w-[660px] max-w-[calc(100%-40px)] flex-col gap-1.5 rounded-xl border border-divider bg-surface-raised p-4 shadow-xl">
              <span className="text-xs font-semibold text-charcoal">Ce qui fait ressortir un critère</span>
              {COMPARISON_RULES.map((r) => (
                <div key={r.c} className="grid grid-cols-[220px_1fr] gap-3 border-t border-divider py-1.5 text-xs leading-snug"><span className="text-charcoal">{r.c}</span><span className="text-stone">{r.r}</span></div>
              ))}
              <span className="text-xs text-stone">Les hausses comme les baisses comptent. Les critères qui ressortent sont classés du plus fort écart au plus faible (5 au maximum).</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === 'on' ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {kpis.map((k) => (
            <div key={k.l} className="flex flex-col gap-1 rounded-[14px] border p-4" style={{ background: k.hi ? ALERT_UI.bg : '#151A23', borderColor: k.hi ? ALERT_UI.border : '#2A3140' }}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-stone">{k.l}</span>
                {k.hi && k.tag ? <span className="flex-none rounded-full px-2 py-[2px] text-[11px] font-semibold" style={{ background: ALERT_UI.pill, color: ALERT_UI.fg }}>{k.tag}</span> : null}
              </span>
              <span className="font-serif text-[26px]" style={{ color: k.hi ? ALERT_UI.fg : '#E8EDF4' }}>{k.v}</span>
              <span className="text-xs" style={{ color: k.hi ? ALERT_UI.fg : '#8B95A5' }}>{k.s}</span>
            </div>
          ))}
        </div>
      ) : null}

      {mode === 'on' ? (
        <div className="flex flex-wrap items-start gap-4">
          <CycleMonthGrid
            year={month.y}
            month0={month.m}
            cycles={cycles}
            durations={durations}
            entries={entries}
            today={today}
            selected={day}
            phasesOff={phasesOff}
            firstName={firstName}
            onMonth={(d) => { setDay(null); setMonth(({ y, m }) => { const n = new Date(Date.UTC(y, m + d, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; }); }}
            onPick={(d) => setDay(day === d ? null : d)}
          />
          <CycleLegend open={legendOpen} onToggle={toggleLegend} />
        </div>
      ) : null}

      {mode === 'on' ? (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
            <h3 className="text-base font-semibold text-charcoal">Ressentis selon la phase · {feels.cyclesUsed} dernier{feels.cyclesUsed > 1 ? 's' : ''} cycle{feels.cyclesUsed > 1 ? 's' : ''}</h3>
            {feels.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-separate border-spacing-1 text-[13px]">
                  <thead>
                    <tr className="text-xs text-stone"><th scope="col" className="text-left font-medium">Ressenti</th><th className="font-medium">Règles</th><th className="font-medium">Folliculaire</th><th className="font-medium">Ovulation</th><th className="font-medium">Lutéale</th></tr>
                  </thead>
                  <tbody>
                    {feels.rows.map((r) => (
                      <tr key={r.symptom}>
                        <th scope="row" className="text-left font-medium text-charcoal">{r.label}</th>
                        {r.counts.map((n, i) => (
                          <td key={i} className={cn('h-8 rounded-[7px] text-center text-xs font-semibold', n === 0 ? 'bg-surface-raised text-stone' : n === 1 ? 'bg-[#2A2E3A] text-[#C9CFDA]' : n === 2 ? 'bg-[#3D3346] text-[#D9C9F0]' : 'bg-[#B89FD9] text-ink')}>{n === 0 ? '—' : n === 1 ? 'parfois' : n === 2 ? 'souvent' : 'à chaque cycle'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-stone">Aucun ressenti noté sur ces cycles pour l’instant.</p>
            )}
            <p className="text-xs leading-relaxed text-stone">Pour chaque ressenti, le nombre de cycles (sur les {feels.cyclesUsed} derniers) où {firstName} l’a noté au moins une fois pendant la phase : 1 = parfois, 2 = souvent, 3 = à chaque cycle. Ce sont ses {feels.rows.length} ressentis les plus notés.</p>
            {feels.highlight ? <p className="rounded-[10px] px-3 py-2.5 text-[13px] leading-relaxed" style={{ background: '#3A2733', color: ALERT_UI.fg }}>{feels.highlight.sentence.replace(/^./, (c) => c.toUpperCase())}</p> : null}
          </section>
          <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
            <h3 className="text-base font-semibold text-charcoal">Historique des cycles</h3>
            {[...cycles].reverse().map((c) => (
              <HistoryRow key={c.start} c={c} />
            ))}
            <span className="text-xs text-stone">Durée du cycle · durée des règles</span>
          </section>
        </div>
      ) : null}

      {mode === 'on' || mode === 'waiting' ? (
        <p className="text-xs leading-relaxed text-mist">
          Les phases sont estimées à partir des dates saisies par {firstName}. Ce suivi aide l’accompagnement ; il ne sert ni à la contraception ni à la prédiction de la fertilité.
          {profile?.contraception && profile.contraception !== 'aucune' ? ` ${firstName} utilise une contraception hormonale : les variations peuvent être atténuées.` : ''}
        </p>
      ) : null}

      {day && mode === 'on' ? (
        <DayModal date={day} cycles={cycles} durations={durations} entries={entries} today={today} firstName={firstName} phasesOff={phasesOff} onClose={() => setDay(null)} onNavigate={setDay} onOpenJournal={onOpenJournal} onFixPeriod={openFix} />
      ) : null}
      {modal === 'add' ? <NotePeriodModal cycles={cycles} today={today} firstName={firstName} fixing={fixing} onClose={() => { setModal(null); setFixing(null); }} onSave={savePeriod} /> : null}
      {modal === 'settings' ? <CycleSettingsModal profile={profile} durations={durations} mode={mode} firstName={firstName} onClose={() => setModal(null)} onSave={saveSettings} onStop={() => setTracking(false)} onRestart={() => setTracking(true)} /> : null}
    </div>
  );
}

function HistoryRow({ c }: { c: Cycle }) {
  const label = c.end ? `${fmtShort(c.start)} → ${fmtShort(c.end === c.start ? c.start : addDaysSafe(c.end, -1))}` : `Depuis le ${fmtShort(c.start)}`;
  return (
    <div className="grid grid-cols-[1fr_70px_70px] gap-2 border-t border-divider py-2 text-sm">
      <span className="text-charcoal">{label}</span>
      <span className="text-stone">{c.length ? `${c.length} j` : 'en cours'}</span>
      <span className="text-mist">{c.periodDays ? `${c.periodDays} j` : '—'}</span>
    </div>
  );
}

function addDaysSafe(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
