'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Skeleton, showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { sendMessage } from '@/lib/queries';
import {
  RECAP_PERIOD,
  buildRecapText,
  computeInsights,
  shortDate,
  type InsightsInput,
  type RecapFrequency,
  type RecapPointId,
} from '@/lib/wearables/insights';
import { loadInsightsInput, loadPractitionerFirstName } from '@/lib/wearables/insights/load';

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
  { id: '1d', label: 'Chaque jour' },
  { id: '1w', label: 'Chaque semaine' },
  { id: '2w', label: 'Toutes les 2 semaines' },
  { id: '1m', label: 'Chaque mois' },
];

const card = 'flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5';

function readVariants(consultantId: string): Partial<Record<RecapPointId, 0 | 1>> {
  try {
    return JSON.parse(localStorage.getItem(`afeia:recap-variants:${consultantId}`) ?? '{}');
  } catch {
    return {};
  }
}
function saveVariants(consultantId: string, v: Partial<Record<RecapPointId, 0 | 1>>) {
  try {
    localStorage.setItem(`afeia:recap-variants:${consultantId}`, JSON.stringify(v));
  } catch {
    /* préférence locale seulement */
  }
}

/**
 * Écran « Objet connecté » du dossier : points à aborder, semaine comparée à d'habitude,
 * avant / après le conseillancier, conseils suivis × mesures, et récap à valider.
 * Toutes les règles sont dans lib/wearables/insights.
 */
export function WearableInsightsPanel({ consultantId, firstName }: { consultantId: string; firstName: string }) {
  const [input, setInput] = useState<InsightsInput | null>(null);
  const [failed, setFailed] = useState(false);
  const [practitioner, setPractitioner] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [freq, setFreq] = useState<RecapFrequency>('1w');

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([loadInsightsInput(supabase, consultantId, firstName), loadPractitionerFirstName(supabase).catch(() => '')])
      .then(([i, p]) => {
        if (cancelled) return;
        setInput(i);
        setPractitioner(p);
      })
      .catch((e) => {
        console.error('[WearableInsightsPanel]', e instanceof Error ? e.message : e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultantId, firstName]);

  const insights = useMemo(() => (input ? computeInsights(input, freq) : null), [input, freq]);

  if (failed) return <p className="rounded-2xl border border-divider bg-surface p-5 text-sm text-stone">Les analyses de l’objet connecté sont momentanément indisponibles.</p>;
  if (!insights || !input) return <Skeleton className="h-72 rounded-2xl" />;
  if (!input.days.some((d) => d.sleepMin !== null || d.hrvMs !== null || d.steps !== null)) return null;

  return (
    <div className="flex flex-col gap-4" data-testid="wearable-insights">
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

      {tab === 'overview' ? <Overview insights={insights} /> : null}
      {tab === 'beforeAfter' ? <BeforeAfter insights={insights} /> : null}
      {tab === 'habits' ? <Habits insights={insights} firstName={firstName} /> : null}
      {tab === 'recap' ? (
        <Recap insights={insights} freq={freq} onFreq={setFreq} consultantId={consultantId} firstName={firstName} practitioner={practitioner} />
      ) : null}

      <p className="text-xs leading-relaxed text-stone">
        Indicateurs de bien-être issus d’un objet grand public : ils éclairent l’accompagnement et ne posent aucun diagnostic.
      </p>
    </div>
  );
}

type I = ReturnType<typeof computeInsights>;

function Overview({ insights }: { insights: I }) {
  const p = insights.points;
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
            ? p.points.map((pt, i) => (
                <div key={pt.id} className={`flex items-start gap-3 px-4 py-3.5 ${i ? 'border-t border-divider' : ''}`} title={pt.how}>
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND[pt.kind].dot}`} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm">{pt.text}</span>
                    <span className="text-xs text-stone">
                      {KIND[pt.kind].label} · {pt.how}
                    </span>
                  </div>
                </div>
              ))
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

function BeforeAfter({ insights }: { insights: I }) {
  const r = insights.beforeAfter;
  if (r.status === 'no_plan') return <div className={card}><Empty title="Aucun conseillancier partagé pour l’instant." text="La comparaison commencera au premier partage." /></div>;
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
            {row.status === 'ok' ? (
              <>
                {[
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
                ))}
              </>
            ) : null}
            <span className="text-sm text-[#C9CFDA]">{row.sentence}</span>
          </div>
        );
      })}
      <p className="border-t border-divider pt-3 text-xs text-stone">Une observation, pas une preuve : d’autres choses ont pu changer.</p>
    </section>
  );
}

function Habits({ insights, firstName }: { insights: I; firstName: string }) {
  const h = insights.habits;
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
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-stone">
                <th scope="col" className="py-2 pr-3 font-semibold">Conseil</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Fait</th>
                <th scope="col" className="py-2 font-semibold">Sur ses nuits</th>
              </tr>
            </thead>
            <tbody>
              {h.rows.map((r) => (
                <tr key={r.itemId} className="border-b border-divider/60 align-top">
                  <th scope="row" className="py-3 pr-3 text-left font-medium">{r.label}</th>
                  <td className="w-[150px] py-3 pr-3">
                    <span className="tabular-nums">{r.done} jours sur {r.counted}</span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-surface-raised">
                      <span className="block h-full rounded-full bg-sage" style={{ width: `${r.counted ? (r.done / r.counted) * 100 : 0}%` }} />
                    </span>
                  </td>
                  <td className={`py-3 ${r.metric ? '' : 'text-stone'}`} title={r.how}>
                    {r.effect}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs leading-relaxed text-stone">
        Un effet n’est indiqué qu’avec au moins 4 jours faits et 4 non faits, et seulement s’il dépasse les seuils (20 min, 3 ms, 3 bpm, 1 000 pas). Observations sur peu de jours, à discuter avec {firstName}, pas à conclure.
      </p>
    </section>
  );
}

function Recap({
  insights,
  freq,
  onFreq,
  consultantId,
  firstName,
  practitioner,
}: {
  insights: I;
  freq: RecapFrequency;
  onFreq: (f: RecapFrequency) => void;
  consultantId: string;
  firstName: string;
  practitioner: string;
}) {
  const r = insights.recap;
  const [checked, setChecked] = useState<Set<RecapPointId>>(new Set());
  const [text, setText] = useState('');
  const [variants, setVariants] = useState<Partial<Record<RecapPointId, 0 | 1>>>({});
  const [sending, setSending] = useState(false);

  // Cases cochées d'office à chaque nouveau calcul (fréquence changée, données relues).
  useEffect(() => {
    setChecked(new Set(r.options.filter((o) => o.checked).map((o) => o.id)));
  }, [r]);

  // Changer les cases ou la fréquence régénère le texte et remplace les modifications.
  useEffect(() => {
    const points = r.options.filter((o) => checked.has(o.id)).map((o) => o.id);
    if (!points.length) {
      setText('');
      return;
    }
    const built = buildRecapText({ firstName, practitionerFirstName: practitioner, frequency: freq, points, lastVariants: readVariants(consultantId) });
    setText(built.text);
    setVariants(built.variants);
  }, [checked, freq, firstName, practitioner, consultantId, r.options]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const sent = await sendMessage(consultantId, text.trim(), 'praticien');
    setSending(false);
    if (!sent) {
      showToast.error('Le récap n’a pas pu être envoyé. Réessayez.');
      return;
    }
    saveVariants(consultantId, { ...readVariants(consultantId), ...variants });
    showToast.success(`Récap envoyé à ${firstName} dans sa messagerie.`);
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">{RECAP_PERIOD[freq].label}</h3>
          <span className="text-xs text-stone">
            Du {shortDate(r.period.from)} au {shortDate(r.period.to)} · {r.nightsMeasured} nuits mesurées sur {r.period.days}
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone">Période</span>
          <select value={freq} onChange={(e) => onFreq(e.target.value as RecapFrequency)} className="h-9 rounded-lg border border-divider bg-surface px-2 text-sm">
            {FREQS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {r.status === 'nothing' ? (
        <Empty title="Pas de récap cette fois : rien de nouveau à encourager." text="Vous pouvez toujours écrire un message libre depuis la messagerie." />
      ) : (
        <>
          {r.status === 'not_enough' ? (
            <p className="text-sm text-stone">
              Pas assez de nuits mesurées ({r.nightsMeasured} sur {r.nightsNeeded} nécessaires) : seul un rappel de porter l’objet est proposé.
            </p>
          ) : null}
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone">Points à inclure</legend>
            {r.options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-raised">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#6DD4B8]"
                  checked={checked.has(o.id)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    if (e.target.checked) next.add(o.id);
                    else next.delete(o.id);
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
            <span className="text-xs text-stone">Modifier les cases ou la période régénère le texte et remplace vos modifications.</span>
          </label>
          <div className="flex justify-end">
            <Button onClick={() => void send()} loading={sending} disabled={!text.trim()}>
              Envoyer à {firstName}
            </Button>
          </div>
        </>
      )}
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
