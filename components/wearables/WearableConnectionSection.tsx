'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { isBackfillInProgress, type WearableConnectionOverview } from '@/lib/wearables/display';
import { polarConnectMessage } from '@/lib/wearables/polar/messages';
import { WearableConnectionCard } from './WearableConnectionCard';

export const BACKFILL_POLL_MS = 15_000;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Carte objet connecté branchée : charge l'état via GET /api/wearables/status
 * (vue sans jeton), lance la connexion via GET /api/wearables/polar/connect,
 * et traite le retour ?wearable=connected|error&reason=… (toast puis URL nettoyée).
 */
export function WearableConnectionSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [connection, setConnection] = useState<WearableConnectionOverview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const handledReturn = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/wearables/status', { headers: await authHeader(), cache: 'no-store' });
      if (!res.ok) return;
      const { connections } = (await res.json()) as { connections: WearableConnectionOverview[] };
      setConnection(connections.find((c) => c.provider === 'polar') ?? null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Import d'historique en cours : on rafraîchit l'état jusqu'à la fin de l'import.
  const backfilling = isBackfillInProgress(connection);
  useEffect(() => {
    if (!backfilling) return;
    const timer = setInterval(loadStatus, BACKFILL_POLL_MS);
    return () => clearInterval(timer);
  }, [backfilling, loadStatus]);

  // Retour du flux OAuth : toast, puis retrait de wearable/reason de l'URL.
  useEffect(() => {
    if (handledReturn.current) return;
    const wearable = searchParams.get('wearable');
    if (wearable !== 'connected' && wearable !== 'error') return;
    handledReturn.current = true;

    const message = polarConnectMessage(wearable, searchParams.get('reason'));
    if (wearable === 'connected') {
      setJustConnected(true);
      showToast.success(message ?? 'Objet connecté relié.');
    } else {
      showToast.error(message ?? 'La connexion a échoué.');
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('wearable');
    params.delete('reason');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const onConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const returnTo = `${pathname}${window.location.search}`;
      const res = await fetch(`/api/wearables/polar/connect?returnTo=${encodeURIComponent(returnTo)}`, {
        headers: await authHeader(),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      const { authorizeUrl } = (await res.json()) as { authorizeUrl: string };
      window.location.assign(authorizeUrl);
    } catch {
      showToast.error("Impossible de démarrer la connexion de votre objet connecté. Réessayez.");
      setConnecting(false);
    }
  }, [pathname]);

  if (!loaded) return null;

  return (
    <WearableConnectionCard
      connection={connection}
      onConnect={onConnect}
      connecting={connecting}
      showSetupHelp={justConnected}
    />
  );
}
