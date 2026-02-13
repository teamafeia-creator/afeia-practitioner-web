'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import type { ConsultantSummary } from '@/lib/morning-review/types';
import { ConsultantCard } from './ConsultantCard';

interface AttentionQueueProps {
  consultantsSummary: ConsultantSummary[];
  onStartGuidedReview: () => void;
  onActionComplete?: () => void;
}

export function AttentionQueue({ consultantsSummary, onStartGuidedReview, onActionComplete }: AttentionQueueProps) {
  // Filtrer les consultants avec un score >= 40 et limiter a 8
  const priorityConsultants = consultantsSummary
    .filter(c => c.attentionScore >= 40)
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 8);

  if (priorityConsultants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 mb-6 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-sage" />
        </div>
        <h3 className="text-lg font-semibold text-charcoal">Tout va bien !</h3>
        <p className="text-stone mt-2">
          Aucun consultant ne necessite votre attention particuliere aujourd&apos;hui.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-4 md:p-6 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold text-charcoal">
          File d&apos;attention &mdash; {priorityConsultants.length} consultant{priorityConsultants.length > 1 ? 's' : ''} aujourd&apos;hui
        </h2>
        <button
          onClick={onStartGuidedReview}
          className="text-sm text-sage hover:text-sage-deep font-medium whitespace-nowrap"
        >
          Commencer la revue guidee &rarr;
        </button>
      </div>

      <div className="space-y-4">
        {priorityConsultants.map((summary, index) => (
          <motion.div
            key={summary.consultant.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <ConsultantCard summary={summary} onActionComplete={onActionComplete} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
