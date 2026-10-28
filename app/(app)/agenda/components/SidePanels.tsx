'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, X } from 'lucide-react';
import type { ConsultationType, WaitlistEntry } from '@/lib/types';
import { durationLabel, priceLabel } from '@/components/agenda/ConsultationTypeForm';
import { hm } from './AgendaGrid';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

// ---------- Séance sélectionnée ----------

export interface SelectedInfo {
  id: string;
  kind: 'appointment' | 'group';
  name: string;
  typeName: string;
  color: string;
  start: Date;
  end: Date;
  priceCents: number | null;
  visio: boolean;
  videoLink: string | null;
  consultantId: string | null;
}

export function SelectedCard({
  sel,
  onClose,
  onReschedule,
  onDetails,
  onCancel,
}: {
  sel: SelectedInfo;
  onClose: () => void;
  onReschedule: () => void;
  onDetails: () => void;
  onCancel: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const when = `${dateFmt.format(sel.start)} · ${hm(sel.start)} – ${hm(sel.end)}${sel.priceCents !== null ? ` · ${priceLabel(sel.priceCents)}` : ''}`;
  const btn = 'flex h-10 items-center justify-center rounded-[10px] border border-divider text-[13px] text-charcoal hover:border-sage';

  return (
    <section aria-label="Séance sélectionnée" className="flex flex-col gap-3 rounded-2xl border bg-surface p-[18px]" style={{ borderColor: sel.color }}>
      <div className="flex items-start gap-2.5">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: sel.color }}>{sel.typeName}</span>
          <span className="text-[17px] font-semibold text-charcoal">{sel.name}</span>
          <span className="text-sm text-[#C9CFDA]">{when.charAt(0).toUpperCase() + when.slice(1)}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le détail" className="flex h-9 w-9 items-center justify-center rounded-lg border border-divider text-charcoal">
          <X className="h-4 w-4" />
        </button>
      </div>
      <span
        className="self-start rounded-full px-2.5 py-[3px] text-xs font-medium"
        style={sel.visio ? { background: '#1F2640', color: '#A9B8EC' } : { background: '#23383B', color: '#6DD4B8' }}
      >
        {sel.visio ? 'Visio' : 'Cabinet'}
      </span>
      <div className="flex flex-col gap-2">
        {sel.consultantId && (
          <Link href={`/consultants/${sel.consultantId}`} className="flex h-10 items-center justify-center rounded-[10px] bg-sage-light text-sm font-semibold text-sage hover:text-sage-dark">
            Ouvrir le dossier
          </Link>
        )}
        {sel.visio && sel.videoLink && (
          <a href={sel.videoLink} target="_blank" rel="noreferrer" className={btn + ' text-sm'}>
            Lancer la visio
          </a>
        )}
        {sel.kind === 'appointment' ? (
          confirming ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#5A3A3A] p-3">
              <span className="text-[13px] text-[#F2A3A3]">Annuler cette séance ? {sel.name.split(' ')[0]} sera prévenu·e, et le créneau proposé à la liste d’attente.</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirming(false)} className={btn}>Garder</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onCancel();
                    setBusy(false);
                    setConfirming(false);
                  }}
                  className="flex h-10 items-center justify-center rounded-[10px] bg-[#5A3A3A] text-[13px] font-semibold text-[#F2D2D2] disabled:opacity-60"
                >
                  Confirmer l’annulation
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onReschedule} className={btn}>Décaler</button>
              <button type="button" onClick={() => setConfirming(true)} className="flex h-10 items-center justify-center rounded-[10px] text-[13px] text-[#F2A3A3] hover:bg-[#2A1F22]">
                Annuler la séance
              </button>
            </div>
          )
        ) : null}
        <button type="button" onClick={onDetails} className="h-9 text-[13px] text-sage hover:text-sage-dark">
          Tous les détails
        </button>
      </div>
    </section>
  );
}

// ---------- Liste d'attente ----------

const DAY_NAMES = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const TOD: Record<string, string> = { morning: 'matin', afternoon: 'après-midi', evening: 'soir', any: 'à tout moment' };

export type WaitlistRow = WaitlistEntry & { consultation_type?: { name: string; color?: string | null } | null };

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}
function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function WaitlistPanel({
  entries,
  onPropose,
  onRemove,
}: {
  entries: WaitlistRow[];
  onPropose: (w: WaitlistRow) => void;
  onRemove: (w: WaitlistRow) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Liste d'attente" className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="wait-list"
        className="flex min-h-[52px] w-full items-center gap-2.5 px-[18px] text-left text-charcoal"
      >
        <span className="text-base font-semibold">Liste d’attente</span>
        {entries.length > 0 && (
          <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-terracotta-light px-[7px] text-xs font-semibold text-terracotta">
            {entries.length}
          </span>
        )}
        <span className="flex-1" />
        <ChevronDown className={`h-[18px] w-[18px] text-stone transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id="wait-list" className="flex flex-col px-[18px] pb-3.5">
          {entries.length === 0 && (
            <span className="pt-1 text-[13px] text-stone">Personne en attente. Les inscriptions arrivent depuis votre page de réservation en ligne.</span>
          )}
          {entries.map((w) => {
            const days = w.preferred_days.length ? w.preferred_days.map((d) => DAY_NAMES[d]).filter(Boolean).join(', ') : 'Tous les jours';
            const ago = daysSince(w.created_at);
            return (
              <div key={w.id} className="flex flex-col gap-1 border-t border-divider pb-2 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-medium text-charcoal">{w.first_name}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-mist">{w.email}</span>
                  {w.notified_at && (
                    <span title="Un créneau libéré lui a été envoyé par e-mail" className="inline-flex h-5 flex-none items-center rounded-full bg-[#1F2640] px-2 text-[11px] font-semibold text-sky">
                      Prévenu·e
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-[13px] text-charcoal">
                  <span className="h-2 w-2 flex-none rounded-sm" style={{ background: w.consultation_type?.color || '#5C6573' }} />
                  {w.consultation_type?.name ?? 'Type indifférent'}
                </span>
                <span className="text-[13px] text-stone">{days} · {TOD[w.preferred_time_of_day] ?? 'à tout moment'}</span>
                <span className="text-xs text-mist">
                  {ago <= 1 ? (ago === 0 ? 'Inscription aujourd’hui' : 'Inscription hier') : `Inscription il y a ${ago} j`} · expire dans {daysUntil(w.expires_at)} j
                </span>
                <div className="flex gap-3.5">
                  <button type="button" onClick={() => onPropose(w)} className="h-8 text-[13px] font-medium text-sage hover:text-sage-dark">
                    Proposer un créneau
                  </button>
                  <button type="button" onClick={() => onRemove(w)} className="h-8 text-[13px] text-stone hover:text-charcoal">
                    Retirer
                  </button>
                </div>
              </div>
            );
          })}
          <span className="border-t border-divider pt-2 text-xs text-mist">
            Inscriptions faites par les visiteurs sur votre page de réservation. Quand un créneau se libère, les 3 premières personnes compatibles sont prévenues par e-mail.
          </span>
        </div>
      )}
    </section>
  );
}

// ---------- Types de séance ----------

export function TypesPanel({ types, onAdd }: { types: ConsultationType[]; onAdd: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Types de séance" className="overflow-hidden rounded-2xl border border-divider bg-surface">
      <div className="flex items-center gap-2 pr-[18px]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="types-list"
          className="flex min-h-[52px] flex-1 items-center gap-2.5 pl-[18px] text-left text-charcoal"
        >
          <span className="text-base font-semibold">Types de séance</span>
          <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#1F2640] px-[7px] text-xs font-semibold text-sky">{types.length}</span>
          <span className="flex-1" />
          <ChevronDown className={`h-[18px] w-[18px] text-stone transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <Link href="/settings/consultation-types" className="text-[13px] text-sage hover:text-sage-dark">Gérer</Link>
      </div>
      {open && (
        <div id="types-list" className="flex flex-col gap-2 px-[18px] pb-[18px]">
          {types.map((t) => (
            <span key={t.id} className="flex items-center gap-2 text-sm text-charcoal">
              <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: t.color }} />
              <span className="flex-1">{t.name}</span>
              <span className="text-xs text-stone">{durationLabel(t.duration_minutes)} · {priceLabel(t.price_cents)}</span>
            </span>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="mt-1 flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-divider text-[13px] font-medium text-sage hover:border-sage"
          >
            ＋ Ajouter un type de séance
          </button>
          <span className="text-xs text-stone">Cabinet ou visio se choisit à chaque séance.</span>
        </div>
      )}
    </section>
  );
}
