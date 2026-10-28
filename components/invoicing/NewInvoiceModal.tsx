'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import { MANUAL_METHODS, METHOD_LABELS, eur } from '@/lib/invoicing/display';
import type { ConsultationInvoice, PaymentMethod } from '@/lib/invoicing/types';

export type ToBill = {
  appointmentId: string;
  consultantId: string;
  who: string;
  what: string;
  date: string;
  amount: number | null;
};

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const field = 'rounded-[10px] border border-divider bg-cream px-3 text-sm text-charcoal outline-none placeholder:text-mist focus:border-sage';

/** Séances terminées (30 derniers jours) qui n'ont pas encore de facture. */
export async function loadToBill(practitionerId: string): Promise<ToBill[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const [{ data: apts }, { data: billed }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, consultant_id, starts_at, consultation_type:consultation_types(name, price_cents), patient:consultants(name, first_name, last_name)')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'completed')
      .not('consultant_id', 'is', null)
      .gte('starts_at', since.toISOString())
      .order('starts_at', { ascending: false }),
    supabase.from('consultation_invoices').select('appointment_id').eq('practitioner_id', practitionerId).not('appointment_id', 'is', null).neq('status', 'cancelled'),
  ]);
  const done = new Set(((billed ?? []) as { appointment_id: string }[]).map((b) => b.appointment_id));
  type Raw = {
    id: string;
    consultant_id: string;
    starts_at: string;
    consultation_type: { name: string; price_cents: number | null } | null;
    patient: { name: string | null; first_name: string | null; last_name: string | null } | null;
  };
  return ((apts ?? []) as unknown as Raw[])
    .filter((a) => !done.has(a.id))
    .map((a) => ({
      appointmentId: a.id,
      consultantId: a.consultant_id,
      who: a.patient?.name || [a.patient?.first_name, a.patient?.last_name].filter(Boolean).join(' ') || 'Consultant',
      what: a.consultation_type?.name ?? 'Séance',
      date: dayFmt.format(new Date(a.starts_at)),
      amount: a.consultation_type?.price_cents != null ? a.consultation_type.price_cents / 100 : null,
    }));
}

export function NewInvoiceModal({
  open,
  onClose,
  practitionerId,
  authToken,
  toBill,
  initialPick,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  authToken: string;
  toBill: ToBill[];
  initialPick?: string | null;
  onCreated: (inv: ConsultationInvoice) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [consultantId, setConsultantId] = useState('');
  const [consultants, setConsultants] = useState<{ id: string; name: string }[]>([]);
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | 'none'>('none');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<null | 'draft' | 'issue'>(null);

  const choose = (t: ToBill | null) => {
    setPick(t?.appointmentId ?? null);
    setConsultantId(t?.consultantId ?? '');
    setWhat(t ? `${t.what} · séance du ${t.date}` : '');
    setAmount(t?.amount != null ? String(t.amount) : '');
  };

  useEffect(() => {
    if (!open) return;
    const first = toBill.find((t) => t.appointmentId === initialPick) ?? toBill[0] ?? null;
    choose(first);
    setMethod('none');
    setTried(false);
    supabase
      .from('consultants')
      .select('id, name, first_name, last_name')
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .then(({ data }) =>
        setConsultants(
          ((data ?? []) as { id: string; name: string | null; first_name: string | null; last_name: string | null }[])
            .map((c) => ({ id: c.id, name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Consultant' }))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const value = parseFloat(amount.replace(',', '.'));
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!consultantId) e.push('Choisissez le consultant.');
    if (what.trim().length < 3) e.push('Indiquez la désignation (3 caractères au moins).');
    if (!Number.isFinite(value) || value <= 0) e.push('Indiquez un montant supérieur à 0.');
    return e;
  }, [consultantId, what, value]);

  async function submit(kind: 'draft' | 'issue') {
    if (errors.length) {
      setTried(true);
      return;
    }
    setBusy(kind);
    try {
      const paid = kind === 'issue' && method !== 'none';
      const res = await fetch('/api/invoicing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          consultant_id: consultantId,
          consultation_id: null,
          appointment_id: pick,
          template_id: null,
          description: what.trim(),
          montant: Math.round(value * 100) / 100,
          payment_method: paid ? method : null,
          payment_date: paid ? new Date().toISOString() : null,
          payment_notes: null,
          status: kind === 'draft' ? 'draft' : paid ? 'paid' : 'issued',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'La facture n’a pas pu être créée.');
      const inv = body.invoice as ConsultationInvoice;
      if (kind === 'issue' && !paid) {
        await fetch('/api/invoicing/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ invoice_id: inv.id }),
        }).catch(() => undefined);
      }
      showToast.success(kind === 'draft' ? 'Brouillon enregistré.' : paid ? 'Facture émise et marquée payée.' : 'Facture émise et envoyée par e-mail.');
      onCreated(inv);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La facture n’a pas pu être créée.');
    } finally {
      setBusy(null);
    }
  }

  const pill = (on: boolean) => ({ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' });

  return (
    <Modal isOpen={open} onClose={onClose} title="Nouvelle facture" size="lg">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Séance à facturer</span>
          {toBill.length === 0 && <span className="text-sm text-stone">Aucune séance terminée sans facture ces 30 derniers jours.</span>}
          {toBill.map((t) => {
            const on = pick === t.appointmentId;
            return (
              <button
                key={t.appointmentId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(t)}
                className="flex min-h-[52px] items-center gap-2.5 rounded-[10px] border px-3 text-left text-charcoal"
                style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#23383B' : 'transparent' }}
              >
                <span className="h-[18px] w-[18px] flex-none rounded-full border-2" style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent' }} />
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-sm font-medium">{t.who}</span>
                  <span className="text-xs text-stone">{t.what} · {t.date}</span>
                </span>
                <span className="tabular-nums">{t.amount != null ? eur(t.amount) : '—'}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => choose(null)} className={`h-[30px] self-start text-[13px] ${pick === null ? 'font-semibold text-sage' : 'text-sage'}`}>
            {pick === null ? '✓ ' : ''}Facture libre, sans séance liée
          </button>
        </div>
        {pick === null && (
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Consultant
            <select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} className={`${field} h-[42px]`}>
              <option value="">Choisir…</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-[2_1_240px] flex-col gap-1.5 text-[13px] text-stone">
            Désignation
            <input value={what} onChange={(e) => setWhat(e.target.value)} className={`${field} h-[42px]`} />
          </label>
          <label className="flex flex-[1_1_120px] flex-col gap-1.5 text-[13px] text-stone">
            Montant (€)
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} h-[42px] tabular-nums`} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Déjà réglée ?</span>
          <div role="radiogroup" aria-label="Moyen de paiement" className="flex flex-wrap gap-1.5">
            {(['none', ...MANUAL_METHODS] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className="h-9 rounded-full border px-3 text-[13px] font-medium" style={pill(method === m)}>
                {m === 'none' ? 'Pas encore' : METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-stone">Numéro attribué automatiquement à l’émission. Mention « TVA non applicable, article 293 B du CGI » ajoutée.</span>
        {tried && errors.length > 0 && (
          <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-3.5 py-2.5 text-[13px] text-[#F2D2BB]">
            <strong className="font-semibold">Pour créer la facture, il reste à :</strong>
            <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => void submit('draft')} disabled={!!busy} className="flex h-11 items-center gap-2 rounded-[10px] border border-divider px-4 text-sm text-charcoal disabled:opacity-60">
            {busy === 'draft' && <Spinner size="sm" />}
            Enregistrer en brouillon
          </button>
          <button type="button" onClick={() => void submit('issue')} disabled={!!busy} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
            {busy === 'issue' && <Spinner size="sm" />}
            {method === 'none' ? 'Émettre et envoyer' : 'Émettre comme payée'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
