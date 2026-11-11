'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { Button, Skeleton, showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getConsultantGoals } from '@/lib/queries/dossier';
import type { ConsultantGoal } from '@/lib/types';
import {
  GOAL_METRIC_LABEL,
  RECAP_PERIOD,
  Series,
  WEEKDAY_LABEL,
  addDays,
  autoRuleFor,
  buildRecapText,
  computeInsights,
  describeAutoRule,
  describeSchedule,
  goalTrend,
  shortDate,
  suggestMetric,
  validUntil,
  type InsightsInput,
  type Metric,
  type RecapFrequency,
  type RecapOption,
  type RecapPointId,
  type RecapSettings,
} from '@/lib/wearables/insights';
import { loadInsightsInput, loadPractitionerFirstName } from '@/lib/wearables/insights/load';
import {
  getCurrentRecap,
  getLastVariants,
  getLogSources,
  getRecapSettings,
  listOpenTopics,
  pinTopic,
  saveRecapSettings,
  sendRecap,
  setGoalMetric,
  setItemAutoCheck,
  skipRecap,
  unpinTopic,
  type RecapRow,
} from '@/lib/wearables/insights/queries';

type Tab = 'overview' | 'beforeAfter' | 'habits' | 'recap';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'beforeAfter', label: 'Avant / après le conseillancier' },
  { id: 'habits', label: 'Conseils suivis × mesures' },
  { id: 'recap', label: 'Récap' },
];

const TONE = { good: 'text-sage', watch: 'text-[#E8A87C]', flat: 'text-stone' } as const;
const KIND = {
  fav: { label: 'Évolution favorable', dot: 'bg-sage' },
  att: { label: 'Point d’attention', dot: 'bg-[#E8A87C]' },
  data: { label: 'Données', dot: 'bg-stone' },
  plan: { label: 'Conseillancier', dot: 'bg-[#B89FD9]' },
} as const;
const VERDICT = {
  fav: { label: 'Évolution favorable', cls: 'text-sage' },
  watch: { label: 'À surveiller', cls: 'text-[#E8A87C]' },
  flat: { label: 'Peu de changement', cls: 'text-stone' },
} as const;

const FREQS: { id: RecapFrequency; label: string }[] = [
  { id: '1d', label: 'jour' },
  { id: '1w', label: 'semaine' },
  { id: '2w', label: '2 semaines' },
  { id: '1m', label: 'mois' },
];

const card = 'flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5';

/**
 * Écran « Objet connecté » du dossier : points à aborder, semaine comparée à d'habitude,
 * avant / après le conseillancier, conseils suivis × mesures, objectifs, et récap à valider.
 * Toutes les règles sont dans lib/wearables/insights.
 */
export function WearableInsightsPanel({ consultantId, firstName }: { consultantId: string; firstName: string }) {
  const [input, setInput] = useState<InsightsInput | null>(null);
  const [failed, setFailed] = useState(false);
  const [practitioner, setPractitioner] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState<RecapSettings | null>(null);
  const [draft, setDraft] = useState<RecapRow | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([
      loadInsightsInput(supabase, consultantId, firstName),
      loadPractitionerFirstName(supabase).catch(() => ''),
      getRecapSettings(supabase, consultantId).catch(() => null),
      getCurrentRecap(supabase, consultantId).catch(() => null),
    ])
      .then(([i, p, s, d]) => {
        if (cancelled) return;
        setInput(i);
        setPractitioner(p);
        setSettings(s);
        setDraft(d);
      })
      .catch((e) => {
        console.error('[WearableInsightsPanel]', e instanceof Error ? e.message : e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultantId, firstName, reload]);

  const freq: RecapFrequency = draft?.frequency ?? settings?.frequency ?? '1w';
  const [freqOverride, setFreqOverride] = useState<RecapFrequency | null>(null);
  const effectiveFreq = freqOverride ?? freq;
  const insights = useMemo(() => (input ? computeInsights(input, effectiveFreq) : null), [input, effectiveFreq]);

  if (failed) return <p className="rounded-2xl border border-divider bg-surface p-5 text-sm text-stone">Les analyses de l’objet connecté sont momentanément indisponibles.</p>;
  if (!insights || !input) return <Skeleton className="h-72 rounded-2xl" />;
  if (!input.days.some((d) => d.sleepMin !== null || d.hrvMs !== null || d.steps !== null)) return null;

  const draftReady = draft && draft.status !== 'nothing';

  return (
    <div className="flex flex-col gap-4" data-testid="wearable-insights">
      {draftReady && tab !== 'recap' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sage/40 bg-sage-light px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{RECAP_PERIOD[draft.frequency].label} de {firstName} prêt à valider</span>
            <span className="text-xs text-stone">
              {draft.options.filter((o) => draft.points.includes(o.id)).map((o) => o.label).join(' · ') || 'Rappel de porter l’objet'} · valable jusqu’au {shortDate(draft.valid_until)}
            </span>
          </div>
          <Button size="sm" onClick={() => setTab('recap')}>
            Relire et envoyer
          </Button>
        </div>
      ) : null}

      <div role="tablist" aria-label="Analyses de l’objet connecté" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-divider">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 py-2.5 text-sm font-medium ${tab === t.id ? 'border-sage text-charcoal' : 'border-transparent text-stone hover:text-charcoal'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <Overview insights={insights} consultantId={consultantId} /> : null}
      {tab === 'beforeAfter' ? <BeforeAfter insights={insights} /> : null}
      {tab === 'habits' ? (
        <>
          <Habits insights={insights} input={input} firstName={firstName} consultantId={consultantId} onChanged={() => setReload((k) => k + 1)} />
          <Goals input={input} consultantId={consultantId} />
        </>
      ) : null}
      {tab === 'recap' ? (
        <Recap
          insights={insights}
          freq={effectiveFreq}
          onFreq={setFreqOverride}
          consultantId={consultantId}
          firstName={firstName}
          practitioner={practitioner}
          settings={settings}
          onSettings={setSettings}
          draft={draft && draft.frequency === effectiveFreq ? draft : null}
          onDone={() => {
            setFreqOverride(null);
            setReload((k) => k + 1);
          }}
        />
      ) : null}

      <p className="text-xs leading-relaxed text-stone">
        Indicateurs de bien-être issus d’un objet grand public : ils éclairent l’accompagnement et ne posent aucun diagnostic.
      </p>
    </div>
  );
}

type I = ReturnType<typeof computeInsights>;

// ─── Vue d'ensemble ─────────────────

function Overview({ insights, consultantId }: { insights: I; consultantId: string }) {
  const p = insights.points;
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  useEffect(() => {
    listOpenTopics(supabase, consultantId)
      .then((ts) => setPinned(new Set(ts.map((t) => t.source_key ?? '').filter(Boolean))))
      .catch(() => undefined);
  }, [consultantId]);

  async function togglePin(key: string, text: string, how: string) {
    const on = pinned.has(key);
    try {
      if (on) await unpinTopic(supabase, consultantId, key);
      else await pinTopic(supabase, consultantId, { key, text, detail: how });
      const next = new Set(pinned);
      if (on) next.delete(key);
      else next.add(key);
      setPinned(next);
      if (!on) showToast.success('Épinglé : à retrouver dans « À aborder », onglet Rendez-vous.');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">{p.status === 'no_session' ? 'Points à aborder' : `Depuis la séance du ${shortDate(p.sessionDate)}`}</h3>
          {p.status === 'ok' && p.points.length ? <span className="text-xs text-stone">{p.points.length} {p.points.length > 1 ? 'points à aborder' : 'point à aborder'}</span> : null}
        </div>
        <div className="rounded-2xl border border-divider bg-surface">
          {p.status === 'no_session' ? <Empty title="Pas encore de séance passée." text="Les points à aborder apparaîtront après la première séance." /> : null}
          {p.status === 'not_enough' ? (
            <Empty title="Pas encore assez de recul." text={`${p.nights} nuits mesurées depuis la séance : il en faut ${p.needed} pour proposer un point.`} />
          ) : null}
          {p.status === 'ok' && !p.points.length ? (
            <Empty title="Rien de marquant depuis la séance." text="Ses mesures sont restées dans son habituel et aucun changement ne dépasse les seuils." />
          ) : null}
          {p.status === 'ok'
            ? p.points.map((pt, i) => {
                const key = `${p.sessionDate}:${pt.id}`;
                const on = pinned.has(key);
                return (
                  <div key={pt.id} className={`flex items-start gap-3 px-4 py-3.5 ${i ? 'border-t border-divider' : ''}`}>
                    <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND[pt.kind].dot}`} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm">{pt.text}</span>
                      <span className="text-xs text-stone">
                        {KIND[pt.kind].label} · {pt.how}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => void togglePin(key, pt.text, pt.how)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs ${on ? 'text-sage' : 'text-stone hover:text-charcoal'}`}
                    >
                      {on ? <PinOff className="h-3.5 w-3.5" aria-hidden /> : <Pin className="h-3.5 w-3.5" aria-hidden />}
                      {on ? 'Épinglé' : 'Épingler'}
                    </button>
                  </div>
                );
              })
            : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Cette semaine, comparée à d’habitude</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.tiles.map((t) => (
            <div key={t.metric} className="flex flex-col gap-1 rounded-2xl border border-divider bg-surface p-4">
              <span className="text-[13px] text-stone">{t.label}</span>
              <span className="font-serif text-[26px] tabular-nums">{t.value ?? '—'}</span>
              <span className={`text-[13px] font-semibold ${TONE[t.tone]}`}>{t.delta ?? (t.value ? 'Habituel pas encore connu' : `${t.nights} nuits mesurées sur 7`)}</span>
              {t.usual ? <span className="text-xs text-stone">D’habitude : {t.usual}</span> : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ─── Avant / après ─────────────────

function BeforeAfter({ insights }: { insights: I }) {
  const r = insights.beforeAfter;
  if (r.status === 'no_plan')
    return (
      <div className={card}>
        <Empty title="Aucun conseillancier partagé pour l’instant." text="La comparaison commencera au premier partage." />
      </div>
    );
  const ok = r.rows.filter((x) => x.status === 'ok');
  const nb = ok[0]?.nightsBefore;
  const na = ok[0]?.nightsAfter;
  return (
    <section className={card}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold">Avant et depuis le {shortDate(r.shareDate)}</h3>
        <span className="text-xs text-stone">
          {r.days} jours de chaque côté{nb !== undefined ? ` · ${nb} nuits mesurées avant, ${na} depuis` : ''}
        </span>
      </div>
      {r.rows.map((row) => {
        const max = Math.max(row.before ?? 0, row.after ?? 0) || 1;
        return (
          <div key={row.metric} className="flex flex-col gap-2 border-t border-divider pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{row.label}</span>
              {row.verdict ? <span className={`text-xs font-semibold ${VERDICT[row.verdict].cls}`}>{VERDICT[row.verdict].label}</span> : null}
            </div>
            {row.status === 'ok'
              ? [
                  { l: `Avant le ${shortDate(r.shareDate)}`, v: row.before!, t: row.beforeText!, c: 'bg-stone/50' },
                  { l: 'Depuis', v: row.after!, t: row.afterText!, c: 'bg-sage' },
                ].map((b) => (
                  <div key={b.l} className="grid grid-cols-[120px_1fr_90px] items-center gap-3 text-xs">
                    <span className="text-stone">{b.l}</span>
                    <span className="h-2.5 rounded-full bg-surface-raised">
                      <span className={`block h-full rounded-full ${b.c}`} style={{ width: `${(b.v / max) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{b.t}</span>
                  </div>
                ))
              : null}
            <span className="text-sm text-[#C9CFDA]">{row.sentence}</span>
          </div>
        );
      })}
      <p className="border-t border-divider pt-3 text-xs text-stone">Une observation, pas une preuve : d’autres choses ont pu changer.</p>
    </section>
  );
}

// ─── Conseils suivis × mesures ─────────────────

function Habits({ insights, input, firstName, consultantId, onChanged }: { insights: I; input: InsightsInput; firstName: string; consultantId: string; onChanged: () => void }) {
  const h = insights.habits;
  const [sources, setSources] = useState<Record<string, { consultant: number; object: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    getLogSources(supabase, consultantId, h.window[0] ?? input.today)
      .then(setSources)
      .catch(() => undefined);
  }, [consultantId, h.window, input.today]);

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
    <section className={card}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold">Ses conseils : ce que {firstName} fait, et ce que ça change</h3>
        <span className="text-xs text-stone">
          {h.counted} jours comptés sur les 14 derniers (jours avec au moins une coche). Chaque jour est comparé à la nuit qui suit.
        </span>
      </div>
      {!h.rows.length ? (
        <Empty title="Aucun conseil suivi dans la checklist." text="Cochez « Suivre dans le journal » dans le conseillancier pour en ajouter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-stone">
                <th scope="col" className="py-2 pr-3 font-semibold">Conseil</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Fait</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Sur ses nuits</th>
                <th scope="col" className="py-2 text-right font-semibold">Coché par</th>
              </tr>
            </thead>
            <tbody>
              {h.rows.map((r) => {
                const item = input.items.find((x) => x.id === r.itemId);
                const rule = item ? autoRuleFor(item) : null;
                const on = Boolean(item?.autoCheck);
                const src = sources[r.itemId];
                return (
                  <tr key={r.itemId} className="border-b border-divider/60 align-top">
                    <th scope="row" className="py-3 pr-3 text-left font-medium">{r.label}</th>
                    <td className="w-[150px] py-3 pr-3" title={src ? `Coché par ${firstName} : ${src.consultant} · par l’objet : ${src.object}` : undefined}>
                      <span className="tabular-nums">
                        {r.done} jours sur {r.counted}
                      </span>
                      <span className="mt-1.5 block h-1.5 rounded-full bg-surface-raised">
                        <span className="block h-full rounded-full bg-sage" style={{ width: `${r.counted ? (r.done / r.counted) * 100 : 0}%` }} />
                      </span>
                    </td>
                    <td className={`py-3 pr-3 ${r.metric ? '' : 'text-stone'}`} title={r.how}>
                      {r.effect}
                    </td>
                    <td className="w-[150px] py-3 text-right">
                      {rule ? (
                        <span className="inline-flex items-center gap-2">
                          <span className={`text-xs ${on ? 'text-sage' : 'text-stone'}`}>{on ? 'l’objet' : firstName}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`Cocher automatiquement avec l’objet : ${r.label}`}
                            title={describeAutoRule(rule)}
                            disabled={busy === r.itemId}
                            onClick={() => void toggle(r.itemId, !on)}
                            className={`relative h-6 w-10 rounded-full transition-colors ${on ? 'bg-sage' : 'bg-[#3A4252]'} disabled:opacity-50`}
                          >
                            <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-ink transition-all ${on ? 'left-[19px]' : 'left-[3px]'}`} />
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-stone">{firstName}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs leading-relaxed text-stone">
        Un effet n’est indiqué qu’avec au moins 4 jours faits et 4 non faits, et seulement s’il dépasse les seuils (20 min, 3 ms, 3 bpm, 1 000 pas). Observations sur peu de jours, à discuter avec {firstName}, pas à conclure. « Coché par l’objet » : l’item se coche à la synchronisation suivante quand l’objet le mesure ; la saisie de {firstName} a toujours priorité.
      </p>
    </section>
  );
}

// ─── Objectifs reliés à une mesure ─────────────────

function Goals({ input, consultantId }: { input: InsightsInput; consultantId: string }) {
  const [goals, setGoals] = useState<ConsultantGoal[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const series = useMemo(() => new Series(input.days, input.today), [input]);
  const load = useCallback(() => {
    getConsultantGoals(consultantId).then(setGoals).catch(() => setGoals([]));
  }, [consultantId]);
  useEffect(load, [load]);

  async function link(goal: ConsultantGoal, metric: Metric | null) {
    try {
      await setGoalMetric(supabase, goal.id, metric);
      setGoals((gs) => (gs ?? []).map((g) => (g.id === goal.id ? { ...g, metric } : g)));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  if (!goals) return <Skeleton className="h-32 rounded-2xl" />;
  return (
    <section className={card}>
      <h3 className="text-base font-semibold">Ses objectifs</h3>
      {!goals.length ? <Empty title="Aucun objectif fixé." text="Les objectifs se fixent dans l’onglet Profil du dossier." /> : null}
      {goals.map((g, i) => {
        const metric = (g.metric ?? null) as Metric | null;
        const trend = metric ? goalTrend(series, metric, g.set_on) : null;
        const suggestion = !metric && !dismissed.has(g.id) ? suggestMetric(g.label) : null;
        return (
          <div key={g.id} className={`flex flex-col gap-2 py-2 ${i ? 'border-t border-divider pt-3' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{g.label}</span>
                <span className="text-xs text-stone">{metric ? `Fixé le ${shortDate(g.set_on)}` : 'Suivi dans le journal'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {trend ? (
                  <span className="text-sm tabular-nums" title="Moyenne des 14 nuits avant l’objectif, puis des 14 dernières">
                    {trend.start ?? '—'} → {trend.now ?? '—'}
                  </span>
                ) : null}
                <label className="sr-only" htmlFor={`goal-metric-${g.id}`}>
                  Relier « {g.label} » à une mesure
                </label>
                <select
                  id={`goal-metric-${g.id}`}
                  value={metric ?? ''}
                  onChange={(e) => void link(g, (e.target.value || null) as Metric | null)}
                  className="h-8 rounded-full border border-divider bg-surface px-3 text-xs"
                >
                  <option value="">Relier à une mesure</option>
                  {(Object.keys(GOAL_METRIC_LABEL) as Metric[]).map((m) => (
                    <option key={m} value={m}>
                      Relié à : {GOAL_METRIC_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {suggestion ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2 text-[13px]">
                <span>Suggestion d’après le texte de l’objectif : relier à « {GOAL_METRIC_LABEL[suggestion]} ».</span>
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => void link(g, suggestion)}>
                    Relier
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDismissed(new Set(dismissed).add(g.id))}>
                    Ignorer
                  </Button>
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

// ─── Récap ─────────────────

function Recap({
  insights,
  freq,
  onFreq,
  consultantId,
  firstName,
  practitioner,
  settings,
  onSettings,
  draft,
  onDone,
}: {
  insights: I;
  freq: RecapFrequency;
  onFreq: (f: RecapFrequency) => void;
  consultantId: string;
  firstName: string;
  practitioner: string;
  settings: RecapSettings | null;
  onSettings: (s: RecapSettings) => void;
  draft: RecapRow | null;
  onDone: () => void;
}) {
  // Le brouillon préparé à 7 h fait foi ; sinon, calcul en direct sur la période choisie.
  const live = insights.recap;
  const options: RecapOption[] = draft ? draft.options : live.options;
  const status = draft ? (draft.status === 'draft' ? 'ok' : draft.status) : live.status;
  const period = draft ? { from: draft.period_from, to: draft.period_to, days: RECAP_PERIOD[draft.frequency].days } : live.period;

  const [checked, setChecked] = useState<Set<RecapPointId>>(new Set());
  const [text, setText] = useState('');
  const [variants, setVariants] = useState<Partial<Record<RecapPointId, 0 | 1>>>({});
  const [lastVariants, setLastVariants] = useState<Partial<Record<RecapPointId, 0 | 1>>>({});
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    getLastVariants(supabase, consultantId).then(setLastVariants).catch(() => undefined);
  }, [consultantId]);

  // Cases cochées d'office : celles du brouillon, sinon celles du calcul.
  useEffect(() => {
    setTouched(false);
    setChecked(new Set(draft ? draft.points : options.filter((o) => o.checked).map((o) => o.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, live]);

  // Changer les cases ou la fréquence régénère le texte et remplace les modifications.
  useEffect(() => {
    const points = options.filter((o) => checked.has(o.id)).map((o) => o.id);
    if (!points.length) {
      setText('');
      return;
    }
    if (draft?.body && !touched) {
      setText(draft.body);
      setVariants(draft.variants);
      return;
    }
    const built = buildRecapText({ firstName, practitionerFirstName: practitioner, frequency: freq, points, lastVariants });
    setText(built.text);
    setVariants(built.variants);
  }, [checked, freq, firstName, practitioner, lastVariants, options, draft, touched]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendRecap(supabase, {
        consultantId,
        recapId: draft?.id ?? null,
        text: text.trim(),
        points: options.filter((o) => checked.has(o.id)).map((o) => o.id),
        variants,
        frequency: freq,
        period,
        options,
      });
      showToast.success(`Récap envoyé à ${firstName} dans sa messagerie.`);
      onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  async function skip() {
    if (!draft) return;
    try {
      await skipRecap(supabase, draft.id);
      onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <>
      <RecapSettingsCard consultantId={consultantId} settings={settings} onSaved={(s) => { onSettings(s); onFreq(s.frequency); }} />
      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold">{RECAP_PERIOD[freq].label}</h3>
            <span className="text-xs text-stone">
              Du {shortDate(period.from)} au {shortDate(period.to)}
              {draft ? ` · préparé le ${shortDate(draft.prepared_for)}, valable jusqu’au ${shortDate(draft.valid_until)}` : ` · ${live.nightsMeasured} nuits mesurées sur ${live.period.days}`}
            </span>
          </div>
          {!draft ? (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-stone">Aperçu sur</span>
              <select value={freq} onChange={(e) => onFreq(e.target.value as RecapFrequency)} className="h-9 rounded-lg border border-divider bg-surface px-2 text-sm">
                {FREQS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {RECAP_PERIOD[f.id].label.replace('Récap ', '')}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {status === 'nothing' ? (
          <Empty title="Pas de récap cette fois : rien de nouveau à encourager." text="Vous pouvez toujours écrire un message libre depuis la messagerie." />
        ) : (
          <>
            {status === 'not_enough' ? <p className="text-sm text-stone">Pas assez de nuits mesurées : seul un rappel de porter l’objet est proposé.</p> : null}
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone">Points à inclure</legend>
              {options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-raised">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#6DD4B8]"
                    checked={checked.has(o.id)}
                    onChange={(e) => {
                      const next = new Set(checked);
                      if (e.target.checked) next.add(o.id);
                      else next.delete(o.id);
                      setTouched(true);
                      setChecked(next);
                    }}
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{o.label}</span>
                    <span className="text-xs text-stone">{o.why}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone">Message</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="rounded-xl border border-divider bg-ink px-3 py-2.5 text-sm leading-relaxed" />
              <span className="text-xs text-stone">Modifier les cases régénère le texte et remplace vos modifications. Rien ne part sans « Envoyer ».</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              {draft ? (
                <Button variant="ghost" onClick={() => void skip()}>
                  Pas cette fois
                </Button>
              ) : null}
              <Button onClick={() => void send()} loading={sending} disabled={!text.trim()}>
                Envoyer à {firstName}
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function RecapSettingsCard({ consultantId, settings, onSaved }: { consultantId: string; settings: RecapSettings | null; onSaved: (s: RecapSettings) => void }) {
  const [s, setS] = useState<RecapSettings | null>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings), [settings]);
  if (!s) return null;
  const today = new Date().toISOString().slice(0, 10);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await saveRecapSettings(supabase, consultantId, s);
      onSaved(s);
      showToast.success('Réglage enregistré.');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Réglage non enregistré.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold">Me le proposer régulièrement</h3>
          <span className="text-xs text-stone">
            {s.enabled ? `${describeSchedule(s)}, à 7 h. Le brouillon reste valable jusqu’au ${shortDate(validUntil(s, today))} s’il est préparé aujourd’hui.` : 'Aucun brouillon ne sera préparé.'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={s.enabled}
          aria-label="Me proposer le récap régulièrement"
          onClick={() => setS({ ...s, enabled: !s.enabled })}
          className={`relative h-6 w-10 rounded-full ${s.enabled ? 'bg-sage' : 'bg-[#3A4252]'}`}
        >
          <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-ink transition-all ${s.enabled ? 'left-[19px]' : 'left-[3px]'}`} />
        </button>
      </div>
      {s.enabled ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Chaque</span>
          <select
            aria-label="Fréquence"
            value={s.frequency}
            onChange={(e) => setS({ ...s, frequency: e.target.value as RecapFrequency, anchor: addDays(today, 0) })}
            className="h-9 rounded-lg border border-divider bg-surface px-2"
          >
            {FREQS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span>{s.frequency === '1m' ? 'le premier' : 'le'}</span>
          <span className="flex flex-wrap gap-1" role="group" aria-label="Jours">
            {WEEKDAY_LABEL.map((l, i) => {
              const d = i + 1;
              const on = s.weekdays.includes(d);
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d].sort();
                    if (next.length) setS({ ...s, weekdays: next });
                  }}
                  className={`h-8 min-w-[44px] rounded-full border px-2 text-xs ${on ? 'border-sage bg-sage text-ink' : 'border-divider text-stone'}`}
                >
                  {l}
                </button>
              );
            })}
          </span>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => void save()} loading={saving}>
          Enregistrer
        </Button>
      </div>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-5">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-[13px] text-stone">{text}</span>
    </div>
  );
}
