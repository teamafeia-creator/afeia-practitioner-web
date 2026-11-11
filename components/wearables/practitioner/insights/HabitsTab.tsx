'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton, showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getConsultantGoals } from '@/lib/queries/dossier';
import type { ConsultantGoal } from '@/lib/types';
import {
  GOAL_METRIC_LABEL,
  GOAL_TARGET_PLACEHOLDER,
  autoRuleFor,
  describeAutoRule,
  goalTrend,
  suggestMetric,
  type Insights,
  type Metric,
  type Who,
} from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import { getLogSources, setGoalMetric, setItemAutoCheck } from '@/lib/wearables/insights/queries';

/** Onglet « Conseils suivis × mesures » (maquette 19d). */
export function HabitsTab({ input, insights, who, onChanged, onOpenGoals }: { input: LoadedInsights; insights: Insights; who: Who; onChanged: () => void; onOpenGoals: () => void }) {
  const h = insights.habits;
  const [sources, setSources] = useState<Record<string, { consultant: number; object: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    getLogSources(supabase, input.consultantId, h.window[0] ?? input.today)
      .then(setSources)
      .catch(() => undefined);
  }, [input, h.window]);

  async function toggle(itemId: string, on: boolean) {
    setBusy(itemId);
    try {
      await setItemAutoCheck(supabase, itemId, on);
      onChanged();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Réglage impossible.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-1 rounded-2xl border border-divider bg-surface p-5">
        <h3 className="text-lg font-semibold">Ses conseils : ce {who.que} fait, et ce que ça change</h3>
        <span className="pb-2 text-[13px] text-stone">
          Les jours où {who.subj} a rempli sa checklist. Pour chacun de ses conseils, on compare ses nuits les jours où {who.subj} l’a fait et les jours où {who.subj} ne l’a pas fait.
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-divider py-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#5C6573]">
          <span className="flex-[1_1_220px]">Conseil</span>
          <span className="flex-[0_0_150px]">Fait</span>
          <span className="flex-[2_1_280px]">Sur ses nuits</span>
          <span className="flex-[0_0_150px] text-right">Coché par</span>
        </div>
        {!h.rows.length ? (
          <p className="py-4 text-sm text-stone">Aucun conseil suivi dans la checklist pour l’instant.</p>
        ) : (
          h.rows.map((r) => {
            const item = input.items.find((x) => x.id === r.itemId);
            const rule = item ? autoRuleFor(item) : null;
            const on = Boolean(item?.autoCheck);
            const src = sources[r.itemId];
            return (
              <div key={r.itemId} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1F2633] py-3.5">
                <span className="min-w-0 flex-[1_1_220px] text-sm font-medium">{r.label}</span>
                <span className="flex flex-[0_0_150px] flex-col gap-[5px]" title={src ? `Coché par ${who.first} : ${src.consultant} · par l’objet : ${src.object}` : undefined}>
                  <span className="text-[13px] tabular-nums">{r.doneLabel}</span>
                  <span aria-hidden className="h-[5px] overflow-hidden rounded-[3px] bg-[#1C2230]">
                    <span className="block h-full rounded-[3px] bg-sage" style={{ width: `${Math.round((r.done / Math.max(1, r.counted)) * 100)}%` }} />
                  </span>
                </span>
                <span className={`flex flex-[2_1_280px] items-start gap-2 text-sm leading-snug ${r.metric ? 'text-charcoal' : 'text-stone'}`}>
                  <span aria-hidden className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: r.metric ? '#6DD4B8' : '#5C6573' }} />
                  <span title={r.how}>{r.effect}</span>
                </span>
                <span className="flex flex-[0_0_150px] items-center justify-end gap-2">
                  {rule ? (
                    <>
                      <span className={`text-xs ${on ? 'text-sage' : 'text-stone'}`}>{on ? 'l’objet' : who.first}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Cocher automatiquement avec l’objet : ${r.label}`}
                        title={describeAutoRule(rule, who.subj)}
                        disabled={busy === r.itemId}
                        onClick={() => void toggle(r.itemId, !on)}
                        className={`relative h-6 w-10 flex-none rounded-full ${on ? 'bg-sage' : 'bg-[#3A4252]'} disabled:opacity-50`}
                      >
                        <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-ink ${on ? 'left-[19px]' : 'left-[3px]'}`} />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-stone">{who.first}</span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <span className="pt-2 text-xs leading-normal text-stone">
          Un effet n’est indiqué qu’avec au moins 4 jours faits et 4 non faits, et seulement s’il est net. Ce sont des observations à discuter avec {who.first}, pas des preuves. « Coché par l’objet » : l’item se coche tout seul quand l’objet le mesure ; {who.first} peut toujours corriger.
        </span>
      </section>
      <Goals input={input} insights={insights} onOpenGoals={onOpenGoals} />
    </>
  );
}

function Goals({ input, insights, onOpenGoals }: { input: LoadedInsights; insights: Insights; onOpenGoals: () => void }) {
  const consultantId = input.consultantId;
  const [goals, setGoals] = useState<ConsultantGoal[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ k: Metric | null; target: string }>({ k: null, target: '' });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const load = useCallback(() => {
    getConsultantGoals(consultantId).then(setGoals).catch(() => setGoals([]));
  }, [consultantId]);
  useEffect(load, [load]);
  const trends = useMemo(() => {
    const out: Partial<Record<Metric, ReturnType<typeof goalTrend>>> = {};
    for (const m of Object.keys(GOAL_METRIC_LABEL) as Metric[]) out[m] = goalTrend(input, insights.series, m);
    return out;
  }, [input, insights.series]);

  async function save(g: ConsultantGoal, k: Metric | null, target: string) {
    try {
      await setGoalMetric(supabase, g.id, k, target);
      setGoals((gs) => (gs ?? []).map((x) => (x.id === g.id ? { ...x, metric: k, metric_target: k ? target || null : null } : x)));
      setOpen(null);
      showToast.success(k ? `Objectif relié à « ${GOAL_METRIC_LABEL[k]} ».` : 'Objectif détaché de l’objet connecté.');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  if (!goals) return <Skeleton className="h-32 rounded-2xl" />;
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">Ses objectifs</h3>
        <button type="button" onClick={onOpenGoals} className="text-[13px] text-sage">
          Voir les objectifs →
        </button>
      </div>
      {!goals.length ? <p className="text-sm text-stone">Aucun objectif fixé pour l’instant.</p> : null}
      {goals.map((g) => {
        const k = (g.metric ?? null) as Metric | null;
        const target = (g as ConsultantGoal & { metric_target?: string | null }).metric_target ?? '';
        const isOpen = open === g.id;
        const sugg = !k && !dismissed.has(g.id) ? suggestMetric(g.label) : null;
        const t = k ? trends[k] : null;
        return (
          <div key={g.id} className="flex flex-col gap-2.5 border-t border-[#1F2633] pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
                <span className="text-sm font-medium">{g.label}</span>
                <span className="text-xs text-stone">{k ? (target ? `Cible : ${target}` : '') : 'Suivi dans le journal'}</span>
              </div>
              {t ? (
                <span className="flex items-center gap-3">
                  {t.spark ? (
                    <svg viewBox="0 0 120 30" width="120" height="30" role="img" aria-label={t.aria} className="block overflow-visible">
                      <rect x="0" y={t.spark.bandY} width="120" height={Math.max(0, t.spark.bandH)} fill="rgba(232,237,244,0.08)" />
                      <path d={t.spark.d} fill="none" stroke="#6DD4B8" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  <span className="text-sm font-semibold tabular-nums">{t.value}</span>
                </span>
              ) : null}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  if (isOpen) setOpen(null);
                  else {
                    setOpen(g.id);
                    setDraft({ k, target });
                  }
                }}
                className={`h-8 rounded-full border px-3 text-xs font-medium ${k ? 'border-[#2F5A50] bg-[#1C2E2A] text-sage' : 'border-divider text-[#B8C1CF]'}`}
              >
                {k ? `Relié à : ${GOAL_METRIC_LABEL[k]}` : 'Relier à une mesure'} ▾
              </button>
            </div>
            {sugg && !isOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#1C2230] px-3 py-2 text-[13px]">
                <span>Suggestion d’après le texte de l’objectif : relier à « {GOAL_METRIC_LABEL[sugg]} ».</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => void save(g, sugg, '')} className="h-8 rounded-lg bg-sage px-3 text-xs font-semibold text-ink">
                    Relier
                  </button>
                  <button type="button" onClick={() => setDismissed(new Set(dismissed).add(g.id))} className="h-8 rounded-lg px-3 text-xs text-stone">
                    Ignorer
                  </button>
                </span>
              </div>
            ) : null}
            {isOpen ? (
              <div className="flex flex-col gap-3 rounded-xl bg-[#1C2230] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-xs text-stone">Mesure</span>
                  {([null, ...(Object.keys(GOAL_METRIC_LABEL) as Metric[])] as (Metric | null)[]).map((q) => {
                    const on = draft.k === q;
                    return (
                      <button
                        key={q ?? 'none'}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDraft({ ...draft, k: q })}
                        className={`h-8 rounded-full border px-3 text-xs ${on ? 'border-sage bg-sage text-ink' : 'border-divider text-[#B8C1CF]'}`}
                      >
                        {q ? GOAL_METRIC_LABEL[q] : 'Aucune'}
                      </button>
                    );
                  })}
                </div>
                {draft.k ? (
                  <label className="flex flex-wrap items-center gap-2">
                    <span className="w-16 text-xs text-stone">Cible</span>
                    <input
                      type="text"
                      value={draft.target}
                      placeholder={GOAL_TARGET_PLACEHOLDER[draft.k]}
                      onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-divider bg-ink px-3 text-sm"
                    />
                  </label>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(null)} className="h-9 rounded-lg border border-divider px-3 text-sm">
                    Annuler
                  </button>
                  <button type="button" onClick={() => void save(g, draft.k, draft.target)} className="h-9 rounded-lg bg-sage px-3.5 text-sm font-semibold text-ink">
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
