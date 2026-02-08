'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  FileEdit,
  FolderOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  Heart,
  Zap,
  AlertTriangle,
  FileText,
  Leaf,
  Frown,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ConsultantSummary, Trend, Signal } from '@/lib/morning-review/types';
import { ATTENTION_COLORS } from '@/lib/morning-review/types';
import { SendMessageModal } from './SendMessageModal';
import { SnoozeModal } from './SnoozeModal';
import { NoteObservationModal } from './NoteObservationModal';

interface ConsultantCardProps {
  summary: ConsultantSummary;
  onActionComplete?: () => void;
}

const SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  FileText,
  AlertTriangle,
  Frown,
  Zap,
  Moon,
  Heart,
  TrendingUp,
  Leaf,
  FileEdit,
  FolderOpen,
};

function TrendIcon({ trend, className }: { trend: Trend; className?: string }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className={className ?? 'w-4 h-4 text-sage'} />;
    case 'down':
      return <TrendingDown className={className ?? 'w-4 h-4 text-gold'} />;
    default:
      return <Minus className={className ?? 'w-4 h-4 text-warmgray'} />;
  }
}

function SignalIcon({ signal }: { signal: Signal }) {
  const Icon = SIGNAL_ICONS[signal.iconName];
  if (!Icon) return null;

  const colorMap: Record<string, string> = {
    urgent: 'text-red-500',
    attention: 'text-gold',
    info: 'text-teal',
    positive: 'text-sage',
  };

  return <Icon className={`w-5 h-5 ${colorMap[signal.severity] ?? 'text-warmgray'}`} />;
}

function getStatusLine(summary: ConsultantSummary): string {
  const { consultant, attentionLevel } = summary;

  if (attentionLevel === 'urgent') {
    if (consultant.unreadMessagesCount > 0) {
      return `${consultant.unreadMessagesCount} message${consultant.unreadMessagesCount > 1 ? 's' : ''} non lu${consultant.unreadMessagesCount > 1 ? 's' : ''}`;
    }
    const entries = consultant.journalEntries;
    if (entries.length > 0) {
      const lastDate = new Date(entries[0].date);
      const days = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 7) {
        return `Pas de journal depuis ${days} jours`;
      }
    }
    return 'Merite votre attention aujourd\'hui';
  }

  if (attentionLevel === 'attention') return 'Phase d\'ajustement';
  if (attentionLevel === 'progress') return 'Belle progression';
  if (attentionLevel === 'insufficient') return 'Donnees insuffisantes';

  return 'Sur la bonne voie';
}

export function ConsultantCard({ summary, onActionComplete }: ConsultantCardProps) {
  const router = useRouter();
  const { consultant, attentionLevel, lastWeekStats, circularStats, primarySignal, suggestedActions } = summary;

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const nextConsultDate = consultant.nextConsultationDate
    ? new Date(consultant.nextConsultationDate)
    : null;
  const nextConsultFormatted = nextConsultDate
    ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(nextConsultDate)
    : null;

  // Template du premier message suggere
  const messageTemplate = suggestedActions.find(a => a.type === 'send_message')?.templateMessage;

  return (
    <>
      <motion.div
        layout
        className="border border-neutral-200 rounded-lg p-4 md:p-5 hover:shadow-md transition-shadow bg-white"
        data-testid="consultant-card"
        data-attention-level={attentionLevel}
      >
        {/* En-tete */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: ATTENTION_COLORS[attentionLevel] }}
              aria-label={`Niveau d'attention: ${attentionLevel}`}
            />
            <div className="flex items-center gap-2">
              <Avatar name={consultant.name} size="sm" />
              <div>
                <h3 className="text-base font-semibold text-charcoal">
                  {consultant.name}
                </h3>
                <p className="text-sm text-warmgray mt-0.5">
                  {getStatusLine(summary)}
                </p>
              </div>
            </div>
          </div>

          {consultant.is_premium && (
            <Badge variant="premium">Premium</Badge>
          )}
        </div>

        {/* Stats hebdomadaires */}
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-warmgray">
            <span>Humeur</span>
            <TrendIcon trend={lastWeekStats.moodTrend} />
          </div>
          <div className="flex items-center gap-1.5 text-warmgray">
            <span>Energie</span>
            <TrendIcon trend={lastWeekStats.energyTrend} />
          </div>
          <div className="flex items-center gap-1.5 text-warmgray">
            <span>Adhesion {Math.round(lastWeekStats.averageAdherence * 100)}%</span>
            <TrendIcon trend={lastWeekStats.adherenceTrend} />
          </div>
        </div>

        {/* Donnees Circular (si Premium) */}
        {circularStats && (
          <div className="mb-3 text-sm text-warmgray space-y-1">
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5" />
              <span>Sommeil : {circularStats.averageSleep.toFixed(1)}h</span>
              <TrendIcon trend={circularStats.sleepTrend} className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5" />
              <span>HRV : {circularStats.averageHRV.toFixed(0)} ms</span>
              <TrendIcon trend={circularStats.hrvTrend} className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Signal principal */}
        {primarySignal && (
          <div className="mb-3 p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-start gap-2">
              <SignalIcon signal={primarySignal} />
              <p className="text-sm text-charcoal flex-1">{primarySignal.message}</p>
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="flex gap-2 flex-wrap items-center">
          {suggestedActions.filter(a => a.type !== 'open_dossier').slice(0, 2).map(action => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              onClick={() => {
                if (action.type === 'send_message' || action.type === 'celebrate') {
                  setShowMessageModal(true);
                } else if (action.type === 'note_observation') {
                  setShowNoteModal(true);
                } else if (action.type === 'adjust_conseillancier') {
                  router.push(`/consultants/${consultant.id}`);
                } else if (action.type === 'schedule_call') {
                  router.push(`/consultants/${consultant.id}`);
                }
              }}
            >
              {action.label}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            icon={<FolderOpen className="w-4 h-4" />}
            onClick={() => router.push(`/consultants/${consultant.id}`)}
          >
            Dossier
          </Button>

          {nextConsultFormatted && (
            <span className="text-xs px-2.5 py-1 bg-teal/8 text-teal rounded border border-teal/15 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              RDV le {nextConsultFormatted}
            </span>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      {showMessageModal && (
        <SendMessageModal
          consultantName={consultant.name}
          consultantId={consultant.id}
          templateMessage={messageTemplate}
          onClose={() => setShowMessageModal(false)}
          onSent={() => {
            setShowMessageModal(false);
            onActionComplete?.();
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
            onActionComplete?.();
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
            onActionComplete?.();
          }}
        />
      )}
    </>
  );
}
