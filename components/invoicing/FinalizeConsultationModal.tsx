'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { showToast } from '../ui/Toaster';
import { formatCurrency } from '@/lib/invoicing/utils';
import type { InvoiceTemplate } from '@/lib/invoicing/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consultationId: string;
  consultantId: string;
  consultantName: string;
  templates: InvoiceTemplate[];
  authToken: string;
}

export function FinalizeConsultationModal({
  isOpen,
  onClose,
  onSuccess,
  consultationId,
  consultantId,
  consultantName,
  templates,
  authToken,
}: Props) {
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('Consultation de naturopathie');
  const [montant, setMontant] = useState(80);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setDescription(template.description);
      setMontant(template.montant_defaut);
    }
  }

  async function handleFinalize() {
    setLoading(true);
    try {
      const isPaid = paymentMethod !== 'non_paye';

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
          status: isPaid ? 'paid' : 'issued',
          payment_method: isPaid ? paymentMethod : null,
          payment_date: isPaid ? new Date().toISOString() : null,
          payment_notes: paymentNotes || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erreur');
      }

      const { invoice } = await response.json();

      if (isPaid) {
        showToast.success(
          `Facture ${invoice.numero} creee et envoyee a ${consultantName}`
        );
      } else {
        showToast.success(
          `Facture ${invoice.numero} creee (en attente de paiement)`
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terminer la consultation"
      description={`Facturation pour ${consultantName}`}
      size="md"
    >
      <div className="space-y-4">
        {templates.length > 0 && (
          <Select
            label="Type de prestation"
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

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[13px] font-medium text-stone mb-1">
              Montant
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montant}
              onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
              className="w-full rounded-sm border border-sage/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10"
            />
          </div>
        </div>

        <Select
          label="Comment le consultant a-t-il paye ?"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="especes">Especes ({formatCurrency(montant)})</option>
          <option value="cheque">Cheque</option>
          <option value="cb">Carte bancaire</option>
          <option value="virement">Virement</option>
          <option value="non_paye">Non paye (emettre la facture)</option>
        </Select>

        {paymentMethod === 'cheque' && (
          <Textarea
            placeholder="Numero de cheque (optionnel)"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            className="min-h-[60px]"
          />
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleFinalize} loading={loading}>
          Valider et facturer
        </Button>
      </ModalFooter>
    </Modal>
  );
}
