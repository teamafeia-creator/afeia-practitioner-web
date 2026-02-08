/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Toast } from '../../../../components/ui/Toast';
import { supabase } from '../../../../lib/supabase';

interface GoogleConnection {
  id: string;
  google_email: string | null;
  calendar_id: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<GoogleConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const loadConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('id, google_email, calendar_id, sync_enabled, last_sync_at, last_sync_error')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Integrations] Load error:', error);
      }
      setConnection(data || null);
    } catch {
      // No connection exists
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle URL params from OAuth callback
  useEffect(() => {
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      setToast({
        title: 'Google Agenda connecte',
        description: 'Votre compte Google a ete lie avec succes.',
        variant: 'success',
      });
      loadConnection();
    } else if (googleStatus === 'denied') {
      setToast({
        title: 'Connexion refusee',
        description: 'Vous avez refuse l\'acces a Google Agenda.',
        variant: 'error',
      });
    } else if (googleStatus === 'error') {
      setToast({
        title: 'Erreur de connexion',
        description: 'Une erreur est survenue lors de la connexion a Google Agenda.',
        variant: 'error',
      });
    }
  }, [searchParams, loadConnection]);

  async function handleConnect() {
    window.location.href = '/api/integrations/google/connect';
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Echec de la deconnexion');

      setConnection(null);
      setToast({
        title: 'Google Agenda deconnecte',
        description: 'La synchronisation a ete desactivee.',
        variant: 'success',
      });
    } catch (err) {
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur lors de la deconnexion.',
        variant: 'error',
      });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSyncAll() {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/google/sync-all', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Echec de la synchronisation');

      setToast({
        title: 'Synchronisation terminee',
        description: `${data.synced} seance(s) synchronisee(s) avec Google Agenda.`,
        variant: 'success',
      });
      loadConnection();
    } catch (err) {
      setToast({
        title: 'Erreur de synchronisation',
        description: err instanceof Error ? err.message : 'Erreur inconnue.',
        variant: 'error',
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleSync() {
    if (!connection) return;

    const newEnabled = !connection.sync_enabled;
    try {
      const { error } = await supabase
        .from('google_calendar_connections')
        .update({ sync_enabled: newEnabled, updated_at: new Date().toISOString() })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection({ ...connection, sync_enabled: newEnabled });
      setToast({
        title: newEnabled ? 'Synchronisation activee' : 'Synchronisation desactivee',
        variant: 'success',
      });
    } catch {
      setToast({
        title: 'Erreur',
        description: 'Impossible de modifier le parametre.',
        variant: 'error',
      });
    }
  }

  function formatLastSync(lastSyncAt: string | null): string {
    if (!lastSyncAt) return 'Jamais';
    const diff = Date.now() - new Date(lastSyncAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'A l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connectez vos services externes pour synchroniser automatiquement vos seances."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" strokeWidth="2" />
                  <line x1="9" y1="4" x2="9" y2="22" stroke="#4285F4" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Google Agenda</h2>
              </div>
            </div>
            {connection && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Connecte
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            </div>
          ) : connection ? (
            <div className="space-y-4">
              {/* Sync error banner */}
              {connection.last_sync_error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-amber-600">&#9888;</span>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Erreur de synchronisation</p>
                      <p className="text-xs text-amber-700">{connection.last_sync_error}</p>
                      {!connection.sync_enabled && (
                        <Button
                          variant="secondary"
                          className="mt-2"
                          onClick={handleConnect}
                        >
                          Reconnecter Google Agenda
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Connection info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-warmgray">Compte</span>
                  <span className="text-charcoal">{connection.google_email || 'Non renseigne'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warmgray">Calendrier</span>
                  <span className="text-charcoal">AFEIA — Mes seances</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warmgray">Derniere sync</span>
                  <span className="text-charcoal">{formatLastSync(connection.last_sync_at)}</span>
                </div>
              </div>

              {/* Toggle sync */}
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <span className="text-sm font-medium text-charcoal">Synchronisation activee</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={connection.sync_enabled}
                  onClick={handleToggleSync}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 ${
                    connection.sync_enabled ? 'bg-teal' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      connection.sync_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSyncAll}
                  loading={syncing}
                  disabled={syncing || !connection.sync_enabled}
                >
                  Synchroniser maintenant
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                  disabled={disconnecting}
                  className="text-red-600 hover:bg-red-50"
                >
                  Deconnecter Google Agenda
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-warmgray">
                Synchronisez automatiquement vos seances AFEIA avec votre Google Agenda.
              </p>
              <p className="text-sm text-warmgray">
                Vos rendez-vous AFEIA apparaitront dans un calendrier dedie
                "AFEIA — Mes seances" de votre Google Agenda.
              </p>
              <Button variant="primary" onClick={handleConnect}>
                Connecter Google Agenda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
