// app/(app)/billing/manage/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SubscriptionFeatures } from '@/components/billing/subscription-features';
import { BillingSkeleton } from '@/components/billing/billing-skeleton';
import { getCurrentSubscription, getAvailablePlans } from '@/lib/billing/api';
import type { Subscription, SubscriptionPlan, BillingCycle } from '@/lib/billing/types';
import {
  formatPrice,
  formatDate,
  getBillingCycleLabel,
  calculateYearlySavingsPercent,
} from '@/lib/billing/utils';
import { cn } from '@/lib/cn';

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    async function loadData() {
      try {
        const [sub, availablePlans] = await Promise.all([
          getCurrentSubscription(),
          getAvailablePlans(),
        ]);
        setSubscription(sub);
        setPlans(availablePlans);
        if (sub?.billing_cycle) {
          setSelectedCycle(sub.billing_cycle);
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <BillingSkeleton />;
  }

  const currentPlan = subscription?.plan;
  const isPremium = currentPlan?.name === 'premium';
  const premiumPlan = plans.find((p) => p.name === 'premium');
  const freePlan = plans.find((p) => p.name === 'free');

  const yearlySavingsPercent = premiumPlan
    ? calculateYearlySavingsPercent(premiumPlan.price_monthly, premiumPlan.price_yearly)
    : 0;

  return (
    <PageShell>
      <PageHeader
        title="Gérer mon abonnement"
        subtitle="Comparez les plans et gérez votre abonnement"
      />

      {/* Sélection du cycle de facturation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl bg-cream/80 p-1">
          <button
            onClick={() => setSelectedCycle('monthly')}
            className={cn(
              'py-2 px-6 text-sm font-medium rounded-lg transition-colors',
              selectedCycle === 'monthly'
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-charcoal hover:text-charcoal'
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setSelectedCycle('yearly')}
            className={cn(
              'py-2 px-6 text-sm font-medium rounded-lg transition-colors relative',
              selectedCycle === 'yearly'
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-charcoal hover:text-charcoal'
            )}
          >
            Annuel
            {yearlySavingsPercent > 0 && (
              <Badge variant="new" className="absolute -top-2 -right-2 text-xs">
                -{yearlySavingsPercent}%
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Plan Gratuit */}
        {freePlan && (
          <Card className={cn(!isPremium && 'ring-2 ring-sage')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{freePlan.display_name}</CardTitle>
                {!isPremium && <Badge variant="active">Plan actuel</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-3xl font-bold text-charcoal">Gratuit</p>
                <p className="text-sm text-charcoal mt-1">{freePlan.description}</p>
              </div>

              <SubscriptionFeatures features={freePlan.features} />

              {isPremium && (
                <p className="text-sm text-charcoal italic">
                  Vous avez déjà un plan supérieur
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan Premium */}
        {premiumPlan && (
          <Card className={cn(isPremium && 'ring-2 ring-terracotta')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{premiumPlan.display_name}</CardTitle>
                {isPremium && <Badge variant="premium">Plan actuel</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-3xl font-bold text-charcoal">
                  {formatPrice(
                    selectedCycle === 'monthly'
                      ? premiumPlan.price_monthly
                      : premiumPlan.price_yearly
                  )}
                  <span className="text-base font-normal text-charcoal">
                    /{selectedCycle === 'monthly' ? 'mois' : 'an'}
                  </span>
                </p>
                {selectedCycle === 'yearly' && (
                  <p className="text-sm text-sage mt-1">
                    Soit {formatPrice(premiumPlan.price_yearly / 12)}/mois
                  </p>
                )}
                <p className="text-sm text-charcoal mt-1">{premiumPlan.description}</p>
              </div>

              <SubscriptionFeatures features={premiumPlan.features} />

              {isPremium ? (
                <Button
                  onClick={() => router.push('/billing')}
                  variant="secondary"
                  className="w-full"
                >
                  Gérer la facturation
                </Button>
              ) : (
                <Button
                  onClick={() => router.push('/billing')}
                  className="w-full"
                >
                  Passer à Premium
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Informations sur l'abonnement actuel */}
      {subscription && isPremium && (
        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Détails de votre abonnement</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-charcoal">Plan</dt>
                  <dd className="font-medium text-charcoal">{currentPlan?.display_name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-charcoal">Cycle de facturation</dt>
                  <dd className="font-medium text-charcoal">
                    {getBillingCycleLabel(subscription.billing_cycle)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-charcoal">Début de la période</dt>
                  <dd className="font-medium text-charcoal">
                    {formatDate(subscription.current_period_start)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-charcoal">Prochain renouvellement</dt>
                  <dd className="font-medium text-charcoal">
                    {subscription.cancel_at_period_end
                      ? 'Annulé'
                      : formatDate(subscription.current_period_end)}
                  </dd>
                </div>
              </dl>

              {subscription.cancel_at_period_end && (
                <div className="mt-4 p-4 bg-gold/10 rounded-xl">
                  <p className="text-sm text-charcoal">
                    Votre abonnement est annulé et sera actif jusqu&apos;au{' '}
                    <span className="font-medium">{formatDate(subscription.current_period_end)}</span>.
                    Après cette date, vous passerez au plan gratuit.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
