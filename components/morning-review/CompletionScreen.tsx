'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CompletionScreenProps {
  reviewedCount: number;
  actionsTaken: Array<{ type: string; consultantId: string }>;
  durationMs: number;
  onClose: () => void;
}

export function CompletionScreen({ reviewedCount, actionsTaken, durationMs, onClose }: CompletionScreenProps) {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  const stats = {
    messagesCount: actionsTaken.filter(a => a.type === 'send_message' || a.type === 'celebrate').length,
    notesCount: actionsTaken.filter(a => a.type === 'note_observation').length,
    snoozedCount: actionsTaken.filter(a => a.type === 'snooze').length,
  };

  const hasActions = stats.messagesCount > 0 || stats.notesCount > 0 || stats.snoozedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center p-8"
    >
      <div className="w-16 h-16 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-sage" />
      </div>

      <h2 className="text-2xl font-semibold text-charcoal mb-2">Revue terminee !</h2>
      <p className="text-stone mb-6">
        Vous avez parcouru {reviewedCount} consultant{reviewedCount > 1 ? 's' : ''} en {minutes} min {seconds.toString().padStart(2, '0')} sec.
      </p>

      {hasActions && (
        <div className="bg-neutral-50 rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
          <h3 className="font-medium text-charcoal mb-2">Actions effectuees :</h3>
          <ul className="space-y-1 text-sm text-stone">
            {stats.messagesCount > 0 && (
              <li>&bull; {stats.messagesCount} message{stats.messagesCount > 1 ? 's' : ''} envoye{stats.messagesCount > 1 ? 's' : ''}</li>
            )}
            {stats.notesCount > 0 && (
              <li>&bull; {stats.notesCount} observation{stats.notesCount > 1 ? 's' : ''} notee{stats.notesCount > 1 ? 's' : ''}</li>
            )}
            {stats.snoozedCount > 0 && (
              <li>&bull; {stats.snoozedCount} consultant{stats.snoozedCount > 1 ? 's' : ''} mis en pause</li>
            )}
          </ul>
        </div>
      )}

      <p className="text-sm text-stone mb-6">
        Votre pratique est entre de bonnes mains.
      </p>

      <Button variant="primary" onClick={onClose}>
        Retour au tableau de bord
      </Button>
    </motion.div>
  );
}
