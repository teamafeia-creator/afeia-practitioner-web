'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { calculateObservanceRates } from '@/lib/queries/observance';
import { OBSERVANCE_CATEGORIES } from '@/lib/journal-constants';
import { CYCLE_PHASES } from '@/lib/cycle-constants';
import type {
  Appointment,
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

export function SynthesisPanel({ consultant, answers, appointments, plans, wearable, isPremium, cycle, note, onOpen }: Props) {
  const first = (consultant as { first_name?: string | null }).first_name || consultant.name?.split(' ')[0] || 'ce consultant';
  const [observance, setObservance] = useState<ObservanceSummary | null>(null);

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

  const motif = consultant.consultation_reason?.trim() || answers.motif_principal?.trim() || '';
  const goals = goalsFrom(answers.motif_objectifs);

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
    return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [appointments, plans, wearable, consultant]);

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

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-5">
        {/* Motif & objectifs */}
        <section className={`${card} gap-3.5 p-[22px]`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold">Motif & objectifs</h2>
            <button type="button" onClick={() => onOpen('anamnese')} className="text-sm text-sage hover:text-[#A8E6CF]">
              Modifier
            </button>
          </div>
          {motif ? (
            <p className="font-serif text-lg leading-relaxed">« {motif} »</p>
          ) : (
            <p className="text-sm text-stone">Motif non renseigné. Complétez l’anamnèse ou demandez le questionnaire préliminaire.</p>
          )}
          {goals.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
              {goals.map((g) => (
                <div key={g} className="flex flex-col gap-2 rounded-xl bg-surface-raised p-3.5">
                  <span className="text-sm font-medium">{g}</span>
                  <span className="text-[13px] text-stone">Objectif exprimé par {first}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Observance */}
        <section className={`${card} gap-4 p-[22px]`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold">Observance du conseillancier</h2>
            <span className="text-[13px] text-stone">Déclarée dans le journal · 14 derniers jours</span>
          </div>
          {adherence.length ? (
            <>
              {adherence.map((a) => (
                <div key={a.label} className="grid grid-cols-[120px_minmax(0,1fr)_48px] items-center gap-3.5">
                  <span className="truncate text-sm">{a.label}</span>
                  <div className="h-2.5 rounded-full bg-divider" role="img" aria-label={`${a.label} : ${a.rate} %`}>
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

        {/* Parcours */}
        <section className={`${card} gap-1 p-[22px]`}>
          <h2 className="mb-3 text-[17px] font-semibold">Parcours</h2>
          {timeline.map((e, i) => (
            <div key={`${e.at}-${i}`} className="flex gap-3.5">
              <div className="flex w-3 flex-col items-center">
                <span className="mt-[5px] h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                {i < timeline.length - 1 ? <span className="min-h-[22px] w-0.5 flex-1 bg-divider" /> : null}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 pb-3.5">
                <span className="text-[13px] text-stone">{dayFmt.format(new Date(e.at))}</span>
                <span className="text-sm">{e.text}</span>
              </div>
            </div>
          ))}
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
        {/* Objet connecté */}
        <button type="button" onClick={() => onOpen('objet')} className={`${card} gap-3.5 p-5 text-left hover:border-sage/50`}>
          <div className="flex w-full items-center justify-between">
            <h2 className="text-base font-semibold">{isPremium && ring?.length ? 'Objet connecté · cette semaine' : 'Objet connecté'}</h2>
            <span className="text-[13px] text-sage">Détails →</span>
          </div>
          {isPremium && ring?.length ? (
            ring.map((r) => (
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
          ) : (
            <span className="text-sm text-stone">
              {isPremium ? 'Aucune donnée reçue pour l’instant.' : 'Inclus dans l’offre Premium : sommeil, VFC et activité entre deux séances.'}
            </span>
          )}
          {cycle ? (
            <span className="text-xs text-stone">
              Phase actuelle : {CYCLE_PHASES[cycle.phase]?.label.toLowerCase()} (J{cycle.cycleDay})
            </span>
          ) : null}
        </button>

        {/* Prochain rendez-vous */}
        <div className={`${card} gap-2.5 p-5`}>
          <h2 className="text-base font-semibold">Prochain rendez-vous</h2>
          {next ? (
            <>
              <span className="font-serif text-[22px]">{whenLabel(next.starts_at)}</span>
              <span className="text-sm text-stone">
                {[next.consultation_type?.name, `${nextMinutes} min`, LOCATION[next.location_type] ?? null].filter(Boolean).join(' · ')}
              </span>
              <button
                type="button"
                onClick={() => onOpen('notes')}
                className="flex h-11 items-center justify-center rounded-[10px] bg-sage-light text-sm font-semibold text-sage hover:bg-sage/20"
              >
                Préparer la séance
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-stone">Aucun rendez-vous prévu.</span>
              <button type="button" onClick={() => onOpen('rdv')} className="flex h-11 items-center justify-center rounded-[10px] border border-divider text-sm hover:border-sage">
                Planifier une séance
              </button>
            </>
          )}
        </div>

        {/* Notes privées */}
        <div className={`${card} gap-3 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Notes privées</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-stone">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Invisibles pour {first}
            </span>
          </div>
          {note.content.trim() ? (
            <>
              <p className="line-clamp-5 whitespace-pre-line rounded-[10px] bg-surface-raised p-3 text-sm leading-relaxed">{note.content.trim()}</p>
              {note.updatedAt ? <span className="text-xs text-stone">Mise à jour le {longFmt.format(new Date(note.updatedAt))}</span> : null}
            </>
          ) : (
            <span className="text-sm text-stone">Aucune note pour l’instant.</span>
          )}
          <button type="button" onClick={() => onOpen('notes')} className="self-start text-sm text-sage hover:text-[#A8E6CF]">
            {note.content.trim() ? 'Ouvrir les notes' : 'Écrire une note'}
          </button>
        </div>
      </aside>
    </div>
  );
}
