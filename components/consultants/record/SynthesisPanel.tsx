'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Video } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { JoinVisioButton } from '@/components/video/JoinVisioButton';
import { Button } from '@/components/ui/Button';
import {
  createConsultantGoal,
  deleteConsultantGoal,
  getConsultantGoals,
  updateConsultantGoal,
} from '@/lib/queries/dossier';
import { calculateObservanceRates } from '@/lib/queries/observance';
import { OBSERVANCE_CATEGORIES } from '@/lib/journal-constants';
import { CYCLE_PHASES } from '@/lib/cycle-constants';
import type {
  Appointment,
  ConsultantGoal,
  ConsultantPlan,
  ConsultantWithDetails,
  CyclePhase,
  ObservanceSummary,
  WearableSummary,
} from '@/lib/types';

export type RecordTarget = 'anamnese' | 'conseillancier' | 'objet' | 'notes' | 'rdv' | 'journal';

type Props = {
  consultant: ConsultantWithDetails;
  answers: Record<string, string>;
  appointments: Appointment[];
  plans: ConsultantPlan[];
  wearable: WearableSummary[];
  isPremium: boolean;
  cycle: { phase: CyclePhase; cycleDay: number } | null;
  note: { content: string; updatedAt: string | null };
  onOpen: (target: RecordTarget) => void;
};

const card = 'flex flex-col rounded-2xl border border-divider bg-surface';
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const fullFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const monShortFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const LOCATION: Record<string, string> = { in_person: 'Au cabinet', video: 'Visio', phone: 'Téléphone', home_visit: 'À domicile' };

function hours(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh} h ${String(mm).padStart(2, '0')}`;
}

function durationDelta(h: number) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`;
}

function rateColor(rate: number) {
  if (rate >= 75) return '#6DD4B8';
  if (rate >= 50) return '#7B93DB';
  return '#E8A87C';
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const t = timeFmt.format(d).replace(':', ' h ');
  if (same(d, today)) return `Aujourd’hui, ${t}`;
  if (same(d, tomorrow)) return `Demain, ${t}`;
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${t}`;
}

/** Objectifs exprimés : « motif_objectifs » découpé en phrases courtes. */
function goalsFrom(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n|;|\.(?:\s|$)|,\s(?=[a-zéèàâêîôû])/i)
    .map((s) => s.trim().replace(/^[-•·]\s*/, ''))
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 3);
}

const GOAL_STATUS: Record<ConsultantGoal['status'], { label: string; color: string }> = {
  in_progress: { label: 'En cours', color: '#E8A87C' },
  progressing: { label: 'En progrès', color: '#6DD4B8' },
  reached: { label: 'Atteint', color: '#6DD4B8' },
};

const RECENT_COUNT = 3;

export function SynthesisPanel({ consultant, answers, appointments, plans, wearable, isPremium, cycle, note, onOpen }: Props) {
  const first = (consultant as { first_name?: string | null }).first_name || consultant.name?.split(' ')[0] || 'ce consultant';
  const [observance, setObservance] = useState<ObservanceSummary | null>(null);

  // Objectifs
  const [goals, setGoals] = useState<ConsultantGoal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState({ label: '', progress: '', status: 'in_progress' as ConsultantGoal['status'] });
  const [manageOpen, setManageOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ label: '', baseline: '' });
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // Parcours
  const [allTimeline, setAllTimeline] = useState(false);
  const [month, setMonth] = useState('all');

  // Note
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!(consultant.observance_items ?? []).length) return;
    calculateObservanceRates(consultant.id, 14)
      .then((s) => alive && setObservance(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [consultant.id, consultant.observance_items]);

  useEffect(() => {
    let alive = true;
    getConsultantGoals(consultant.id).then((g) => {
      if (!alive) return;
      setGoals(g);
      setGoalsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [consultant.id]);

  const motif = consultant.consultation_reason?.trim() || answers.motif_principal?.trim() || '';
  const suggestedGoals = goalsFrom(answers.motif_objectifs);

  const firstSession = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'completed')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null,
    [appointments]
  );
  const goalsSetOn = goals.length ? [...goals].sort((a, b) => a.set_on.localeCompare(b.set_on))[0].set_on : firstSession?.starts_at ?? null;

  async function run(fn: () => Promise<void>) {
    setGoalBusy(true);
    setGoalError(null);
    try {
      await fn();
    } catch (e) {
      setGoalError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setGoalBusy(false);
    }
  }

  const saveGoalEdit = (g: ConsultantGoal) =>
    run(async () => {
      if (!goalDraft.label.trim()) throw new Error('L’objectif ne peut pas être vide.');
      const updated = await updateConsultantGoal(g.id, {
        label: goalDraft.label.trim(),
        progress: goalDraft.progress.trim() || null,
        status: goalDraft.status,
      });
      setGoals((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
      setEditingGoal(null);
    });

  const addGoal = (label: string, baseline: string | null) =>
    run(async () => {
      if (!label.trim()) throw new Error('Écrivez l’objectif avant de l’ajouter.');
      const created = await createConsultantGoal(consultant.id, {
        label: label.trim(),
        baseline: baseline?.trim() || null,
        position: goals.length,
        ...(firstSession && !goals.length ? { set_on: firstSession.starts_at.slice(0, 10) } : {}),
      });
      setGoals((prev) => [...prev, created]);
      setNewGoal({ label: '', baseline: '' });
    });

  const removeGoal = (g: ConsultantGoal) =>
    run(async () => {
      await deleteConsultantGoal(g.id);
      setGoals((prev) => prev.filter((x) => x.id !== g.id));
    });

  const importSuggested = () =>
    run(async () => {
      const created: ConsultantGoal[] = [];
      for (const [i, label] of suggestedGoals.entries()) {
        created.push(
          await createConsultantGoal(consultant.id, {
            label,
            position: i,
            ...(firstSession ? { set_on: firstSession.starts_at.slice(0, 10) } : {}),
          })
        );
      }
      setGoals(created);
    });

  const adherence = useMemo(
    () =>
      (observance?.categories ?? []).slice(0, 5).map((c) => ({
        label: OBSERVANCE_CATEGORIES.find((x) => x.value === c.category)?.label ?? c.category,
        rate: c.rate,
      })),
    [observance]
  );
  const adherenceNote = useMemo(() => {
    if (adherence.length < 2) return null;
    const best = adherence[0];
    const worst = adherence[adherence.length - 1];
    if (best.rate - worst.rate < 15) return `Observance homogène, autour de ${observance?.globalRate ?? best.rate} %.`;
    return `${worst.label} : le point le moins suivi (${worst.rate} %). ${best.label} : bien suivi (${best.rate} %).`;
  }, [adherence, observance]);

  const timeline = useMemo(() => {
    const ev: { at: string; text: string; color: string }[] = [];
    for (const a of appointments) {
      if (a.status !== 'completed') continue;
      ev.push({ at: a.starts_at, text: `Séance${a.consultation_type?.name ? ` · ${a.consultation_type.name}` : ''}`, color: '#6DD4B8' });
    }
    for (const p of plans) {
      if (p.status === 'shared' && p.shared_at) ev.push({ at: p.shared_at, text: `Conseillancier v${p.version} partagé`, color: '#6DD4B8' });
    }
    const anam = consultant.consultant_anamnesis as { created_at?: string } | null | undefined;
    if (anam?.created_at) ev.push({ at: anam.created_at, text: 'Anamnèse recueillie', color: '#8B95A5' });
    const firstWear = [...wearable].sort((a, b) => a.date.localeCompare(b.date))[0];
    if (firstWear) ev.push({ at: firstWear.date, text: 'Objet connecté : premières données', color: '#7B93DB' });
    if (consultant.activated_at) ev.push({ at: consultant.activated_at, text: 'Compte activé sur l’application', color: '#7B93DB' });
    ev.push({ at: consultant.created_at, text: 'Dossier créé', color: '#8B95A5' });
    return ev.sort((a, b) => b.at.localeCompare(a.at));
  }, [appointments, plans, wearable, consultant]);

  const months = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of timeline) {
      const key = e.at.slice(0, 7);
      if (!seen.has(key)) {
        const label = monthFmt.format(new Date(e.at));
        seen.set(key, label.charAt(0).toUpperCase() + label.slice(1));
      }
    }
    return [...seen.entries()];
  }, [timeline]);

  const shownTimeline =
    month !== 'all' ? timeline.filter((e) => e.at.startsWith(month)) : allTimeline ? timeline : timeline.slice(0, RECENT_COUNT);

  const ring = useMemo(() => {
    if (!wearable.length) return null;
    const sorted = [...wearable].sort((a, b) => b.date.localeCompare(a.date));
    const week = sorted.slice(0, 7);
    const ref = sorted.slice(0, 30);
    const avg = (rows: WearableSummary[], k: 'sleep_duration' | 'hrv_avg' | 'activity_level') => {
      const v = rows.map((r) => r[k]).filter((x): x is number => typeof x === 'number');
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    };
    const rows: { label: string; value: string; delta: string; color: string }[] = [];
    const s7 = avg(week, 'sleep_duration');
    const s30 = avg(ref, 'sleep_duration');
    if (s7 !== null) {
      const d = s30 !== null ? s7 - s30 : 0;
      rows.push({
        label: 'Sommeil moyen',
        value: hours(s7),
        delta: Math.abs(d) < 0.15 ? 'stable' : `${d > 0 ? '+' : '−'}${durationDelta(Math.abs(d))}`,
        color: Math.abs(d) < 0.15 ? '#8B95A5' : d < 0 ? '#E8A87C' : '#6DD4B8',
      });
    }
    const h7 = avg(week, 'hrv_avg');
    const h30 = avg(ref, 'hrv_avg');
    if (h7 !== null) {
      const d = h30 !== null ? Math.round(h7 - h30) : 0;
      rows.push({ label: 'VFC nocturne', value: `${Math.round(h7)} ms`, delta: d === 0 ? 'stable' : `${d > 0 ? '+' : '−'}${Math.abs(d)} ms`, color: d === 0 ? '#8B95A5' : d < 0 ? '#E8A87C' : '#6DD4B8' });
    }
    const a7 = avg(week, 'activity_level');
    const a30 = avg(ref, 'activity_level');
    if (a7 !== null) {
      const d = a30 !== null ? Math.round(a7 - a30) : 0;
      rows.push({ label: 'Activité', value: `${Math.round(a7)} / 100`, delta: d === 0 ? 'stable' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`, color: d === 0 ? '#8B95A5' : d < 0 ? '#E8A87C' : '#6DD4B8' });
    }
    return rows;
  }, [wearable]);

  const next = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.ends_at).getTime() > Date.now() && !['cancelled', 'rescheduled', 'completed'].includes(a.status))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null,
    [appointments]
  );
  const nextMinutes = next ? Math.round((new Date(next.ends_at).getTime() - new Date(next.starts_at).getTime()) / 60000) : 0;
  const nextDate = next ? new Date(next.starts_at) : null;
  const weekday = nextDate ? weekdayFmt.format(nextDate) : '';

  const noteText = note.content.trim();
  const showRing = isPremium && !!ring?.length;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Motif + prochain rendez-vous */}
      <div className="flex flex-wrap items-stretch gap-[18px]">
        <section className={`${card} min-w-0 flex-[2_1_420px] gap-3.5 p-[22px]`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Motif de consultation</h2>
            <button type="button" onClick={() => onOpen('anamnese')} className="text-sm text-sage hover:text-[#A8E6CF]">
              Voir l’anamnèse
            </button>
          </div>
          {motif ? (
            <p className="font-serif text-lg leading-relaxed">« {motif} »</p>
          ) : (
            <p className="text-sm text-stone">Motif non renseigné. Il se remplit avec le questionnaire préliminaire.</p>
          )}
        </section>

        <div className="flex flex-[0_0_200px] flex-col gap-2">
          <button
            type="button"
            onClick={() => onOpen(next ? 'notes' : 'rdv')}
            aria-label={next ? `Prochain rendez-vous : ${whenLabel(next.starts_at)}. Préparer la séance` : 'Aucun rendez-vous prévu. Planifier une séance'}
            className={`${card} flex-1 justify-center gap-3 p-4 text-left hover:border-sage/50`}
          >
            <span className="text-xs font-medium text-stone">Prochain rendez-vous</span>
            {next && nextDate ? (
              <>
                <span className="flex items-center gap-3">
                  <span className="flex w-12 flex-none flex-col items-center rounded-[10px] bg-sage-light px-0 pb-[7px] pt-1.5 leading-none text-sage">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{monShortFmt.format(nextDate)}</span>
                    <span className="mt-[3px] font-serif text-2xl font-semibold">{nextDate.getDate()}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-[15px] font-semibold">
                      {weekday.charAt(0).toUpperCase() + weekday.slice(1)}, {timeFmt.format(nextDate).replace(':', ' h ')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-stone">
                      {next.location_type === 'video' ? <Video className="h-3 w-3" aria-hidden="true" /> : null}
                      {[LOCATION[next.location_type] ?? null, `${nextMinutes} min`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
                <span className="flex items-center justify-between border-t border-divider pt-2.5 text-[13px] font-semibold text-sage">
                  Préparer la séance <span aria-hidden="true">→</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-sm">Aucun rendez-vous prévu.</span>
                <span className="flex items-center justify-between border-t border-divider pt-2.5 text-[13px] font-semibold text-sage">
                  Planifier <span aria-hidden="true">→</span>
                </span>
              </>
            )}
          </button>
          {next && next.location_type === 'video' && next.video_room_name && (
            <JoinVisioButton appointmentId={next.id} startsAt={next.starts_at} endsAt={next.ends_at} label="Rejoindre la visio" className="w-full" />
          )}
        </div>
      </div>

      {/* Objectifs */}
      <section className={`${card} gap-3.5 p-[22px]`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[3px]">
            <h2 className="text-base font-semibold">Objectifs</h2>
            <span className="text-[13px] text-stone">
              {goalsSetOn ? `Fixés avec ${first} en première séance, le ${fullFmt.format(new Date(goalsSetOn))}` : `À fixer avec ${first} en première séance`}
            </span>
          </div>
          <button type="button" onClick={() => setManageOpen(true)} className="text-sm text-sage hover:text-[#A8E6CF]">
            Ajouter ou retirer
          </button>
        </div>
        {goalError && !manageOpen ? <p className="text-sm text-rose">{goalError}</p> : null}
        {goals.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
            {goals.map((g) =>
              editingGoal === g.id ? (
                <div key={g.id} className="flex flex-col gap-2 rounded-xl border border-[#2F5A50] bg-surface-raised p-3.5">
                  <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                    Objectif
                    <input
                      value={goalDraft.label}
                      onChange={(e) => setGoalDraft((d) => ({ ...d, label: e.target.value }))}
                      className="h-10 rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                    Où en est {first}
                    <input
                      value={goalDraft.progress}
                      onChange={(e) => setGoalDraft((d) => ({ ...d, progress: e.target.value }))}
                      className="h-10 rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                    Statut
                    <select
                      value={goalDraft.status}
                      onChange={(e) => setGoalDraft((d) => ({ ...d, status: e.target.value as ConsultantGoal['status'] }))}
                      className="h-10 rounded-lg border border-divider bg-ink px-2 text-sm text-charcoal"
                    >
                      {Object.entries(GOAL_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setEditingGoal(null)} className="h-8 rounded-lg border border-divider px-2.5 text-[13px] text-[#B8C1CF]">
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={goalBusy}
                      onClick={() => void saveGoalEdit(g)}
                      className="h-8 rounded-lg bg-sage px-2.5 text-[13px] font-semibold text-ink disabled:opacity-60"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div key={g.id} className="flex flex-col gap-1.5 rounded-xl bg-surface-raised p-3.5">
                  <div className="flex items-start gap-1.5">
                    <span className="flex-1 text-[15px] font-medium leading-snug">{g.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGoal(g.id);
                        setGoalDraft({ label: g.label, progress: g.progress ?? '', status: g.status });
                      }}
                      aria-label={`Modifier l’objectif ${g.label}`}
                      title="Modifier"
                      className="-mr-1.5 -mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-[7px] text-stone hover:bg-white/5 hover:text-charcoal"
                    >
                      <Pencil className="h-[15px] w-[15px]" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: GOAL_STATUS[g.status].color }}>
                    {[GOAL_STATUS[g.status].label, g.progress].filter(Boolean).join(' · ')}
                  </span>
                  {g.baseline ? <span className="text-xs text-mist">Au départ : {g.baseline}</span> : null}
                </div>
              )
            )}
          </div>
        ) : goalsLoaded && suggestedGoals.length ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-divider p-3.5">
            <span className="text-[13px] text-stone">Objectifs exprimés par {first} dans le questionnaire :</span>
            <ul className="flex flex-col gap-1 text-sm">
              {suggestedGoals.map((g) => (
                <li key={g}>· {g}</li>
              ))}
            </ul>
            <button type="button" disabled={goalBusy} onClick={() => void importSuggested()} className="self-start text-sm text-sage hover:text-[#A8E6CF]">
              Les reprendre comme objectifs
            </button>
          </div>
        ) : goalsLoaded ? (
          <p className="text-sm text-stone">Aucun objectif pour l’instant.</p>
        ) : null}
      </section>

      {/* Observance */}
      <section className={`${card} gap-4 p-[22px]`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Observance du conseillancier</h2>
          <span className="text-[13px] text-stone">Déclarée dans le journal · 14 derniers jours</span>
        </div>
        {adherence.length ? (
          <>
            {adherence.map((a) => (
              <div key={a.label} className="grid grid-cols-[130px_minmax(0,1fr)_44px] items-center gap-3.5">
                <span className="truncate text-sm">{a.label}</span>
                <div className="h-2 rounded-full bg-divider" role="img" aria-label={`${a.label} : ${a.rate} %`}>
                  <div className="h-full rounded-full" style={{ width: `${a.rate}%`, background: rateColor(a.rate) }} />
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{a.rate}%</span>
              </div>
            ))}
            {adherenceNote ? <p className="text-[13px] text-stone">{adherenceNote}</p> : null}
          </>
        ) : (
          <p className="text-sm text-stone">
            Pas encore de suivi déclaré. Les cases à cocher du journal apparaissent une fois le conseillancier partagé.{' '}
            <button type="button" onClick={() => onOpen('conseillancier')} className="text-sage hover:text-[#A8E6CF]">
              Ouvrir le conseillancier
            </button>
          </p>
        )}
      </section>

      {/* Dernière note + objet connecté / cycle */}
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className={`${card} min-w-0 flex-[1_1_300px] gap-2.5 p-[22px]`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Dernière note privée</h2>
            <span className="inline-flex flex-1 items-center justify-end gap-1.5 text-xs text-stone">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Invisible pour {first}
            </span>
            {noteText ? (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                aria-label="Lire la note en entier"
                title="Lire en entier"
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border border-divider text-charcoal hover:border-sage"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {noteText ? (
            <>
              <p className="line-clamp-3 whitespace-pre-line rounded-[10px] bg-surface-raised p-3 text-sm leading-relaxed">{noteText}</p>
              {note.updatedAt ? <span className="text-xs text-stone">Mise à jour le {longFmt.format(new Date(note.updatedAt))}</span> : null}
            </>
          ) : (
            <>
              <span className="text-sm text-stone">Aucune note pour l’instant.</span>
              <button type="button" onClick={() => onOpen('notes')} className="self-start text-sm text-sage hover:text-[#A8E6CF]">
                Écrire une note
              </button>
            </>
          )}
        </div>

        <button type="button" onClick={() => onOpen('objet')} className={`${card} min-w-0 flex-[1_1_300px] gap-2.5 p-[22px] text-left hover:border-sage/50`}>
          <div className="flex w-full items-center justify-between">
            <h2 className="text-base font-semibold">{showRing ? 'Objet connecté · cette semaine' : cycle ? 'Cycle' : 'Objet connecté'}</h2>
            <span className="text-[13px] text-sage">Détails →</span>
          </div>
          {showRing ? (
            ring!.map((r) => (
              <div key={r.label} className="flex w-full items-baseline justify-between gap-2 border-t border-divider pt-2.5">
                <span className="text-sm text-stone">{r.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-serif text-[22px] tabular-nums">{r.value}</span>
                  <span className="text-xs font-medium" style={{ color: r.color }}>
                    {r.delta}
                  </span>
                </span>
              </div>
            ))
          ) : cycle ? null : (
            <span className="text-sm text-stone">
              {isPremium ? 'Aucune donnée reçue pour l’instant.' : 'Inclus dans l’offre Premium : sommeil, VFC et activité entre deux séances.'}
            </span>
          )}
          {cycle ? (
            <div className="flex w-full items-baseline justify-between gap-2 border-t border-divider pt-2.5">
              <span className="text-sm text-stone">Aujourd’hui</span>
              <span className="text-[15px] font-semibold tabular-nums">
                J{cycle.cycleDay} · {CYCLE_PHASES[cycle.phase]?.label.toLowerCase()}
              </span>
            </div>
          ) : null}
        </button>
      </div>

      {/* Parcours */}
      <section className={`${card} gap-1 p-[22px]`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Parcours</h2>
          <div className="flex items-center gap-3.5">
            <label className="text-[13px] text-stone">
              <span className="sr-only">Filtrer par mois</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-[34px] rounded-lg border border-divider bg-ink px-2.5 text-[13px] text-charcoal"
              >
                <option value="all">Parcours complet</option>
                {months.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {month === 'all' && timeline.length > RECENT_COUNT ? (
              <button
                type="button"
                onClick={() => setAllTimeline((v) => !v)}
                aria-expanded={allTimeline}
                className="text-sm text-sage hover:text-[#A8E6CF]"
              >
                {allTimeline ? 'Réduire aux dernières actions' : 'Tout afficher'}
              </button>
            ) : null}
          </div>
        </div>
        {shownTimeline.length === 0 ? <p className="text-sm text-stone">Rien de noté sur ce mois.</p> : null}
        {shownTimeline.map((e, i) => (
          <div key={`${e.at}-${i}`} className="flex gap-3.5">
            <div className="flex w-3 flex-col items-center">
              <span className="mt-[5px] h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
              {i < shownTimeline.length - 1 ? <span className="min-h-[22px] w-0.5 flex-1 bg-divider" /> : null}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pb-3.5">
              <span className="text-[13px] text-stone">{dayFmt.format(new Date(e.at))}</span>
              <span className="text-sm">{e.text}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Note en entier */}
      <Modal isOpen={noteOpen} onClose={() => setNoteOpen(false)} title="Notes privées" description={`Invisibles pour ${first}`} size="md">
        <p className="whitespace-pre-line rounded-xl bg-surface-raised px-4 py-3.5 text-[15px] leading-relaxed">{noteText}</p>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setNoteOpen(false);
              onOpen('notes');
            }}
          >
            Ouvrir les notes
          </Button>
          <Button variant="secondary" onClick={() => setNoteOpen(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Objectifs : ajouter ou retirer */}
      <Modal isOpen={manageOpen} onClose={() => setManageOpen(false)} title="Ajouter ou retirer des objectifs" size="md">
        <div className="flex flex-col gap-4">
          {goals.length ? (
            <ul className="flex flex-col gap-2">
              {goals.map((g) => (
                <li key={g.id} className="flex items-center gap-2.5 rounded-[10px] bg-surface-raised px-3 py-2.5">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{g.label}</span>
                    {g.baseline ? <span className="text-xs text-stone">Au départ : {g.baseline}</span> : null}
                  </span>
                  <button
                    type="button"
                    disabled={goalBusy}
                    onClick={() => void removeGoal(g)}
                    className="h-8 rounded-lg border border-[#4A2A2E] px-2.5 text-[13px] text-[#F2A3A3]"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone">Aucun objectif pour l’instant.</p>
          )}
          <div className="flex flex-col gap-2.5 border-t border-divider pt-3">
            <h3 className="text-sm font-semibold">Nouvel objectif</h3>
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Objectif
              <input
                value={newGoal.label}
                onChange={(e) => setNewGoal((n) => ({ ...n, label: e.target.value }))}
                placeholder="Ex. Se coucher avant 23 h"
                className="h-10 rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal placeholder:text-mist"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Point de départ
              <input
                value={newGoal.baseline}
                onChange={(e) => setNewGoal((n) => ({ ...n, baseline: e.target.value }))}
                placeholder="Ex. 1 h 30 en moyenne"
                className="h-10 rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal placeholder:text-mist"
              />
            </label>
            {goalError ? <p className="text-sm text-rose">{goalError}</p> : null}
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setManageOpen(false)}>
            Terminé
          </Button>
          <Button variant="primary" loading={goalBusy} disabled={!newGoal.label.trim()} onClick={() => void addGoal(newGoal.label, newGoal.baseline)}>
            Ajouter l’objectif
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
