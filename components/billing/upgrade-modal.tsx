// components/billing/upgrade-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SubscriptionFeatures } from './subscription-features';
import type { Subscription, SubscriptionPlan, BillingCycle } from '@/lib/billing/types';
import {
  formatPrice,
  calculateYearlySavingsPercent,
  getBillingCycleLabel,
} from '@/lib/billing/utils';
import { getAvailablePlans, createCheckoutSession, openCustomerPortal } from '@/lib/billing/api';
import { cn } from '@/lib/cn';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentSubscription?: Subscription | null;
  plans?: SubscriptionPlan[];
  onSuccess?: () => void;
}

export function UpgradeModal({
  open,
  onClose,
  currentSubscription,
  plans: initialPlans,
  onSuccess,
}: UpgradeModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans || []);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = currentSubscription?.plan?.name === 'premium';
  const premiumPlan = plans.find((p) => p.name === 'premium');

  useEffect(() => {
    if (open && plans.length === 0) {
      getAvailablePlans()
        .then(setPlans)
        .catch((err) => setError(err.message));
    }
  }, [open, plans.length]);

  if (!open) return null;

  const handleUpgrade = async () => {
    if (!premiumPlan) return;

    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession(premiumPlan.id, selectedCycle);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);

    try {
      await openCustomerPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const yearlySavingsPercent = premiumPlan
    ? calculateYearlySavingsPercent(premiumPlan.price_monthly, premiumPlan.price_yearly)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-charcoal">
                {isPremium ? 'Gérer votre abonnement' : 'Passez à Premium'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-sable/50 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-marine"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isPremium ? (
              // Gestion de l'abonnement existant
              <div className="space-y-4">
                <p className="text-sm text-marine">
                  Vous êtes actuellement abonné au plan Premium. Utilisez le portail de facturation pour :
                </p>
                <ul className="text-sm text-marine space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mettre à jour vos informations de paiement
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Consulter l&apos;historique de vos paiements
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Modifier votre cycle de facturation
                  </li>
                </ul>
                <Button onClick={handleManageBilling} loading={loading} className="w-full">
                  Ouvrir le portail de facturation
                </Button>
              </div>
            ) : (
              // Upgrade vers Premium
              <>
                {/* Sélection du cycle */}
                <div className="flex rounded-xl bg-sable/50 p-1 mb-6">
                  <button
                    onClick={() => setSelectedCycle('monthly')}
                    className={cn(
                      'flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors',
                      selectedCycle === 'monthly'
                        ? 'bg-white text-charcoal shadow-sm'
                        : 'text-marine hover:text-charcoal'
                    )}
                  >
                    Mensuel
                  </button>
                  <button
                    onClick={() => setSelectedCycle('yearly')}
                    className={cn(
                      'flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors relative',
                      selectedCycle === 'yearly'
                        ? 'bg-white text-charcoal shadow-sm'
                        : 'text-marine hover:text-charcoal'
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

                {/* Prix */}
                {premiumPlan && (
                  <div className="text-center mb-6">
                    <p className="text-4xl font-bold text-charcoal">
                      {formatPrice(
                        selectedCycle === 'monthly'
                          ? premiumPlan.price_monthly
                          : premiumPlan.price_yearly
                      )}
                      <span className="text-lg font-normal text-marine">
                        /{selectedCycle === 'monthly' ? 'mois' : 'an'}
                      </span>
                    </p>
                    {selectedCycle === 'yearly' && (
                      <p className="text-sm text-teal mt-1">
                        Soit {formatPrice(premiumPlan.price_yearly / 12)}/mois
                      </p>
                    )}
                  </div>
                )}

                {/* Fonctionnalités */}
                {premiumPlan && (
                  <div className="mb-6 p-4 bg-sable/30 rounded-xl">
                    <h3 className="text-sm font-medium text-charcoal mb-3">
                      Inclus dans Premium
                    </h3>
                    <SubscriptionFeatures features={premiumPlan.features} />
                  </div>
                )}

                {/* Erreur */}
                {error && (
                  <div className="mb-4 p-3 bg-aubergine/10 text-aubergine text-sm rounded-lg">
                    {error}
                  </div>
                )}

                {/* Action */}
                <Button onClick={handleUpgrade} loading={loading} className="w-full">
                  {loading ? 'Redirection...' : `S'abonner - ${getBillingCycleLabel(selectedCycle)}`}
                </Button>

                <p className="text-xs text-center text-marine mt-4">
                  Paiement sécurisé par Stripe. Annulez à tout moment.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
