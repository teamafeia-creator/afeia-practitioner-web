'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Skeleton, showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatRelative } from '@/lib/wearables/display';
import { computeInsights, longDate, shortDate, who, type Metric, type RecapFrequency, type RecapSettings } from '@/lib/wearables/insights';
import { loadInsightsInput, loadPractitionerName, type LoadedInsights } from '@/lib/wearables/insights/load';
import { getCurrentRecap, getRecapSettings, type RecapRow } from '@/lib/wearables/insights/queries';
import { OverviewTab } from './insights/OverviewTab';
import { BeforeAfterTab } from './insights/BeforeAfterTab';
import { HabitsTab } from './insights/HabitsTab';
import { FeelTab } from './insights/FeelTab';
import { RecapModal } from './insights/RecapModal';
import { RecapHeroCard } from './insights/RecapHeroCard';
import { RhythmChart, RhythmLegend } from './insights/RhythmChart';
import { WearableStory, type StoryScreen } from './insights/WearableStory';
import { essentialFeel, essentialHelps, essentialNight, essentialRhythm, essentialSession, essentialWeek } from '@/lib/wearables/insights/story';


export type DossierLinks = {
  /** Ouvre un autre onglet du dossier (Rendez-vous, Conseillancier, Cycle, Profil). */
  openTab: (tab: 'Rendez-vous' | 'Conseillancier' | 'Cycle' | 'Profil') => void;
};

/**
 * Onglet « Objet connecté » du dossier, repris de la maquette (écran 19b) :
 * récap à valider, points à aborder, semaine comparée à d'habitude, graphique des 28 nuits,
 * avant / après le conseillancier, conseils suivis × mesures, ressenti & cycle.
 * Les règles sont dans lib/wearables/insights.
 */
export function WearableInsightsPanel({
  consultantId,
  links,
  openRecapOnLoad = false,
  fallback = null,
}: {
  consultantId: string;
  links: DossierLinks;
  openRecapOnLoad?: boolean;
  /** Affiché tant qu'aucune mesure n'a été reçue (objet pas encore connecté, import en cours…). */
  fallback?: ReactNode;
}) {
  const [input, setInput] = useState<LoadedInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [practitioner, setPractitioner] = useState({ first: '', full: '' });
  const [settings, setSettings] = useState<RecapSettings | null>(null);
  const [draft, setDraft] = useState<RecapRow | null>(null);
  const [metric, setMetric] = useState<Metric>('sleep');
  const [recapOpen, setRecapOpen] = useState(openRecapOnLoad);
  const [sent, setSent] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([
      loadInsightsInput(supabase, consultantId),
      loadPractitionerName(supabase).catch(() => ({ first: '', full: '' })),
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
  }, [consultantId, reload]);

  // Période du récap : suit la fréquence choisie quand « Me le proposer régulièrement » est activé, sinon la semaine.
  const freq: RecapFrequency = draft?.frequency ?? (settings?.enabled ? settings.frequency : '1w');
  const insights = useMemo(() => (input ? computeInsights(input, { recapFrequency: freq, chartMetric: metric }) : null), [input, freq, metric]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        showToast.error('Session expirée : reconnectez-vous.');
        return;
      }
      const res = await fetch('/api/wearables/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultantId }),
        cache: 'no-store',
      });
      const body = (await res.json().catch(() => ({}))) as { ingested?: number; error?: string };
      if (!res.ok) {
        showToast.error(body.error ?? 'La synchronisation a échoué. Réessayez.');
        return;
      }
      showToast.success(body.ingested ? `Synchronisation terminée : ${body.ingested} enregistrement(s) importé(s).` : 'Synchronisation terminée : rien de nouveau chez Polar.');
      setReload((k) => k + 1);
    } catch {
      showToast.error('La synchronisation a échoué. Réessayez.');
    } finally {
      setSyncing(false);
    }
  }, [consultantId, syncing]);

  if (failed) return fallback ? <>{fallback}</> : <p className="rounded-2xl border border-divider bg-surface p-5 text-sm text-stone">Les données de l’objet connecté sont momentanément indisponibles.</p>;
  if (!insights || !input) return <Skeleton className="h-72 rounded-2xl" />;
  if (!input.days.some((d) => d.sleepMin !== null || d.hrvMs !== null || d.steps !== null)) return <>{fallback}</>;

  const w = who(input.firstName, input.gender);
  const syncLabel = syncing ? 'Synchronisation avec Polar en cours…' : input.lastSyncAt ? `Synchronisé ${formatRelative(input.lastSyncAt)}` : 'Pas encore synchronisé';

  const overview = (part: 'night' | 'session' | 'week') => (
    <OverviewTab
      input={input}
      insights={insights}
      who={w}
      consultantId={consultantId}
      metric={metric}
      onMetric={setMetric}
      onOpenRdv={() => links.openTab('Rendez-vous')}
      part={part}
    />
  );
  const eNight = essentialNight(insights);
  const eWeek = essentialWeek(insights);
  const eRhythm = essentialRhythm(insights);
  const eSession = essentialSession(insights);
  const eFeel = essentialFeel(insights);
  const eHelps = essentialHelps(insights);
  const screens: StoryScreen[] = [
    { key: 'nuit', label: 'La nuit dernière', title: 'La nuit dernière', subtitle: `Ce que l’objet a mesuré, comparé à son habituel.`, essential: eNight.text, tone: eNight.tone, content: overview('night') },
    { key: 'semaine', label: 'Cette semaine', title: 'Cette semaine, comparée à d’habitude', subtitle: 'Les 7 dernières nuits, mesure par mesure, et les 28 nuits en graphique.', essential: eWeek.text, tone: eWeek.tone, content: overview('week') },
    {
      key: 'rythme',
      label: 'Le rythme',
      title: 'Coucher et lever sur 14 nuits',
      subtitle: 'La régularité en dit souvent plus que la durée.',
      essential: eRhythm.text,
      tone: eRhythm.tone,
      content: (
        <section className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
          <RhythmChart r={insights.rhythm} />
          <RhythmLegend r={insights.rhythm} />
        </section>
      ),
    },
    { key: 'seance', label: 'Depuis la séance', title: input.lastSessionDate ? `Depuis la séance du ${longDate(input.lastSessionDate)}` : 'Depuis la dernière séance', subtitle: 'Les points à aborder en séance, à épingler pour ne pas les oublier.', essential: eSession.text, tone: eSession.tone, content: overview('session') },
    { key: 'ressenti', label: 'Le ressenti', title: `Ce ${w.que} ressent, ce que l’objet mesure`, subtitle: 'Journal et mesures, face à face. Des écarts, pas des causes.', essential: eFeel.text, tone: eFeel.tone, content: <FeelTab input={input} insights={insights} who={w} onOpenCycle={() => links.openTab('Cycle')} /> },
    {
      key: 'aide',
      label: 'Ce qui aide',
      title: 'Ce qui aide, ce qui reste à voir',
      subtitle: 'Avant / après le conseillancier, et les conseils suivis face aux nuits.',
      essential: eHelps.text,
      tone: eHelps.tone,
      content: (
        <>
          <BeforeAfterTab insights={insights} onOpenPlan={() => links.openTab('Conseillancier')} />
          <HabitsTab input={input} insights={insights} who={w} onChanged={() => setReload((k) => k + 1)} onOpenGoals={() => links.openTab('Profil')} />
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5" data-testid="wearable-insights">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Pas de titre ici : l'en-tête de l'onglet (ConsultantTabs) affiche déjà « Objet connecté ». */}
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-stone">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sage" />
            {syncLabel} · porté {insights.worn} nuits sur 28
          </span>
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-divider px-3.5 text-sm font-medium disabled:text-stone"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
          {syncing ? 'Synchronisation…' : 'Synchroniser'}
        </button>
      </div>

      {/* Toujours visible : le message à relire/envoyer, avec le résumé des points importants. */}
      <RecapHeroCard input={input} insights={insights} who={w} draft={draft} sent={sent} onOpenRecap={() => setRecapOpen(true)} />

      <WearableStory screens={screens} />

      <p className="text-xs text-stone">
        Repères de bien-être comparés à ses propres habitudes, pas un diagnostic
        {input.consentDate ? ` · Accord de partage donné par ${w.first} le ${shortDate(input.consentDate)}`.replace(/\.$/, '') + '.' : '.'}
      </p>

      {recapOpen ? (
        <RecapModal
          consultantId={consultantId}
          input={input}
          who={w}
          practitioner={practitioner}
          settings={settings}
          draft={draft}
          onSettings={setSettings}
          onClose={() => setRecapOpen(false)}
          onSent={() => {
            setRecapOpen(false);
            setSent(true);
            setDraft(null);
          }}
        />
      ) : null}
      <span className="sr-only">{input.lastSessionDate ? `Dernière séance le ${longDate(input.lastSessionDate)}` : ''}</span>
    </div>
  );
}
