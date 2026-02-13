'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import type { ConsultantSummary } from '@/lib/morning-review/types';
import { ATTENTION_COLORS } from '@/lib/morning-review/types';

interface PanoramicViewProps {
  consultantsSummary: ConsultantSummary[];
}

export function PanoramicView({ consultantsSummary }: PanoramicViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const counts = {
    urgent: consultantsSummary.filter(c => c.attentionLevel === 'urgent').length,
    attention: consultantsSummary.filter(c => c.attentionLevel === 'attention').length,
    progress: consultantsSummary.filter(c => c.attentionLevel === 'progress').length,
    stable: consultantsSummary.filter(c => c.attentionLevel === 'stable').length,
    insufficient: consultantsSummary.filter(c => c.attentionLevel === 'insufficient').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-4 md:p-6 mb-6"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-charcoal">Vue panoramique</h2>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-stone" />
        ) : (
          <ChevronUp className="w-5 h-5 text-stone" />
        )}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Pastilles de couleur */}
            <div className="flex gap-1 flex-wrap mt-4 mb-4">
              {consultantsSummary.map(summary => (
                <div
                  key={summary.consultant.id}
                  className="w-3 h-3 rounded-full transition-transform hover:scale-150 cursor-default"
                  style={{ backgroundColor: ATTENTION_COLORS[summary.attentionLevel] }}
                  title={`${summary.consultant.name} — Score: ${summary.attentionScore}`}
                />
              ))}
            </div>

            {/* Resume textuel */}
            <div className="text-sm text-stone space-y-1">
              <p>
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ATTENTION_COLORS.stable }} />
                {counts.stable} sur la bonne voie
                {counts.progress > 0 && (
                  <>
                    {' '}&bull;{' '}
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ATTENTION_COLORS.progress }} />
                    {counts.progress} en progression
                  </>
                )}
              </p>
              <p>
                {counts.attention > 0 && (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ATTENTION_COLORS.attention }} />
                    {counts.attention} a surveiller
                  </>
                )}
                {counts.urgent > 0 && (
                  <>
                    {counts.attention > 0 ? <>{' '}&bull;{' '}</> : null}
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ATTENTION_COLORS.urgent }} />
                    {counts.urgent} necessitent attention
                  </>
                )}
                {counts.attention === 0 && counts.urgent === 0 && (
                  <span>Aucun consultant ne necessite d&apos;attention particuliere</span>
                )}
              </p>
              {counts.insufficient > 0 && (
                <p>
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ATTENTION_COLORS.insufficient }} />
                  {counts.insufficient} avec donnees insuffisantes
                </p>
              )}
            </div>

            <Link
              href="/consultants"
              className="text-sm text-sage hover:text-sage-deep mt-3 inline-block font-medium"
            >
              Voir tous les consultants &rarr;
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
