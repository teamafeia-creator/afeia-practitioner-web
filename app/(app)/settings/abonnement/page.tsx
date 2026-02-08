'use client';

import { useState, useEffect, useCallback } from 'react';
import { Crown, Check, ExternalLink, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getCurrentSubscription } from '@/lib/billing/api';
import type { Subscription } from '@/lib/billing/types';

const PLAN_ADVANTAGES = [
  "Jusqu'a 50 consultants",
  'Bague Circular connectee',
  'Generation IA des conseillanciers',
  'Messagerie praticien-consultant',
  'Export PDF personnalise',
  'Support prioritaire',
];

export default function AbonnementPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentSubscription();
      setSubscription(data);
    } catch (err) {
      console.error('[abonnement] Erreur lors du chargement de l\'abonnement:', err);
      setError('Impossible de charger les informations d\'abonnement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/billing/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de l\'ouverture du portail');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('[abonnement] Erreur portail Stripe:', err);
      setError('Impossible d\'ouvrir le portail de gestion. Veuillez reessayer.');
      setPortalLoading(false);
    }
  };

  const isPremium = subscription?.plan?.name === 'premium';
  const planDisplayName = subscription?.plan?.display_name || (isPremium ? 'Premium' : 'Standard');
  const priceLabel = isPremium
    ? subscription?.billing_cycle === 'yearly'
      ? `${subscription?.plan?.price_yearly ?? 490} EUR/an`
      : `${subscription?.plan?.price_monthly ?? 49} EUR/mois`
    : 'Gratuit';

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Abonnement" subtitle="Gerez votre plan et votre facturation." />
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center text-stone">
            Chargement...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abonnement"
        subtitle="Gerez votre plan et votre facturation."
      />

      {error && (
        <div className="rounded-xl border border-rose/20 bg-rose/5 px-4 py-3 text-sm text-rose">
          {error}
        </div>
      )}

      {/* Current plan card - dark background */}
      <Card
        className="rounded-xl border-0 shadow-lg"
        style={{ background: isPremium ? '#2D3436' : '#4A7A5D' }}
      >
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-white">
                  {planDisplayName}
                </h2>
                <p className="text-sm text-white/70">{priceLabel}</p>
              </div>
            </div>
            <Badge variant={isPremium ? 'premium' : 'standard'}>
              {isPremium ? 'Actif' : 'Standard'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renewalDate && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <CreditCard className="h-4 w-4" />
              <span>
                {subscription?.cancel_at_period_end
                  ? `Expire le ${renewalDate}`
                  : `Prochain renouvellement le ${renewalDate}`}
              </span>
            </div>
          )}

          {subscription?.status === 'active' && (
            <Button
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              icon={<ExternalLink className="h-4 w-4" />}
              iconPosition="right"
              onClick={handleManageSubscription}
              loading={portalLoading}
            >
              Gerer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Advantages list card - lighter */}
      <Card className="rounded-xl">
        <CardHeader>
          <h2 className="font-serif text-base font-semibold text-charcoal">
            Avantages de votre plan
          </h2>
          <p className="mt-1 text-[13px] text-stone">
            {isPremium
              ? 'Vous beneficiez de toutes les fonctionnalites Premium.'
              : 'Passez au plan Premium pour debloquer toutes les fonctionnalites.'}
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {PLAN_ADVANTAGES.map((advantage) => (
              <li key={advantage} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-light">
                  <Check className="h-3 w-3 text-sage-dark" />
                </div>
                <span className="text-sm text-charcoal">{advantage}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
