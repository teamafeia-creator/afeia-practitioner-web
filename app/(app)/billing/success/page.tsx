// app/(app)/billing/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getCurrentSubscription } from '@/lib/billing/api';
import type { Subscription } from '@/lib/billing/types';
import { formatDate } from '@/lib/billing/utils';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    async function loadSubscription() {
      try {
        const sub = await getCurrentSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    // Attendre un peu pour que le webhook Stripe ait le temps de traiter
    const timer = setTimeout(loadSubscription, 2000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <PageShell>
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            {loading ? (
              <>
                <div className="animate-pulse">
                  <div className="mx-auto w-16 h-16 bg-cream rounded-full mb-6" />
                  <div className="h-8 bg-cream rounded w-48 mx-auto mb-4" />
                  <div className="h-4 bg-cream rounded w-64 mx-auto" />
                </div>
              </>
            ) : (
              <>
                {/* Icône de succès */}
                <div className="mx-auto w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="h-8 w-8 text-sage"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                {/* Titre */}
                <h1 className="text-2xl font-bold text-charcoal mb-2">
                  Bienvenue chez Premium !
                </h1>

                {/* Description */}
                <p className="text-charcoal mb-6">
                  Votre abonnement Premium a été activé avec succès. Vous avez maintenant accès à toutes les fonctionnalités.
                </p>

                {/* Détails de l'abonnement */}
                {subscription?.plan && (
                  <div className="bg-cream/60 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-medium text-charcoal mb-3">
                      Détails de votre abonnement
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-charcoal">Plan</dt>
                        <dd className="font-medium text-charcoal">
                          {subscription.plan.display_name}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-charcoal">Cycle</dt>
                        <dd className="font-medium text-charcoal">
                          {subscription.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-charcoal">Prochain renouvellement</dt>
                        <dd className="font-medium text-charcoal">
                          {formatDate(subscription.current_period_end)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Fonctionnalités débloquées */}
                <div className="text-left mb-6">
                  <h3 className="font-medium text-charcoal mb-3">
                    Vous pouvez maintenant :
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-charcoal">
                      <svg className="h-5 w-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ajouter des consultants sans limite
                    </li>
                    <li className="flex items-center gap-2 text-sm text-charcoal">
                      <svg className="h-5 w-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Consulter les données bague connectée de vos consultants
                    </li>
                    <li className="flex items-center gap-2 text-sm text-charcoal">
                      <svg className="h-5 w-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Créer des plans personnalisés avancés
                    </li>
                    <li className="flex items-center gap-2 text-sm text-charcoal">
                      <svg className="h-5 w-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Bénéficier du support prioritaire
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/billing')}
                    className="flex-1"
                  >
                    Voir ma facturation
                  </Button>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1"
                  >
                    Aller au tableau de bord
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
