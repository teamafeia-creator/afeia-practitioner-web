'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Pause,
  Moon,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ConsultantSummary, Trend, Signal } from '@/lib/morning-review/types';
import { ATTENTION_COLORS } from '@/lib/morning-review/types';
import { CompletionScreen } from './CompletionScreen';
import { SendMessageModal } from './SendMessageModal';
import { SnoozeModal } from './SnoozeModal';
import { NoteObservationModal } from './NoteObservationModal';

interface GuidedReviewModalProps {
  consultantsSummary: ConsultantSummary[];
  onClose: () => void;
}

function TrendIcon({ trend }: { trend: Trend }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-sage" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-gold" />;
    default:
      return <Minus className="w-4 h-4 text-stone" />;
  }
}

export function GuidedReviewModal({ consultantsSummary, onClose }: GuidedReviewModalProps) {
  const router = useRouter();
  const startTime = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionsTaken, setActionsTaken] = useState<Array<{ type: string; consultantId: string }>>([]);
  const [showCompletion, setShowCompletion] = useState(false);

  // Sub-modals
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const priorityConsultants = consultantsSummary
    .filter(c => c.attentionScore >= 60)
    .sort((a, b) => b.attentionScore - a.attentionScore);

  const currentSummary = priorityConsultants[currentIndex];
  const isLast = currentIndex === priorityConsultants.length - 1;
  const isFirst = currentIndex === 0;

  const recordAction = useCallback((type: string, consultantId: string) => {
    setActionsTaken(prev => [...prev, { type, consultantId }]);
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      setShowCompletion(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLast]);

  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [isFirst]);

  if (priorityConsultants.length === 0) {
    return (
      <Modal isOpen onClose={onClose} title="Revue guidee" size="lg">
        <div className="text-center py-8">
          <p className="text-stone">Aucun consultant ne necessite d&apos;attention particuliere.</p>
          <Button variant="primary" onClick={onClose} className="mt-4">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  if (showCompletion) {
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} size="lg">
        <CompletionScreen
          reviewedCount={priorityConsultants.length}
          actionsTaken={actionsTaken}
          durationMs={Date.now() - startTime.current}
          onClose={onClose}
        />
      </Modal>
    );
  }

  const { consultant, attentionLevel, lastWeekStats, bagueConnecteeStats, primarySignal, suggestedActions } = currentSummary;
  const messageTemplate = suggestedActions.find(a => a.type === 'send_message')?.templateMessage;

  return (
    <>
      <Modal isOpen onClose={onClose} showCloseButton={false} size="xl">
        <div className="p-2 md:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ATTENTION_COLORS[attentionLevel] }}
              />
              <span className="text-sm font-medium text-stone">
                {currentIndex + 1}/{priorityConsultants.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone hover:text-charcoal hover:bg-neutral-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Consultant info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={consultant.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={consultant.name} size="md" />
                <div>
                  <h2 className="text-xl font-semibold text-charcoal">
                    {consultant.name}
                  </h2>
                  {consultant.is_premium && (
                    <Badge variant="premium" className="mt-1">Premium</Badge>
                  )}
                </div>
              </div>

              {/* Stats detaillees */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-stone mb-1">Humeur</p>
                  <TrendIcon trend={lastWeekStats.moodTrend} />
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-stone mb-1">Energie</p>
                  <TrendIcon trend={lastWeekStats.energyTrend} />
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-stone mb-1">Adhesion</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-semibold text-charcoal">
                      {Math.round(lastWeekStats.averageAdherence * 100)}%
                    </span>
                    <TrendIcon trend={lastWeekStats.adherenceTrend} />
                  </div>
                </div>
              </div>

              {/* Bague connectée stats */}
              {bagueConnecteeStats && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-stone" />
                      <span className="text-sm text-charcoal">
                        Sommeil : {bagueConnecteeStats.averageSleep.toFixed(1)}h
                      </span>
                      <TrendIcon trend={bagueConnecteeStats.sleepTrend} />
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-stone" />
                      <span className="text-sm text-charcoal">
                        HRV : {bagueConnecteeStats.averageHRV.toFixed(0)} ms
                      </span>
                      <TrendIcon trend={bagueConnecteeStats.hrvTrend} />
                    </div>
                  </div>
                </div>
              )}

              {/* Signal / Suggestion */}
              {primarySignal && (
                <div className="bg-sage-light/50 border border-divider rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-sage mb-1 text-sm">Suggestion</h3>
                  <p className="text-sm text-charcoal">{primarySignal.message}</p>
                  {suggestedActions[0] && suggestedActions[0].type !== 'open_dossier' && (
                    <p className="text-sm text-sage mt-2">
                      &rarr; {suggestedActions[0].description}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 mb-6">
                <p className="text-sm font-medium text-charcoal mb-3">Que souhaitez-vous faire ?</p>

                {suggestedActions.filter(a => a.type !== 'open_dossier').map(action => (
                  <button
                    key={action.type}
                    onClick={() => {
                      if (action.type === 'send_message' || action.type === 'celebrate') {
                        setShowMessageModal(true);
                      } else if (action.type === 'note_observation') {
                        setShowNoteModal(true);
                      } else if (action.type === 'adjust_conseillancier' || action.type === 'schedule_call') {
                        router.push(`/consultants/${consultant.id}`);
                        onClose();
                      }
                    }}
                    className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm text-charcoal transition-colors"
                  >
                    {action.label} &mdash; {action.description}
                  </button>
                ))}

                <button
                  onClick={() => {
                    router.push(`/consultants/${consultant.id}`);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm text-charcoal transition-colors flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Ouvrir le dossier complet
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="text-sm text-stone hover:text-charcoal disabled:opacity-30 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Precedent
            </button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<Pause className="w-3.5 h-3.5" />}
                onClick={() => setShowSnoozeModal(true)}
              >
                Plus tard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
              >
                {isLast ? 'Terminer' : 'Suivant'}
                {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Sub-modals */}
      {showMessageModal && (
        <SendMessageModal
          consultantName={consultant.name}
          consultantId={consultant.id}
          templateMessage={messageTemplate}
          onClose={() => setShowMessageModal(false)}
          onSent={() => {
            setShowMessageModal(false);
            recordAction('send_message', consultant.id);
          }}
        />
      )}

      {showSnoozeModal && (
        <SnoozeModal
          consultantName={consultant.name}
          consultantId={consultant.id}
          onClose={() => setShowSnoozeModal(false)}
          onSnoozed={() => {
            setShowSnoozeModal(false);
            recordAction('snooze', consultant.id);
            handleNext();
          }}
        />
      )}

      {showNoteModal && (
        <NoteObservationModal
          consultantName={consultant.name}
          consultantId={consultant.id}
          onClose={() => setShowNoteModal(false)}
          onSaved={() => {
            setShowNoteModal(false);
            recordAction('note_observation', consultant.id);
          }}
        />
      )}
    </>
  );
}
