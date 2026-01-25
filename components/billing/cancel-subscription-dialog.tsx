// components/billing/cancel-subscription-dialog.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Subscription } from '@/lib/billing/types';
import { formatDate } from '@/lib/billing/utils';
import { cancelSubscription } from '@/lib/billing/api';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  subscription: Subscription;
  onSuccess?: () => void;
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  subscription,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      await cancelSubscription(subscription.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        <Card>
          <CardContent className="p-6">
            {/* Icône d'alerte */}
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-aubergine/10">
                <svg
                  className="h-8 w-8 text-aubergine"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Titre */}
            <h2 className="text-xl font-semibold text-charcoal text-center mb-2">
              Annuler votre abonnement ?
            </h2>

            {/* Description */}
            <div className="text-sm text-marine text-center mb-6 space-y-3">
              <p>
                Êtes-vous sûr de vouloir annuler votre abonnement Premium ?
              </p>
              <p>
                Vous conserverez l&apos;accès aux fonctionnalités Premium jusqu&apos;au{' '}
                <span className="font-medium text-charcoal">
                  {formatDate(subscription.current_period_end)}
                </span>
                .
              </p>
              <p className="text-xs text-warmgray">
                Après cette date, votre compte passera automatiquement au plan gratuit avec des fonctionnalités limitées.
              </p>
            </div>

            {/* Ce que vous perdrez */}
            <div className="mb-6 p-4 bg-sable/50 rounded-xl">
              <h3 className="text-sm font-medium text-charcoal mb-2">
                Ce que vous perdrez :
              </h3>
              <ul className="text-sm text-marine space-y-1.5">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aubergine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Patients illimités
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aubergine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Intégration Circular (sommeil, HRV, activité)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aubergine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Plans personnalisés avancés
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-aubergine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Support prioritaire
                </li>
              </ul>
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-4 p-3 bg-aubergine/10 text-aubergine text-sm rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Garder Premium
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                loading={loading}
                className="flex-1"
              >
                {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
