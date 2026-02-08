'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSendMessageFromReview } from '@/hooks/useConsultantActions';
import { showToast } from '@/components/ui/Toaster';

interface SendMessageModalProps {
  consultantName: string;
  consultantId: string;
  templateMessage?: string;
  onClose: () => void;
  onSent: () => void;
}

const MESSAGE_TEMPLATES = [
  { id: 'check_in', label: 'Prise de nouvelles' },
  { id: 'encouragement', label: 'Encouragement' },
  { id: 'adjustment', label: 'Proposition d\'ajustement' },
];

function getTemplateContent(id: string, name: string): string {
  switch (id) {
    case 'check_in':
      return `Bonjour ${name}, j'ai remarque que vous n'avez pas partage votre journal depuis quelques jours. Tout va bien de votre cote ? Je suis la si vous avez besoin.`;
    case 'encouragement':
      return `Bonjour ${name} ! Je voulais vous feliciter pour votre belle progression cette semaine. Continuez comme ca, vous etes sur le bon chemin !`;
    case 'adjustment':
      return `Bonjour ${name}, je remarque que l'adhesion semble un peu difficile ces derniers temps. Que diriez-vous qu'on ajuste ensemble votre programme pour le rendre plus adapte ?`;
    default:
      return '';
  }
}

export function SendMessageModal({ consultantName, consultantId, templateMessage, onClose, onSent }: SendMessageModalProps) {
  const [message, setMessage] = useState(templateMessage ?? '');
  const sendMutation = useSendMessageFromReview();

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await sendMutation.mutateAsync({ consultantId, message: message.trim() });
      showToast.success('Message envoye');
      onSent();
    } catch {
      showToast.error('Erreur lors de l\'envoi du message');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Message a ${consultantName}`}
      size="lg"
    >
      <div>
        {/* Templates */}
        <div className="mb-4">
          <p className="text-sm text-warmgray mb-2">Suggestions de messages :</p>
          <div className="flex gap-2 flex-wrap">
            {MESSAGE_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => setMessage(getTemplateContent(template.id, consultantName))}
                className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-32 p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-teal/30 focus:border-teal text-sm resize-none"
          placeholder="Ecrivez votre message..."
          autoFocus
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
