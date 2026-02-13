'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSaveObservationNote } from '@/hooks/useConsultantActions';
import { showToast } from '@/components/ui/Toaster';

interface NoteObservationModalProps {
  consultantName: string;
  consultantId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function NoteObservationModal({ consultantName, consultantId, onClose, onSaved }: NoteObservationModalProps) {
  const [content, setContent] = useState('');
  const saveMutation = useSaveObservationNote();

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      await saveMutation.mutateAsync({ consultantId, content: content.trim() });
      showToast.success('Observation enregistree');
      onSaved();
    } catch {
      showToast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Observation : ${consultantName}`}
      size="md"
    >
      <div>
        <p className="text-sm text-stone mb-3">
          Cette note sera ajoutee a vos observations privees pour ce consultant.
        </p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-32 p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-sage/30 focus:border-sage text-sm resize-none"
          placeholder="Votre observation..."
          autoFocus
        />

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!content.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
