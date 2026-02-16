'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import type { StripeConnectStatus } from '@/lib/invoicing/types';
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function StripeConnectSettingsPage() {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [hasBillingSettings, setHasBillingSettings] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setAuthToken(token);

      const [settingsRes, statusRes] = await Promise.all([
        fetch('/api/invoicing/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/stripe/connect/account-status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setHasBillingSettings(data.settings !== null);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleStartOnboarding() {
    setOnboardingLoading(true);
    try {
      const response = await fetch('/api/stripe/connect/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur lors de la connexion Stripe'
      );
      setOnboardingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Paiement en ligne" />
        <div className="glass-card rounded-lg p-8 text-center text-stone">
          Chargement...
        </div>
      </div>
    );
  }

  const isConnected = status?.connected && status?.charges_enabled;

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader
        title="Paiement en ligne"
        subtitle="Acceptez les paiements en ligne via Stripe Connect"
        actions={
          <Link href="/settings/facturation">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Retour parametres
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Compte Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.connected ? (
            <>
              {hasBillingSettings === false && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Parametres de facturation requis
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Veuillez d&apos;abord configurer votre SIRET et votre adresse de
                        facturation avant de connecter Stripe.
                      </p>
                      <Link href="/settings/facturation">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          icon={<ArrowLeft className="h-4 w-4" />}
                        >
                          Configurer mes parametres
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-cream/60 border border-divider p-4 space-y-3">
                <h3 className="text-sm font-medium text-charcoal">
                  Pourquoi connecter Stripe ?
                </h3>
                <ul className="text-sm text-stone space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 shrink-0" />
                    Envoyez des liens de paiement a vos consultants
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 shrink-0" />
                    Recevez les paiements directement sur votre compte
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sage mt-0.5 shrink-0" />
                    Les factures sont marquees comme payees automatiquement
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleStartOnboarding}
                loading={onboardingLoading}
                disabled={hasBillingSettings === false}
                icon={<ExternalLink className="h-4 w-4" />}
              >
                Connecter mon compte Stripe
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <Badge variant="success">Connecte</Badge>
                ) : (
                  <Badge variant="attention">Configuration incomplete</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/60 border border-divider p-3">
                  <p className="text-xs font-medium text-stone uppercase tracking-wider mb-1">
                    Statut du compte
                  </p>
                  <div className="flex items-center gap-2 text-sm text-charcoal">
                    {status.charges_enabled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-sage" />
                        Paiements actifs
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Paiements inactifs
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-white/60 border border-divider p-3">
                  <p className="text-xs font-medium text-stone uppercase tracking-wider mb-1">
                    Informations
                  </p>
                  <div className="flex items-center gap-2 text-sm text-charcoal">
                    {status.details_submitted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-sage" />
                        Profil complet
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Profil incomplet
                      </>
                    )}
                  </div>
                </div>
              </div>

              {status.email && (
                <div className="text-sm text-stone">
                  Compte Stripe : {status.email}
                </div>
              )}

              {!isConnected && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800">
                    Votre compte Stripe n&apos;est pas encore entierement configure.
                    Completez la configuration pour pouvoir recevoir des paiements.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleStartOnboarding}
                    loading={onboardingLoading}
                    icon={<ExternalLink className="h-4 w-4" />}
                  >
                    Completer la configuration
                  </Button>
                </div>
              )}

              {isConnected && (
                <div className="rounded-lg bg-sage-light/50 border border-divider p-3">
                  <p className="text-sm text-charcoal">
                    Votre compte Stripe est actif. Vous pouvez envoyer des liens de paiement
                    a vos consultants depuis la page de detail de chaque facture.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ExternalLink className="h-4 w-4" />}
                  >
                    Acceder a mon dashboard Stripe
                  </Button>
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
