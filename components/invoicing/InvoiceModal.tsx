'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { showToast } from '../ui/Toaster';
import type { InvoiceTemplate } from '@/lib/invoicing/types';
import { formatCurrency } from '@/lib/invoicing/utils';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consultantId: string;
  consultantName: string;
  consultationId?: string | null;
  templates: InvoiceTemplate[];
  authToken: string;
}

export function InvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  consultantId,
  consultantName,
  consultationId = null,
  templates,
  authToken,
}: InvoiceModalProps) {
  const [templateId, setTemplateId] = useState<string>('');
  const [description, setDescription] = useState('Consultation de naturopathie');
  const [montant, setMontant] = useState<number>(80);
  const [paymentMethod, setPaymentMethod] = useState<string>('especes');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [createAsDraft, setCreateAsDraft] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setDescription(template.description);
      setMontant(template.montant_defaut);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const status = createAsDraft ? 'draft' : paymentMethod === 'non_paye' ? 'issued' : 'paid';

      const response = await fetch('/api/invoicing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          consultant_id: consultantId,
          consultation_id: consultationId,
          template_id: templateId || null,
          description,
          montant,
          status,
          payment_method: status === 'paid' ? paymentMethod : null,
          payment_date: status === 'paid' ? new Date().toISOString() : null,
          payment_notes: paymentNotes || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erreur');
      }

      const { invoice } = await response.json();

      if (status === 'paid') {
        showToast.success(
          `Facture ${invoice.numero} creee et envoyee a ${consultantName}`
        );
      } else if (status === 'issued') {
        showToast.success(
          `Facture ${invoice.numero} creee (en attente de paiement)`
        );
      } else {
        showToast.success('Brouillon de facture cree');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast.error('Une erreur est survenue lors de la creation de la facture');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle facture"
      description={`Pour ${consultantName}`}
      size="md"
    >
      <div className="space-y-4">
        {templates.length > 0 && (
          <Select
            label="Template"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">Choisir un template...</option>
            {templates
              .filter((t) => t.is_active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({formatCurrency(t.montant_defaut)})
                </option>
              ))}
          </Select>
        )}

        <Input
          label="Description de la prestation"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Consultation de naturopathie"
        />

        <Input
          label="Montant (EUR)"
          type="number"
          step="0.01"
          min="0"
          value={montant}
          onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
        />

        {!createAsDraft && (
          <Select
            label="Moyen de paiement"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="especes">Especes</option>
            <option value="cheque">Cheque</option>
            <option value="cb">Carte bancaire</option>
            <option value="virement">Virement</option>
            <option value="non_paye">Non paye (emettre la facture)</option>
          </Select>
        )}

        {paymentMethod === 'cheque' && !createAsDraft && (
          <Textarea
            placeholder="Numero de cheque (optionnel)"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            className="min-h-[60px]"
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={createAsDraft}
            onChange={(e) => setCreateAsDraft(e.target.checked)}
            className="rounded border-sage/30 text-sage focus:ring-sage/30"
          />
          <span className="text-sm text-stone">
            Enregistrer comme brouillon
          </span>
        </label>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          {createAsDraft
            ? 'Enregistrer le brouillon'
            : paymentMethod === 'non_paye'
              ? 'Emettre la facture'
              : 'Valider et facturer'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
