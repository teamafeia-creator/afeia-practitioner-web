'use client';

import { useEffect, useState } from 'react';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { WEARABLES_CONSENT_TEXT } from '@/lib/wearables/consent-text';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  loading?: boolean;
};

/** Consentement avant la redirection vers le fournisseur. Texte : content/consents/wearables-v1.md. */
export function WearableConsentDialog({ isOpen, onClose, onAccept, loading = false }: Props) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (isOpen) setChecked(false);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title="Avant de connecter votre objet connecté" size="lg">
      <div className="max-h-[55vh] overflow-y-auto px-5 pb-4 text-[13px] text-charcoal" data-testid="wearable-consent-text">
        <MarkdownRenderer content={WEARABLES_CONSENT_TEXT} />
      </div>
      <div className="px-5 pb-4">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] text-charcoal">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-sage"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={loading}
            data-testid="wearable-consent-checkbox"
          />
          J&apos;ai lu ces informations et j&apos;accepte que les données de mon objet connecté soient partagées avec mon praticien.
        </label>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={onAccept} disabled={!checked} loading={loading} data-testid="wearable-consent-accept">
          Accepter et continuer
        </Button>
      </ModalFooter>
    </Modal>
  );
}
