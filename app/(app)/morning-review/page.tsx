'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useMorningReview } from '@/hooks/useMorningReview';
import { Toaster } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { MorningReviewHeader } from '@/components/morning-review/MorningReviewHeader';
import { PanoramicView } from '@/components/morning-review/PanoramicView';
import { AttentionQueue } from '@/components/morning-review/AttentionQueue';
import { GlobalMetrics } from '@/components/morning-review/GlobalMetrics';
import { GuidedReviewModal } from '@/components/morning-review/GuidedReviewModal';

export default function MorningReviewPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const { data, isLoading, error, refetch } = useMorningReview();
  const [showGuidedReview, setShowGuidedReview] = useState(false);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonDashboard />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <p className="text-stone">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <p className="text-stone mb-4">
            Erreur lors du chargement de la revue matinale.
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-sage hover:text-sage-deep font-medium"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { consultantsSummary, practitionerName } = data;
  const urgentCount = consultantsSummary.filter(c => c.attentionLevel === 'urgent').length;

  // Extraire le prenom
  const firstName = practitionerName.split(' ')[0] || '';

  return (
    <div className="space-y-2">
      <Toaster />

      <MorningReviewHeader
        practitionerName={firstName}
        urgentCount={urgentCount}
      />

      <PanoramicView consultantsSummary={consultantsSummary} />

      <AttentionQueue
        consultantsSummary={consultantsSummary}
        onStartGuidedReview={() => setShowGuidedReview(true)}
        onActionComplete={() => refetch()}
      />

      <GlobalMetrics consultantsSummary={consultantsSummary} />

      {/* Consultants sans donnees suffisantes */}
      {consultantsSummary.some(c => c.attentionLevel === 'insufficient') && (
        <div className="glass-card p-4 md:p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-3">Donnees insuffisantes</h2>
          <p className="text-sm text-stone mb-3">
            Ces consultants n&apos;ont pas encore assez de donnees pour etre evalues.
          </p>
          <div className="space-y-2">
            {consultantsSummary
              .filter(c => c.attentionLevel === 'insufficient')
              .map(summary => (
                <div
                  key={summary.consultant.id}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                >
                  <span className="text-sm text-charcoal">{summary.consultant.name}</span>
                  <span className="text-xs text-stone">
                    Cree le {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(summary.consultant.created_at))}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modal de revue guidee */}
      {showGuidedReview && (
        <GuidedReviewModal
          consultantsSummary={consultantsSummary}
          onClose={() => {
            setShowGuidedReview(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
