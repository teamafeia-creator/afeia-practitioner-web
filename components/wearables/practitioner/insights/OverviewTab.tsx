'use client';

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { fmtDuration, longDate, shortDate, type Insights, type LastNight, type Metric, type Who } from '@/lib/wearables/insights';
import type { LastSleepDetails } from '@/lib/wearables/insights/load';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import { listOpenTopics, pinTopic, unpinTopic } from '@/lib/wearables/insights/queries';
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
  onOpenRdv,
  part,
}: {
  input: LoadedInsights;
  insights: Insights;
  who: Who;
  consultantId: string;
  metric: Metric;
  onMetric: (m: Metric) => void;
  onOpenRdv: () => void;
  /** Lecture guidée : n'afficher qu'une partie de l'ancienne vue d'ensemble. */
  part?: 'night' | 'session' | 'week';
}) {
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
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  const pinCount = p.status === 'ok' ? p.points.filter((pt) => pinned.has(`${p.sessionDate}:${pt.id}`)).length : 0;

  const show = (p: 'night' | 'session' | 'week') => !part || part === p;
  return (
    <>
      {show('night') ? <LastNightBlock night={insights.lastNight} sleep={input.lastSleep} who={who} /> : null}

      {show('session') ? <section aria-labelledby="pts-t" className="flex flex-col gap-3">
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
      </section> : null}

      {show('week') ? <>
      {!part ? <h3 className="-mb-1.5 mt-1 text-base font-semibold">Cette semaine, comparée à d’habitude</h3> : null}
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
              {k.sentence ? <span className="mt-0.5 text-xs leading-snug text-[#B8C1CF]">{k.sentence}</span> : null}
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
      </> : null}
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

// ─── Dernière nuit ─────────────────

const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const fmtTime = (iso: string) => PARIS_TIME.format(new Date(iso)).replace(':', ' h ');

function nightTitle(night: Extract<LastNight, { status: 'ok' }>): string {
  if (night.ageNights === 0) return 'La nuit dernière';
  if (night.ageNights === 1) return 'L’avant-dernière nuit';
  return `Dernière nuit mesurée : ${longDate(night.day)}`;
}

/** Bloc en tête de l'onglet : la nuit la plus récente, comparée à l'habituel, puis son détail. */
export function LastNightBlock({ night, sleep, who }: { night: LastNight; sleep: LastSleepDetails | null; who: Who }) {
  if (night.status !== 'ok') {
    return (
      <section aria-labelledby="night-t" className="flex flex-col gap-3" data-testid="last-night">
        <h3 id="night-t" className="text-base font-semibold">Dernière nuit</h3>
        <Empty title="Aucune nuit mesurée ces 7 derniers jours." text={`${who.first} n’a pas porté l’objet connecté, ou les données ne sont pas encore arrivées.`} />
      </section>
    );
  }
  const detail = sleep && sleep.day === night.day ? sleep : null;
  const parts: string[] = [];
  if (detail?.sleepStartAt && detail.sleepEndAt) parts.push(`Couché à ${fmtTime(detail.sleepStartAt)}, levé à ${fmtTime(detail.sleepEndAt)}`);
  if (detail?.deepMin !== null && detail?.deepMin !== undefined) parts.push(`profond ${fmtDuration(detail.deepMin)}`);
  if (detail?.remMin !== null && detail?.remMin !== undefined) parts.push(`paradoxal ${fmtDuration(detail.remMin)}`);
  if (detail?.interruptionMin) parts.push(`éveillé ${detail.interruptionMin} min`);
  if (detail?.score !== null && detail?.score !== undefined) parts.push(`score Polar ${detail.score}/100`);

  return (
    <section aria-labelledby="night-t" className="flex flex-col gap-3" data-testid="last-night">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="night-t" className="text-base font-semibold">{nightTitle(night)}</h3>
        <span className="text-xs text-stone">
          {night.ageNights <= 1 ? `Réveil du ${longDate(night.day)}` : `Il y a ${night.ageNights} nuits`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {night.tiles.map((k) => (
          <div key={k.metric} className="flex flex-col gap-1.5 rounded-[14px] border border-divider bg-surface px-4 py-3.5" data-testid={`last-night-${k.metric}`}>
            <span className="text-[13px] text-stone">{k.label}</span>
            <span className="font-serif text-[26px] leading-tight tabular-nums">{k.value}</span>
            {k.delta ? <span className={`text-[13px] font-semibold tabular-nums ${TONE[k.tone]}`}>{k.delta}</span> : null}
            <span className="text-xs text-stone tabular-nums">D’habitude : {k.usual}</span>
          </div>
        ))}
      </div>
      {parts.length ? <p className="text-[13px] text-stone">{parts.join(' · ')}</p> : null}
    </section>
  );
}
