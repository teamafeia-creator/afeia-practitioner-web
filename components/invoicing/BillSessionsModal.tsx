'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { eur, invoiceEmailPreview, type PractitionerName } from '@/lib/invoicing/display';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { InvoiceDocumentType } from '@/lib/invoicing/types';
import { EmailPreviewBox, type ToBill } from './NewInvoiceModal';

function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

/**
 * « Séances terminées sans facture » : le praticien coche les séances, relit l'e-mail
 * qui partira avec chaque facture, puis valide. Une facture est émise par séance, au tarif de la séance.
 */
export function BillSessionsModal({
  open,
  onClose,
  toBill,
  authToken,
  practitionerName,
  documentType = 'facture',
  onEdit,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  toBill: ToBill[];
  authToken: string;
  practitionerName?: PractitionerName;
  documentType?: InvoiceDocumentType;
  onEdit: (appointmentId: string) => void;
  onDone: () => void;
}) {
  const billable = toBill.filter((t) => t.amount != null && t.amount > 0);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s: Record<string, boolean> = {};
    billable.forEach((t) => (s[t.appointmentId] = true));
    setSel(s);
    setStep('pick');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = billable.filter((t) => sel[t.appointmentId]);
  const all = billable.length > 0 && billable.every((t) => sel[t.appointmentId]);
  const total = chosen.reduce((s, t) => s + (t.amount ?? 0), 0);
  const n = chosen.length;
  const first = chosen[0];
  const mail = first ? invoiceEmailPreview(first.who.split(' ')[0], practitionerName, documentType) : null;
  const noEmail = chosen.filter((t) => !t.email);

  async function send() {
    if (!n) return;
    setBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const t of chosen) {
      try {
        const res = await fetch('/api/invoicing/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            consultant_id: t.consultantId,
            consultation_id: null,
            appointment_id: t.appointmentId,
            template_id: null,
            description: `${t.what} · séance du ${t.date}`,
            montant: t.amount,
            payment_method: null,
            payment_date: null,
            payment_notes: null,
            status: 'issued',
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message);
        if (t.email) {
          await fetch('/api/invoicing/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ invoice_id: body.invoice.id }),
          });
        }
        ok += 1;
      } catch {
        failed.push(t.who.split(' ')[0]);
      }
    }
    setBusy(false);
    if (ok) showToast.success(ok > 1 ? `${ok} factures émises et envoyées par e-mail.` : `Facture émise et envoyée à ${chosen[0].who.split(' ')[0]}.`);
    if (failed.length) showToast.error(`Facture non émise pour : ${failed.join(', ')}.`);
    onDone();
    onClose();
  }

  const box = (on: boolean) => ({ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent' });

  return (
    <Modal isOpen={open} onClose={onClose} title={step === 'pick' ? 'Séances terminées sans facture' : 'Vérifier avant l’envoi'} size="xl">
      {step === 'pick' ? (
        <div className="flex flex-col gap-3.5">
          <p className="text-sm leading-[1.55] text-[#B8C1CF]">Cochez les séances à facturer. Chaque consultant reçoit sa facture par e-mail, au tarif de la séance. Vous relisez l’e-mail avant l’envoi.</p>
          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                const s: Record<string, boolean> = {};
                billable.forEach((t) => (s[t.appointmentId] = !all));
                setSel(s);
              }}
              className="h-[30px] text-[13px] text-sage"
              disabled={!billable.length}
            >
              {all ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-[13px] text-stone">{n} sur {billable.length} sélectionnée{n > 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-col gap-2">
            {toBill.map((t) => {
              const can = t.amount != null && t.amount > 0;
              const on = can && !!sel[t.appointmentId];
              return (
                <div key={t.appointmentId} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#1C2230' : 'transparent' }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`Facturer ${t.who}, ${t.what} du ${t.date}`}
                    disabled={!can}
                    onClick={() => setSel((s) => ({ ...s, [t.appointmentId]: !s[t.appointmentId] }))}
                    className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left text-charcoal disabled:cursor-not-allowed"
                  >
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 text-xs font-bold text-ink" style={box(on)}>{on ? '✓' : ''}</span>
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold text-ink" style={{ background: colorOf(t.consultantId) }}>{initialsOf(t.who)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{t.who}</span>
                      <span className="truncate text-xs text-stone">{t.what} · {t.date}{t.email ? ` · ${t.email}` : ' · pas d’e-mail'}</span>
                    </span>
                    <span className="font-medium tabular-nums">{can ? eur(t.amount as number) : 'Tarif à saisir'}</span>
                  </button>
                  <button type="button" onClick={() => onEdit(t.appointmentId)} className="h-9 rounded-lg border border-divider px-2.5 text-xs text-[#B8C1CF] hover:border-sage">Modifier</button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-divider pt-1.5">
            <span className="flex-1 text-[13px] text-stone">Total : <strong className="tabular-nums text-charcoal">{eur(total)}</strong></span>
            <button type="button" onClick={onClose} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Plus tard</button>
            <button
              type="button"
              disabled={!n}
              onClick={() => setStep('confirm')}
              className="h-11 rounded-[10px] px-[18px] text-sm font-semibold disabled:cursor-not-allowed"
              style={{ background: n ? '#6DD4B8' : '#2A3140', color: n ? '#0A0E14' : '#8B95A5' }}
            >
              {n ? 'Relire l’e-mail' : 'Aucune séance cochée'}
            </button>
          </div>
          <span className="text-xs text-stone">Numéros attribués automatiquement. Mention « TVA non applicable, article 293 B du CGI » ajoutée. « Modifier » permet de changer la désignation, le montant ou d’indiquer qu’elle est déjà réglée.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <p className="text-sm leading-[1.55] text-[#B8C1CF]">
            {n > 1 ? `${n} factures` : '1 facture'} pour un total de {eur(total)} : {chosen.map((t) => t.who.split(' ')[0]).join(', ')}. Chaque e-mail est personnalisé avec le prénom du consultant et contient la facture en PDF.
          </p>
          {mail && <EmailPreviewBox subject={mail.subject} text={mail.text} label={`Aperçu pour ${first.who.split(' ')[0]}`} />}
          {noEmail.length > 0 && (
            <p role="note" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-3.5 py-2.5 text-[13px] text-[#F2D2BB]">
              Sans adresse e-mail : {noEmail.map((t) => t.who).join(', ')}. La facture sera émise mais pas envoyée.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-divider pt-1.5">
            <button type="button" onClick={() => setStep('pick')} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Retour</button>
            <button type="button" disabled={busy} onClick={() => void send()} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
              {busy && <Spinner size="sm" />}
              {n > 1 ? `Valider et envoyer les ${n} factures` : 'Valider et envoyer la facture'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
