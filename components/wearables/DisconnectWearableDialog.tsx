'use client';

import { useEffect, useState } from 'react';
import { Button, Modal, ModalFooter } from '@/components/ui';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteData: boolean) => void;
  loading?: boolean;
};

/** Confirmation de la déconnexion. « Supprimer aussi mes données déjà importées » est cochée par défaut. */
export function DisconnectWearableDialog({ isOpen, onClose, onConfirm, loading = false }: Props) {
  const [deleteData, setDeleteData] = useState(true);

  // Chaque ouverture repart de la valeur par défaut (suppression cochée).
  useEffect(() => {
    if (isOpen) setDeleteData(true);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title="Déconnecter mon objet connecté ?" size="sm">
      <div className="space-y-4 px-5 pb-4 text-[13px] text-charcoal">
        <p className="text-stone">
          Votre praticien ne recevra plus de nouvelles données. Vous pourrez reconnecter votre objet connecté quand vous voudrez.
        </p>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-sage"
            checked={deleteData}
            onChange={(e) => setDeleteData(e.target.checked)}
            disabled={loading}
            data-testid="disconnect-delete-data"
          />
          <span>
            Supprimer aussi mes données déjà importées
            <span className="mt-0.5 block text-xs text-stone">
              {deleteData
                ? 'Sommeil, récupération, fréquence cardiaque et activité seront effacés d’Afeia.'
                : 'Les données déjà importées resteront visibles par votre praticien.'}
            </span>
          </span>
        </label>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="destructive" onClick={() => onConfirm(deleteData)} loading={loading} data-testid="disconnect-confirm">
          Déconnecter
        </Button>
      </ModalFooter>
    </Modal>
  );
}
