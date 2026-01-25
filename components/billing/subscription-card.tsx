// components/billing/subscription-card.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SubscriptionFeatures } from './subscription-features';
import { UpgradeModal } from './upgrade-modal';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';
import type { Subscription, SubscriptionPlan } from '@/lib/billing/types';
import { formatPrice, formatDate, getBillingCycleLabel } from '@/lib/billing/utils';

interface SubscriptionCardProps {
  subscription: Subscription | null;
  plans?: SubscriptionPlan[];
  onSubscriptionUpdate?: () => void;
}

export function SubscriptionCard({ subscription, plans, onSubscriptionUpdate }: SubscriptionCardProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const plan = subscription?.plan;
  const isPremium = plan?.name === 'premium';
  const isFree = plan?.name === 'free';

  if (!subscription || !plan) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-marine mb-4">Aucun abonnement actif</p>
          <Button onClick={() => setShowUpgradeModal(true)}>
            Choisir un plan
          </Button>
          <UpgradeModal
            open={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            plans={plans}
            onSuccess={onSubscriptionUpdate}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Votre abonnement</CardTitle>
            <Badge variant={isPremium ? 'premium' : 'standard'}>
              {plan.display_name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prix */}
          {!isFree && (
            <div>
              <p className="text-3xl font-bold text-charcoal">
                {formatPrice(
                  subscription.billing_cycle === 'monthly'
                    ? plan.price_monthly
                    : plan.price_yearly
                )}
                <span className="text-base font-normal text-marine">
                  /{subscription.billing_cycle === 'monthly' ? 'mois' : 'an'}
                </span>
              </p>
              <p className="text-sm text-marine mt-1">
                Facturation {getBillingCycleLabel(subscription.billing_cycle).toLowerCase()}
              </p>
            </div>
          )}

          {isFree && (
            <div>
              <p className="text-3xl font-bold text-charcoal">Gratuit</p>
              <p className="text-sm text-marine mt-1">
                Plan de base pour commencer
              </p>
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <p className="text-sm text-marine">{plan.description}</p>
          )}

          {/* Fonctionnalités */}
          <SubscriptionFeatures features={plan.features} />

          {/* Informations période */}
          <div className="pt-4 border-t border-sable/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-marine">Période en cours</span>
              <span className="font-medium text-charcoal">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </span>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="flex justify-between text-gold">
                <span>Statut</span>
                <span className="font-medium">
                  Annulé (actif jusqu&apos;au {formatDate(subscription.current_period_end)})
                </span>
              </div>
            )}
            {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
              <div className="flex justify-between text-teal">
                <span>Période d&apos;essai</span>
                <span className="font-medium">
                  Jusqu&apos;au {formatDate(subscription.trial_end)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isFree ? (
              <Button onClick={() => setShowUpgradeModal(true)} className="flex-1">
                Passer à Premium
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  variant="secondary"
                  className="flex-1"
                >
                  Gérer la facturation
                </Button>
                {!subscription.cancel_at_period_end && (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="ghost"
                    className="text-aubergine hover:text-aubergine hover:bg-aubergine/5"
                  >
                    Annuler
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentSubscription={subscription}
        plans={plans}
        onSuccess={onSubscriptionUpdate}
      />

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        subscription={subscription}
        onSuccess={onSubscriptionUpdate}
      />
    </>
  );
}
