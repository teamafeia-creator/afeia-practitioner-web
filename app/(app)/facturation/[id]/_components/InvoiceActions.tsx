'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmModal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import type { ConsultationInvoice } from '@/lib/invoicing/types';
import { Check, X, Download, Send, RotateCcw, Link2, Copy } from 'lucide-react';

interface Props {
  invoice: ConsultationInvoice;
  authToken: string;
  onRefresh: () => void;
  stripeConnected?: boolean;
}

export function InvoiceActions({ invoice, authToken, onRefresh, stripeConnected }: Props) {
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [refundMotif, setRefundMotif] = useState('consultation_annulee');
  const [refundDetail, setRefundDetail] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  async function handleMarkPaid() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoicing/${invoice.id}/mark-paid`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          payment_notes: paymentNotes || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      showToast.success('Facture marquee comme payee');
      setShowMarkPaidModal(false);
      onRefresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoicing/${invoice.id}/cancel`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      showToast.success('Facture annulee');
      setShowCancelModal(false);
      onRefresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoicing/${invoice.id}/refund`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          facture_origine_id: invoice.id,
          motif_remboursement: refundMotif,
          motif_detail: refundMotif === 'autre' ? refundDetail : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const { avoir } = await response.json();
      showToast.success(`Avoir ${avoir.numero} cree et envoye`);
      setShowRefundModal(false);
      onRefresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePaymentLink() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoicing/${invoice.id}/payment-link`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const { payment_link_url } = await response.json();
      showToast.success('Lien de paiement cree');

      // Copier dans le presse-papiers
      try {
        await navigator.clipboard.writeText(payment_link_url);
        showToast.success('Lien copie dans le presse-papiers');
      } catch {
        // Fallback si clipboard non disponible
      }

      onRefresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyPaymentLink() {
    if (invoice.stripe_payment_link_url) {
      try {
        await navigator.clipboard.writeText(invoice.stripe_payment_link_url);
        showToast.success('Lien copie dans le presse-papiers');
      } catch {
        showToast.error('Impossible de copier le lien');
      }
    }
  }

  async function handleDownloadPdf() {
    try {
      const response = await fetch('/api/invoicing/generate-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invoice_id: invoice.id }),
      });

      if (!response.ok) throw new Error('Erreur generation PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.is_avoir ? 'avoir' : 'facture'}_${invoice.numero || 'brouillon'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast.error('Erreur lors du telechargement du PDF');
    }
  }

  async function handleSendEmail() {
    setLoading(true);
    try {
      const response = await fetch('/api/invoicing/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ invoice_id: invoice.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      showToast.success(
        `Email envoye a ${invoice.consultant_snapshot.email}`
      );
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur envoi email'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={handleDownloadPdf}
        >
          Telecharger PDF
        </Button>

        {(invoice.status === 'paid' || invoice.status === 'refunded') && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Send className="h-4 w-4" />}
            onClick={handleSendEmail}
            loading={loading}
          >
            Renvoyer par email
          </Button>
        )}

        {(invoice.status === 'draft' || invoice.status === 'issued') && (
          <Button
            variant="success"
            size="sm"
            icon={<Check className="h-4 w-4" />}
            onClick={() => setShowMarkPaidModal(true)}
          >
            Marquer comme payee
          </Button>
        )}

        {/* V2: Lien de paiement Stripe */}
        {invoice.status === 'issued' && stripeConnected && !invoice.stripe_payment_link_url && (
          <Button
            variant="outline"
            size="sm"
            icon={<Link2 className="h-4 w-4" />}
            onClick={handleCreatePaymentLink}
            loading={loading}
          >
            Creer lien de paiement
          </Button>
        )}

        {invoice.stripe_payment_link_url && invoice.status === 'issued' && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Copy className="h-4 w-4" />}
            onClick={handleCopyPaymentLink}
          >
            Copier lien paiement
          </Button>
        )}

        {/* V2: Rembourser */}
        {invoice.status === 'paid' && !invoice.is_avoir && (
          <Button
            variant="destructive"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setShowRefundModal(true)}
          >
            Rembourser
          </Button>
        )}

        {(invoice.status === 'draft' || invoice.status === 'issued') && (
          <Button
            variant="destructive"
            size="sm"
            icon={<X className="h-4 w-4" />}
            onClick={() => setShowCancelModal(true)}
          >
            Annuler
          </Button>
        )}
      </div>

      {/* Modal Marquer comme payee */}
      <Modal
        isOpen={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        title="Marquer comme payee"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Moyen de paiement"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="especes">Especes</option>
            <option value="cheque">Cheque</option>
            <option value="cb">Carte bancaire</option>
            <option value="virement">Virement</option>
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
          <Button
            variant="ghost"
            onClick={() => setShowMarkPaidModal(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="success"
            onClick={handleMarkPaid}
            loading={loading}
          >
            Confirmer le paiement
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Rembourser (V2) */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Rembourser cette facture"
        description="Un avoir sera cree et la facture sera marquee comme remboursee."
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Motif du remboursement"
            value={refundMotif}
            onChange={(e) => setRefundMotif(e.target.value)}
          >
            <option value="consultation_annulee">Consultation annulee</option>
            <option value="erreur_facturation">Erreur de facturation</option>
            <option value="geste_commercial">Geste commercial</option>
            <option value="autre">Autre</option>
          </Select>

          {refundMotif === 'autre' && (
            <Textarea
              placeholder="Preciser le motif..."
              value={refundDetail}
              onChange={(e) => setRefundDetail(e.target.value)}
              className="min-h-[60px]"
            />
          )}
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowRefundModal(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            loading={loading}
          >
            Creer l&apos;avoir
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Annuler */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Annuler cette facture ?"
        message="Le numero de facture sera conserve mais la facture sera marquee comme annulee. Cette action est irreversible."
        confirmText="Annuler la facture"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
