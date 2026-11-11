'use client';

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  computeRecap,
  longDate,
  recapHeroPeriod,
  shortDate,
  type Insights,
  type Metric,
  type RecapFrequency,
  type Who,
} from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import { listOpenTopics, pinTopic, unpinTopic, type RecapRow } from '@/lib/wearables/insights/queries';
import { BarChart, ChartLegend } from './BarChart';

const KIND_COLOR = { fav: '#6DD4B8', att: '#E8A87C', data: '#8B95A5', plan: '#B89FD9' } as const;
const TONE = { good: 'text-sage', watch: 'text-[#E8A87C]', flat: 'text-stone' } as const;

export function OverviewTab({
  input,
  insights,
  who,
  consultantId,
  metric,
  onMetric,
  draft,
  sent,
  onOpenRecap,
  onOpenRdv,
}: {
  input: LoadedInsights;
  insights: Insights;
  who: Who;
  consultantId: string;
  metric: Metric;
  onMetric: (m: Metric) => void;
  draft: RecapRow | null;
  sent: boolean;
  onOpenRecap: () => void;
  onOpenRdv: () => void;
}) {
  const p = insights.points;
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  useEffect(() => {
    listOpenTopics(supabase, consultantId)
      .then((ts) => setPinned(new Set(ts.map((t) => t.source_key ?? '').filter(Boolean))))
      .catch(() => undefined);
  }, [consultantId]);

  // Encart « Le récap de … » : le brouillon préparé à 7 h, sinon le calcul en direct.
  const hero = useMemo(() => {
    if (draft) {
      const freq = draft.frequency as RecapFrequency;
      const items = draft.options.filter((o) => draft.points.includes(o.id) && o.id !== 'wear');
      const live = computeRecap(input, freq);
      return { period: recapHeroPeriod(freq, { from: draft.period_from, to: draft.period_to }), items, none: draft.status === 'draft' ? null : live.noneText };
    }
    const r = insights.recap;
    const items = r.options.filter((o) => o.checked && o.id !== 'wear');
    return { period: recapHeroPeriod(r.frequency, r.period), items, none: r.status === 'ok' ? null : r.noneText };
  }, [draft, input, insights.recap]);

  async function togglePin(key: string, text: string, how: string) {
    const on = pinned.has(key);
    try {
      if (on) await unpinTopic(supabase, consultantId, key);
      else await pinTopic(supabase, consultantId, { key, text, detail: how });
      const next = new Set(pinned);
      if (on) next.delete(key);
      else next.add(key);
      setPinned(next);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  const pinCount = p.status === 'ok' ? p.points.filter((pt) => pinned.has(`${p.sessionDate}:${pt.id}`)).length : 0;

  return (
    <>
      <section aria-labelledby="hero-t" className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-[#2F5A50] bg-[#16201F] p-[22px]">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-sage">{hero.period}</span>
          <h3 id="hero-t" className="font-serif text-[22px] font-medium leading-tight">
            Le récap {who.first.match(/^[aeiouyhàâéèêîïôû]/i) ? 'd’' : 'de '}
            {who.first}
          </h3>
          {hero.none ? <span className="text-sm text-stone">{hero.none}</span> : null}
          <ul className="flex flex-col gap-2">
            {hero.items.map((h) => (
              <li key={h.id} className="flex gap-2.5 text-[15px] leading-snug">
                <span aria-hidden className="mt-[7px] h-2 w-2 flex-none rounded-full bg-sage" />
                <span title={h.why}>{h.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-[0_1_260px] flex-col gap-2">
          <button type="button" onClick={onOpenRecap} className="h-11 rounded-[10px] bg-sage px-4 text-sm font-semibold text-ink">
            {sent ? `✓ Récap envoyé à ${who.first}` : `Relire et envoyer à ${who.first}`}
          </button>
        </div>
      </section>

      <section aria-labelledby="pts-t" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="pts-t" className="text-base font-semibold">
            {p.status === 'no_session' ? 'Points à aborder' : `Depuis la séance du ${longDate(p.sessionDate)}`}
          </h3>
          {p.status === 'ok' ? <span className="text-xs text-stone">{p.points.length} {p.points.length > 1 ? 'points à aborder' : 'point à aborder'}</span> : null}
        </div>
        {p.status === 'no_session' ? (
          <Empty title="Pas encore de séance passée." text="Les points à aborder apparaîtront après la première séance." />
        ) : p.status === 'ok' ? (
          <div className="flex flex-col overflow-hidden rounded-xl border border-divider bg-surface">
            {p.points.map((pt) => {
              const key = `${p.sessionDate}:${pt.id}`;
              const on = pinned.has(key);
              return (
                <div key={pt.id} title={pt.how} className="flex min-h-11 items-center gap-3 border-t border-[#1F2633] py-1 pl-3.5 pr-2 first:border-0">
                  <span aria-hidden className="h-2 w-2 flex-none rounded-full" style={{ background: KIND_COLOR[pt.kind] }} />
                  <span className="min-w-0 flex-1 text-sm leading-snug">{pt.text}</span>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => void togglePin(key, pt.text, pt.how)}
                    title={on ? 'Retirer de « À aborder »' : 'Ajouter à « À aborder » de la prochaine séance'}
                    className={`inline-flex h-[30px] flex-none items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium ${on ? 'bg-[#1C2E2A] text-sage' : 'text-stone hover:text-charcoal'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                    </svg>
                    {on ? 'Épinglé' : 'Épingler'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title={p.title} text={p.text} />
        )}
        {pinCount ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] border border-[#2F5A50] bg-[#1C2E2A] px-3.5 py-2.5 text-[13px]">
            {pinCount} {pinCount > 1 ? 'points épinglés' : 'point épinglé'} : à retrouver dans « À aborder » de la prochaine séance, onglet Rendez-vous.{' '}
            <button type="button" onClick={onOpenRdv} className="font-semibold text-sage">
              {input.nextSessionDate ? `Voir la séance du ${shortDate(input.nextSessionDate)} →` : 'Voir l’onglet Rendez-vous →'}
            </button>
          </p>
        ) : null}
      </section>

      <h3 className="-mb-1.5 mt-1 text-base font-semibold">Cette semaine, comparée à d’habitude</h3>
      <div role="tablist" aria-label="Mesure affichée dans le graphique" className="grid grid-cols-2 gap-3">
        {insights.tiles.map((k) => {
          const on = k.metric === metric;
          return (
            <button
              key={k.metric}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onMetric(k.metric)}
              className={`flex flex-col gap-1.5 rounded-[14px] border px-4 py-3.5 text-left ${on ? 'border-sage bg-[#1A2B2A]' : 'border-divider bg-surface'}`}
            >
              <span className="text-[13px] text-stone">{k.label}</span>
              <span className="font-serif text-[26px] leading-tight tabular-nums">{k.value}</span>
              {k.delta ? <span className={`text-[13px] font-semibold tabular-nums ${TONE[k.tone]}`}>{k.delta}</span> : null}
              <span className="text-xs text-stone tabular-nums">D’habitude : {k.usual}</span>
            </button>
          );
        })}
      </div>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-stone">{insights.chart.title} · 28 dernières nuits</span>
          <h3 className="text-lg font-semibold leading-snug">{insights.chart.head}</h3>
        </div>
        <ChartLegend data={insights.chart} />
        <BarChart metric={metric} data={insights.chart} />
      </section>
    </>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-dashed border-divider bg-surface p-[18px]">
      <span className="text-[15px] font-medium">{title}</span>
      <span className="text-[13px] leading-normal text-stone">{text}</span>
    </div>
  );
}
