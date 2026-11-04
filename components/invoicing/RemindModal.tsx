'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { consultantName, dateShort, eur } from '@/lib/invoicing/display';
import { fillReminder, reminderSubject } from '@/lib/invoicing/manual-reminder';
import type { ConsultationInvoice } from '@/lib/invoicing/types';
import { EmailPreviewBox } from './NewInvoiceModal';

export const daysSince = (iso: string | null | undefined) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
export const ageLabel = (d: number) => (d === 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} jours`);

/**
 * Relance des factures impayées : texte prédéfini et modifiable, aperçu pour le premier
 * consultant coché, envoi seulement après « Envoyer » (validation du praticien).
 */
export function RemindModal({
  open,
  onClose,
  unpaid,
  initialIds,
  lastReminded,
  authToken,
  savedText,
  defaultText,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  unpaid: ConsultationInvoice[];
  initialIds: string[];
  lastReminded: Record<string, string>;
  authToken: string;
  savedText: string;
  defaultText: string;
  onSent: (text: string, saved: boolean) => void;
}) {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [text, setText] = useState(savedText);
  const [pdf, setPdf] = useState(true);
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s: Record<string, boolean> = {};
    initialIds.forEach((id) => (s[id] = true));
    setSel(s);
    setText(savedText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = unpaid.filter((i) => sel[i.id]);
  const first = chosen[0] ?? unpaid[0];
  const noEmail = chosen.filter((i) => !i.consultant_snapshot?.email);

  async function send() {
    if (!chosen.length) return showToast.error('Cochez au moins une facture à relancer.');
    if (!text.trim()) return showToast.error('Le message est vide.');
    setBusy(true);
    try {
      const res = await fetch('/api/invoicing/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ invoice_ids: chosen.map((i) => i.id), text, attach_pdf: pdf, save_template: save }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Les relances n’ont pas pu être envoyées.');
      const sent = (body.sent ?? []).length as number;
      if (sent) showToast.success(sent > 1 ? `${sent} relances envoyées par e-mail.` : `Relance envoyée à ${consultantName(chosen[0]).split(' ')[0]}.`);
      if ((body.failed ?? []).length) showToast.error(`${body.failed.length} relance${body.failed.length > 1 ? 's' : ''} non envoyée${body.failed.length > 1 ? 's' : ''} (adresse e-mail manquante ou erreur).`);
      onSent(text, save);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Les relances n’ont pas pu être envoyées.');
    } finally {
      setBusy(false);
    }
  }

  const box = (on: boolean) => ({ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent' });
  const n = chosen.length;

  return (
    <Modal isOpen={open} onClose={onClose} title="Relancer les factures impayées" size="xl">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          {unpaid.map((i) => {
            const on = !!sel[i.id];
            const d = daysSince(i.date_emission);
            const last = lastReminded[i.id];
            return (
              <button
                key={i.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => setSel((s) => ({ ...s, [i.id]: !s[i.id] }))}
                className="flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-charcoal"
                style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#1C2230' : 'transparent' }}
              >
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 text-xs font-bold text-ink" style={box(on)}>{on ? '✓' : ''}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{consultantName(i)} · n° {i.numero}</span>
                  <span className="text-xs" style={{ color: d >= 15 ? '#E8A87C' : '#8B95A5' }}>
                    Émise {ageLabel(d)}
                    {last ? ` · dernière relance le ${dateShort(last)}` : ' · jamais relancée'}
                    {!i.consultant_snapshot?.email ? ' · pas d’e-mail' : ''}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{eur(Number(i.montant))}</span>
              </button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Message
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-y rounded-[10px] border border-divider bg-cream px-3.5 py-3 text-sm leading-[1.55] text-charcoal outline-none focus:border-sage"
          />
        </label>
        <span className="text-xs leading-normal text-stone">Les mots entre accolades sont remplacés pour chaque consultant : {'{prénom}'}, {'{numéro}'}, {'{date}'}, {'{montant}'}, {'{lien de paiement}'} (retiré si la facture n’a pas de lien de paiement en ligne).</span>
        {first && <EmailPreviewBox subject={reminderSubject(first)} text={fillReminder(text, first)} label={`Aperçu pour ${consultantName(first).split(' ')[0]}`} />}
        {noEmail.length > 0 && (
          <p role="note" className="text-[13px] text-[#E8A87C]">Sans adresse e-mail, non relancé : {noEmail.map((i) => consultantName(i)).join(', ')}.</p>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={pdf} onChange={() => setPdf((v) => !v)} className="h-[18px] w-[18px] accent-[#6DD4B8]" />
            Joindre la facture en PDF
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={save} onChange={() => setSave((v) => !v)} className="h-[18px] w-[18px] accent-[#6DD4B8]" />
            Garder ce texte pour les prochaines relances
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-1.5">
          <button type="button" onClick={() => setText(defaultText)} className="h-[30px] flex-1 text-left text-[13px] text-sage">Revenir au texte par défaut</button>
          <button type="button" onClick={onClose} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
          <button
            type="button"
            disabled={!n || busy}
            onClick={() => void send()}
            className="flex h-11 items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold disabled:cursor-not-allowed"
            style={{ background: n ? '#6DD4B8' : '#2A3140', color: n ? '#0A0E14' : '#8B95A5' }}
          >
            {busy && <Spinner size="sm" />}
            {n > 1 ? `Valider et envoyer les ${n} relances` : n === 1 ? 'Valider et envoyer la relance' : 'Aucune facture cochée'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
