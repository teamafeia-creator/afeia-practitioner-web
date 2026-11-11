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

type Tab = 'vue' | 'avant' | 'hab' | 'res';
const TABS: [Tab, string][] = [
  ['vue', 'Vue d’ensemble'],
  ['avant', 'Avant / après le conseillancier'],
  ['hab', 'Conseils suivis × mesures'],
  ['res', 'Ressenti & cycle'],
];

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
  const [tab, setTab] = useState<Tab>('vue');
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

  return (
    <div className="flex flex-col gap-5" data-testid="wearable-insights">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[26px] font-medium">Objet connecté</h2>
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

      <div role="tablist" aria-label="Objet connecté" className="flex flex-wrap gap-x-6 border-b border-divider">
        {TABS.map(([id, l]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 py-2.5 text-sm ${tab === id ? 'border-sage font-semibold text-charcoal' : 'border-transparent font-medium text-stone hover:text-charcoal'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'vue' ? (
        <OverviewTab
          input={input}
          insights={insights}
          who={w}
          consultantId={consultantId}
          metric={metric}
          onMetric={setMetric}
          draft={draft}
          sent={sent}
          onOpenRecap={() => setRecapOpen(true)}
          onOpenRdv={() => links.openTab('Rendez-vous')}
        />
      ) : null}
      {tab === 'avant' ? <BeforeAfterTab insights={insights} onOpenPlan={() => links.openTab('Conseillancier')} /> : null}
      {tab === 'hab' ? <HabitsTab input={input} insights={insights} who={w} onChanged={() => setReload((k) => k + 1)} onOpenGoals={() => links.openTab('Profil')} /> : null}
      {tab === 'res' ? <FeelTab input={input} insights={insights} who={w} onOpenCycle={() => links.openTab('Cycle')} /> : null}

      {tab === 'vue' ? (
        <p className="text-xs text-stone">
          Repères de bien-être comparés à ses propres habitudes, pas un diagnostic
          {input.consentDate ? ` · Accord de partage donné par ${w.first} le ${shortDate(input.consentDate)}`.replace(/\.$/, '') + '.' : '.'}
        </p>
      ) : null}

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
