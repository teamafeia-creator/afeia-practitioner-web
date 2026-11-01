'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { isBackfillInProgress, type WearableConnectionOverview } from '@/lib/wearables/display';
import { polarConnectMessage } from '@/lib/wearables/polar/messages';
import { WEARABLES_CONSENT_VERSION } from '@/lib/wearables/consent-text';
import { WearableConnectionCard } from './WearableConnectionCard';
import { WearableConsentDialog } from './WearableConsentDialog';

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
  const [disconnecting, setDisconnecting] = useState(false);
  // Fonctionnalité ouverte à ce compte (WEARABLES_ENABLED_FOR) et consentement sur la version courante.
  const [enabled, setEnabled] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const handledReturn = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/wearables/status', { headers: await authHeader(), cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as {
        enabled?: boolean;
        consent?: { accepted?: boolean };
        connections: WearableConnectionOverview[];
      };
      setEnabled(body.enabled === true);
      setConsentAccepted(body.consent?.accepted === true);
      setConnection(body.connections.find((c) => c.provider === 'polar') ?? null);
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

  /** Redirection vers le fournisseur (consentement déjà accepté). */
  const startConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const returnTo = `${pathname}${window.location.search}`;
      const res = await fetch(`/api/wearables/polar/connect?returnTo=${encodeURIComponent(returnTo)}`, {
        headers: await authHeader(),
        cache: 'no-store',
      });
      if (res.status === 403) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        if (error === 'consent_required') {
          // Texte mis à jour depuis le dernier accord : nouvelle acceptation nécessaire.
          setConsentAccepted(false);
          setConsentOpen(true);
          setConnecting(false);
          return;
        }
      }
      if (!res.ok) throw new Error(String(res.status));
      const { authorizeUrl } = (await res.json()) as { authorizeUrl: string };
      window.location.assign(authorizeUrl);
    } catch {
      showToast.error("Impossible de démarrer la connexion de votre objet connecté. Réessayez.");
      setConnecting(false);
    }
  }, [pathname]);

  const onConnect = useCallback(() => {
    if (consentAccepted) void startConnect();
    else setConsentOpen(true);
  }, [consentAccepted, startConnect]);

  const onAcceptConsent = useCallback(async () => {
    setAccepting(true);
    try {
      const res = await fetch('/api/wearables/consent', {
        method: 'POST',
        headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: WEARABLES_CONSENT_VERSION }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      setConsentAccepted(true);
      setConsentOpen(false);
      await startConnect();
    } catch {
      showToast.error("Votre accord n'a pas pu être enregistré. Réessayez.");
    } finally {
      setAccepting(false);
    }
  }, [startConnect]);

  const onDisconnect = useCallback(
    async (deleteData: boolean) => {
      setDisconnecting(true);
      try {
        const res = await fetch('/api/wearables/disconnect', {
          method: 'POST',
          headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteData }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        showToast.success(
          deleteData
            ? 'Objet connecté déconnecté. Vos données importées ont été supprimées.'
            : 'Objet connecté déconnecté. Vos données déjà importées sont conservées.'
        );
        setJustConnected(false);
        setConsentAccepted(false); // la déconnexion retire le consentement
        await loadStatus();
      } catch {
        showToast.error('La déconnexion a échoué. Réessayez.');
      } finally {
        setDisconnecting(false);
      }
    },
    [loadStatus]
  );

  // Non ouvert à ce compte (WEARABLES_ENABLED_FOR=internal hors équipe) : rien n'est affiché.
  if (!loaded || !enabled) return null;

  return (
    <>
    <WearableConnectionCard
      connection={connection}
      onConnect={onConnect}
      connecting={connecting}
      showSetupHelp={justConnected}
      onDisconnect={onDisconnect}
      disconnecting={disconnecting}
    />
    <WearableConsentDialog
      isOpen={consentOpen}
      onClose={() => setConsentOpen(false)}
      onAccept={onAcceptConsent}
      loading={accepting}
    />
    </>
  );
}
