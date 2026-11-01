'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Watch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Spinner, TabsPills } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatRelative, isBackfillInProgress, type WearableConnectionOverview } from '@/lib/wearables/display';
import { getWearableSummary, type WearableSummary } from '@/lib/wearables/summary';
import { WearableMetricChart } from './WearableMetricChart';

export type WearablePeriod = 7 | 30;
const PERIOD_LABELS = { 7: '7 jours', 30: '30 jours' } as const;
const LABEL_TO_PERIOD: Record<string, WearablePeriod> = { '7 jours': 7, '30 jours': 30 };
const METRICS = ['sleepMin', 'hrvMs', 'restingHrBpm', 'steps'] as const;

export function parsePeriod(value: string | null): WearablePeriod {
  return value === '30' ? 30 : 7;
}

type ViewProps = {
  connection: WearableConnectionOverview | null;
  summary: WearableSummary | null;
  period: WearablePeriod;
  onPeriodChange: (p: WearablePeriod) => void;
  loading?: boolean;
  now?: Date;
};

/**
 * Section « Objet connecté » de la fiche patient (vue praticien). Présentation seule.
 * Aucune interprétation ni couleur de jugement : des valeurs, des moyennes et des écarts.
 */
export function PatientWearableSectionView({ connection, summary, period, onPeriodChange, loading = false, now }: ViewProps) {
  const connected = connection !== null && connection.status !== 'revoked';
  const importing = connected && isBackfillInProgress(connection);

  return (
    <Card data-testid="patient-wearable-section">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Watch className="mt-0.5 h-5 w-5 shrink-0 text-stone" aria-hidden />
          <div>
            <CardTitle>Objet connecté</CardTitle>
            {connected ? (
              <p className="mt-1 text-[13px] text-stone" data-testid="patient-wearable-last-sync">
                Dernière synchronisation :{' '}
                {connection.last_sync_at ? formatRelative(connection.last_sync_at, now) : 'en attente des premières données'}
              </p>
            ) : null}
          </div>
        </div>
        {connected ? (
          <TabsPills
            tabs={[PERIOD_LABELS[7], PERIOD_LABELS[30]] as const}
            active={PERIOD_LABELS[period]}
            onChange={(label) => onPeriodChange(LABEL_TO_PERIOD[label])}
          />
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {!connected ? (
          <p className="text-sm text-stone" data-testid="patient-wearable-empty">
            Ce patient n&apos;a pas encore connecté d&apos;objet connecté.
          </p>
        ) : (
          <>
            {connection.status === 'error' ? (
              <p className="text-[13px] text-stone">
                La connexion de l&apos;objet connecté est interrompue : le patient doit la relancer depuis son espace.
              </p>
            ) : null}
            {importing ? (
              <div className="flex items-center gap-2 text-[13px] text-stone" role="status" data-testid="patient-wearable-importing">
                <Spinner size="sm" />
                Import de l&apos;historique en cours
              </div>
            ) : null}
            {loading || !summary ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {METRICS.map((m) => (
                  <Skeleton key={m} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="patient-wearable-grid">
                {METRICS.map((m) => (
                  <WearableMetricChart key={m} metric={m} days={summary.days} averages={summary.averages} period={period} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Section branchée : période dans l'URL (?periode=7|30), état de connexion lu dans la vue sans
 * jeton et séries via getWearableSummary — avec la session du praticien (RLS appliquée).
 */
export function PatientWearableSection({ consultantId }: { consultantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get('periode'));

  const [connection, setConnection] = useState<WearableConnectionOverview | null>(null);
  const [connectionLoaded, setConnectionLoaded] = useState(false);
  const [summary, setSummary] = useState<WearableSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('wearable_connection_overview')
      .select('provider, status, connected_at, last_sync_at, last_error, backfill_status, backfill_cursor')
      .eq('consultant_id', consultantId)
      .eq('provider', 'polar')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setConnection((data as WearableConnectionOverview | null) ?? null);
        setConnectionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultantId]);

  const connected = connection !== null && connection.status !== 'revoked';
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    getWearableSummary(consultantId, { days: period, client: supabase })
      .then((s) => !cancelled && setSummary(s))
      .catch(() => !cancelled && setSummary(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [consultantId, period, connected]);

  const onPeriodChange = useCallback(
    (p: WearablePeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('periode', String(p));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  if (!connectionLoaded) return <Skeleton className="h-40 rounded-xl" />;
  return (
    <PatientWearableSectionView connection={connection} summary={summary} period={period} onPeriodChange={onPeriodChange} loading={loading} />
  );
}
