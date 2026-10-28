'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import { MANUAL_METHODS, METHOD_LABELS, REFUND_REASONS, STATUS_UI, consultantName, dateShort, eur } from '@/lib/invoicing/display';
import type { ConsultationInvoice, InvoiceHistory, PaymentMethod } from '@/lib/invoicing/types';

const HISTORY: Record<string, { l: string; c: string }> = {
  created: { l: 'Facture créée', c: '#8B95A5' },
  issued: { l: 'Facture émise', c: '#7B93DB' },
  sent: { l: 'Envoyée par e-mail', c: '#7B93DB' },
  paid: { l: 'Paiement enregistré', c: '#6DD4B8' },
  refunded: { l: 'Remboursée · avoir émis', c: '#A9B8EC' },
  cancelled: { l: 'Facture annulée', c: '#E57B7B' },
  updated: { l: 'Facture modifiée', c: '#8B95A5' },
  payment_link_created: { l: 'Lien de paiement créé', c: '#7B93DB' },
};
const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Act = 'pay' | 'refund' | 'cancel' | null;

export default function InvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<ConsultationInvoice | null | undefined>(undefined);
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [token, setToken] = useState('');
  const [stripe, setStripe] = useState(false);
  const [act, setAct] = useState<Act>(null);
  const [method, setMethod] = useState<PaymentMethod>('cb');
  const [reason, setReason] = useState<string>('consultation_annulee');
  const [reasonDetail, setReasonDetail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token ?? '';
    setToken(t);
    const [res, st] = await Promise.all([
      fetch(`/api/invoicing/${id}`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch('/api/stripe/connect/account-status', { headers: { Authorization: `Bearer ${t}` } }).catch(() => null),
    ]);
    if (!res.ok) {
      setInvoice(null);
      return;
    }
    const body = await res.json();
    setInvoice(body.invoice);
    setHistory(body.history ?? []);
    if (st?.ok) {
      const s = await st.json();
      setStripe(!!(s.connected && s.charges_enabled));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (key: string, url: string, body?: unknown) => {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Action impossible.');
      return json;
    } finally {
      setBusy(null);
    }
  };

  if (invoice === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="rounded-2xl border border-divider bg-surface p-8 text-center text-stone">
        Cette facture n’existe pas ou vous n’y avez pas accès. <Link href="/facturation" className="text-sage">Retour à la facturation</Link>
      </div>
    );
  }

  const who = consultantName(invoice);
  const first = invoice.consultant_snapshot?.prenom || who.split(' ')[0];
  const p = invoice.practitioner_snapshot;
  const s = STATUS_UI[invoice.status];
  const canPay = invoice.status === 'issued' || invoice.status === 'draft';
  const amount = Number(invoice.montant);
  const docTitle = invoice.is_avoir ? 'AVOIR' : invoice.status === 'refunded' ? 'FACTURE (remboursée)' : 'FACTURE';

  async function downloadPdf() {
    if (!invoice) return;
    setBusy('pdf');
    try {
      const res = await fetch('/api/invoicing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${invoice.is_avoir ? 'avoir' : 'facture'}_${invoice.numero || 'brouillon'}.pdf`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      showToast.error('Le PDF n’a pas pu être généré.');
    } finally {
      setBusy(null);
    }
  }

  async function sendMail() {
    if (!invoice) return;
    try {
      if (invoice.status === 'draft') {
        setBusy('mail');
        const res = await fetch(`/api/invoicing/${invoice.id}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'issued' }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'La facture n’a pas pu être émise.');
      }
      await call('mail', '/api/invoicing/send-email', { invoice_id: invoice.id });
      showToast.success(invoice.status === 'draft' ? `Facture émise et envoyée à ${invoice.consultant_snapshot.email}.` : `Facture renvoyée à ${invoice.consultant_snapshot.email}.`);
      void load();
    } catch (e) {
      setBusy(null);
      showToast.error(e instanceof Error ? e.message : 'L’e-mail n’a pas pu être envoyé.');
    }
  }

  async function paymentLink() {
    if (!invoice) return;
    try {
      const url = invoice.stripe_payment_link_url ?? (await call('link', `/api/invoicing/${invoice.id}/payment-link`)).payment_link_url;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      showToast.success(`Lien de paiement copié. Collez-le dans un message à ${first}.`);
      void load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Le lien n’a pas pu être créé.');
    }
  }

  async function confirmAct() {
    if (!invoice) return;
    try {
      if (act === 'pay') {
        await call('act', `/api/invoicing/${invoice.id}/mark-paid`, { payment_method: method, payment_date: new Date().toISOString(), payment_notes: null });
        showToast.success('Paiement enregistré.');
      } else if (act === 'refund') {
        if (reason === 'autre' && !reasonDetail.trim()) {
          showToast.error('Précisez le motif du remboursement.');
          return;
        }
        const r = await call('act', `/api/invoicing/${invoice.id}/refund`, { facture_origine_id: invoice.id, motif_remboursement: reason, motif_detail: reason === 'autre' ? reasonDetail.trim() : undefined });
        showToast.success(`Avoir ${r.avoir?.numero ?? ''} émis et envoyé à ${first}.`);
      } else if (act === 'cancel') {
        await call('act', `/api/invoicing/${invoice.id}/cancel`);
        showToast.success('Facture annulée.');
      }
      setAct(null);
      void load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  const pill = (on: boolean) => ({ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' });
  const outline = 'flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-divider text-sm text-charcoal hover:border-sage disabled:opacity-60';
  const actConf = {
    pay: { t: 'Marquer comme payée', d: `Comment ${first} a-t-il réglé ${eur(amount)} ?`, cta: 'Enregistrer le paiement', bg: '#6DD4B8' },
    refund: { t: 'Rembourser cette facture', d: `Un avoir de ${eur(amount)} sera émis et envoyé à ${first}. Motif :`, cta: 'Émettre l’avoir', bg: '#E57B7B' },
    cancel: { t: 'Annuler cette facture ?', d: 'Elle reste dans votre historique avec le statut Annulée : une facture émise ne se supprime pas.', cta: 'Annuler la facture', bg: '#E57B7B' },
  };

  return (
    <div className="flex max-w-[1180px] flex-col gap-5">
      <Toaster />
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/facturation" className="text-sage hover:text-sage-dark">← Facturation</Link>
        <span className="text-mist">/</span>
        <span className="text-stone">{invoice.is_avoir ? 'Avoir' : 'Facture'} {invoice.numero ?? '(brouillon)'}</span>
      </nav>
      <div className="flex flex-wrap items-start gap-6">
        <article aria-label="Aperçu de la facture" className="flex min-w-0 flex-[999_1_520px] flex-col gap-[22px] rounded-md bg-[#F7F5F0] p-10 text-[#1E2430] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex flex-col gap-[3px] text-[13px] leading-normal">
              <span className="font-serif text-xl font-semibold">{[p?.prenom, p?.nom].filter(Boolean).join(' ')}</span>
              {p?.statut_juridique && <span>{p.statut_juridique}</span>}
              {p?.adresse && <span className="whitespace-pre-line">{p.adresse}</span>}
              {p?.siret && <span>SIRET {p.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}</span>}
            </div>
            <div className="flex flex-col items-end gap-[3px] text-[13px]">
              <span className="font-serif text-[26px] font-semibold">{docTitle}</span>
              <span>N° {invoice.numero ?? '(attribué à l’émission)'}</span>
              <span>Émise le {dateShort(invoice.date_emission)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-[3px] text-[13px] leading-normal">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B7280]">Facturé à</span>
            <span className="font-semibold">{who}</span>
            {invoice.consultant_snapshot?.email && <span>{invoice.consultant_snapshot.email}</span>}
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[#1E2430] text-left">
                <th className="py-2">Désignation</th>
                <th className="py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#D8D4CB]">
                <td className="py-3">{invoice.description}</td>
                <td className="py-3 text-right tabular-nums">{eur(amount)}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end gap-6 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{eur(amount)}</span>
          </div>
          <span className="text-xs text-[#4B5563]">{p?.mention_tva || 'TVA non applicable, article 293 B du CGI.'}</span>
          {invoice.status === 'paid' && (
            <span className="-rotate-3 self-start rounded-md border-2 border-[#2E7D5B] px-3 py-1.5 text-[13px] font-bold text-[#2E7D5B]">
              PAYÉE · {dateShort(invoice.payment_date)}{invoice.payment_method ? ` · ${METHOD_LABELS[invoice.payment_method]}` : ''}
            </span>
          )}
        </article>

        <aside className="flex min-w-0 max-w-[340px] flex-[1_1_280px] flex-col gap-3.5">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-[18px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-stone">Statut</span>
              <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>{s.l}</span>
            </div>
            {canPay && !invoice.is_avoir && (
              <>
                <button type="button" onClick={() => setAct('pay')} className="h-[46px] rounded-[10px] bg-sage text-[15px] font-semibold text-ink hover:bg-sage-deep">
                  Marquer comme payée
                </button>
                {invoice.status === 'issued' && stripe && (
                  <button type="button" disabled={busy === 'link'} onClick={() => void paymentLink()} className={outline}>
                    {busy === 'link' && <Spinner size="sm" />}
                    {invoice.stripe_payment_link_url ? 'Copier le lien de paiement' : 'Créer un lien de paiement en ligne'}
                  </button>
                )}
              </>
            )}
            <button type="button" disabled={busy === 'pdf'} onClick={() => void downloadPdf()} className={outline}>
              {busy === 'pdf' && <Spinner size="sm" />}
              Télécharger le PDF
            </button>
            {invoice.status !== 'cancelled' && (
              <button type="button" disabled={busy === 'mail'} onClick={() => void sendMail()} className={outline}>
                {busy === 'mail' && <Spinner size="sm" />}
                {invoice.status === 'draft' ? 'Émettre et envoyer par e-mail' : 'Renvoyer par e-mail'}
              </button>
            )}
            {invoice.status === 'paid' && !invoice.is_avoir && (
              <button type="button" onClick={() => setAct('refund')} className="h-[42px] rounded-[10px] border border-[#4A2F2F] text-sm text-[#E57B7B]">
                Rembourser
              </button>
            )}
            {canPay && (
              <button type="button" onClick={() => setAct('cancel')} className="h-[38px] text-[13px] text-[#E57B7B]">
                Annuler la facture
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-[18px]">
            <h2 className="text-[15px] font-semibold text-charcoal">Historique</h2>
            {history.length === 0 && <span className="text-[13px] text-stone">Aucun événement.</span>}
            {[...history]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((h) => {
                const conf = HISTORY[h.action] ?? { l: h.action, c: '#8B95A5' };
                return (
                  <div key={h.id} className="flex gap-2.5">
                    <span className="mt-[5px] h-2.5 w-2.5 flex-none rounded-full" style={{ background: conf.c }} />
                    <span className="flex flex-col gap-px">
                      <span className="text-sm text-charcoal">{conf.l}</span>
                      <span className="text-xs text-stone">{longFmt.format(new Date(h.created_at))}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </aside>
      </div>

      <Modal isOpen={!!act} onClose={() => setAct(null)} title={act ? actConf[act].t : ''}>
        {act && (
          <div className="flex flex-col gap-3.5">
            <p className="text-sm leading-[1.55] text-[#B8C1CF]">{actConf[act].d}</p>
            {act === 'pay' && (
              <div role="radiogroup" className="flex flex-wrap gap-1.5">
                {MANUAL_METHODS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className="h-[38px] rounded-full border px-3.5 text-[13px] font-medium" style={pill(method === m)}>
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            )}
            {act === 'refund' && (
              <>
                <div role="radiogroup" className="flex flex-wrap gap-1.5">
                  {REFUND_REASONS.map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={reason === k} onClick={() => setReason(k)} className="h-[38px] rounded-full border px-3.5 text-[13px] font-medium" style={pill(reason === k)}>
                      {l}
                    </button>
                  ))}
                </div>
                {reason === 'autre' && (
                  <input
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    aria-label="Préciser le motif"
                    placeholder="Précisez le motif"
                    className="h-11 rounded-[10px] border border-divider bg-cream px-3 text-sm text-charcoal outline-none focus:border-sage"
                  />
                )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAct(null)} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Retour</button>
              <button type="button" disabled={busy === 'act'} onClick={() => void confirmAct()} className="flex h-11 items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold text-ink disabled:opacity-60" style={{ background: actConf[act].bg }}>
                {busy === 'act' && <Spinner size="sm" />}
                {actConf[act].cta}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
