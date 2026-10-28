'use client';

import { useState } from 'react';
import { createConsultationType } from '@/lib/queries/appointments';
import { showToast } from '@/components/ui/Toaster';
import type { ConsultationType } from '@/lib/types';

export const TYPE_COLORS = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#795548', '#607D8B'];
const DURATIONS = [30, 45, 60, 75, 90, 120];
const BUFFERS = [0, 10, 15, 30];

export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function priceLabel(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'sans tarif';
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
}

const field = 'h-10 rounded-lg border border-divider bg-surface px-3 text-sm text-charcoal outline-none focus:border-sage';

/**
 * Formulaire compact « Nouveau type de séance » (agenda, nouvelle séance).
 * Enregistre dans consultation_types : le type apparaît aussi dans Paramètres › Types de séance.
 */
export function ConsultationTypeForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: ConsultationType[];
  onSaved: (ct: ConsultationType) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [dur, setDur] = useState(60);
  const [price, setPrice] = useState('');
  const [buf, setBuf] = useState(15);
  const [color, setColor] = useState(() => TYPE_COLORS.find((c) => !existing.some((t) => t.color === c)) ?? TYPE_COLORS[5]);
  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const duplicate = existing.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const priceCents = price.trim() === '' ? null : Math.round(parseFloat(price.replace(',', '.')) * 100);
  const priceInvalid = priceCents !== null && (!Number.isFinite(priceCents) || priceCents < 0);
  const error = trimmed.length < 2 ? 'Donnez un nom d’au moins 2 caractères.' : duplicate ? 'Un type porte déjà ce nom.' : priceInvalid ? 'Le tarif doit être un nombre.' : null;

  async function save() {
    if (error) return;
    setSaving(true);
    try {
      const ct = await createConsultationType({
        name: trimmed,
        duration_minutes: dur,
        price_cents: priceCents,
        color,
        buffer_minutes: buf,
        is_bookable_online: online,
        description: null,
        sort_order: existing.length,
        is_active: true,
        is_group: false,
        max_participants: 1,
        price_per_participant: false,
      });
      showToast.success(`Type « ${ct.name} » ajouté à vos paramètres`);
      onSaved(ct);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Le type n’a pas pu être créé.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[#2F5A50] bg-cream p-3.5">
      <span className="text-sm font-semibold text-charcoal">Nouveau type de séance</span>
      <label className="flex flex-col gap-1.5 text-xs text-stone">
        Nom
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Séance réflexologie" className={field} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1.5 text-xs text-stone">
          Durée
          <select value={dur} onChange={(e) => setDur(Number(e.target.value))} className={field}>
            {DURATIONS.map((d) => <option key={d} value={d}>{durationLabel(d)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-stone">
          Tarif (€)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="60" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-stone">
          Battement
          <select value={buf} onChange={(e) => setBuf(Number(e.target.value))} className={field}>
            {BUFFERS.map((b) => <option key={b} value={b}>{b === 0 ? 'Aucun' : `${b} min`}</option>)}
          </select>
        </label>
      </div>
      <div role="radiogroup" aria-label="Couleur" className="flex flex-wrap gap-2">
        {TYPE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Couleur ${c}`}
            onClick={() => setColor(c)}
            className="h-7 w-7 rounded-full border-2"
            style={{ background: c, borderColor: color === c ? '#E8EDF4' : 'transparent' }}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#C9CFDA]">
        <input type="checkbox" checked={online} onChange={() => setOnline((v) => !v)} className="h-4 w-4 accent-sage" />
        Réservable en ligne par les consultants
      </label>
      <span className="text-xs text-stone">Il sera aussi enregistré dans Paramètres › Types de séance.</span>
      {error && trimmed.length > 0 && <span role="alert" className="text-xs text-[#F2A3A3]">{error}</span>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-[38px] rounded-lg border border-divider px-3 text-[13px] text-charcoal">
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!!error || saving}
          className="h-[38px] rounded-lg bg-sage px-3.5 text-[13px] font-semibold text-ink disabled:bg-divider disabled:text-stone"
        >
          Ajouter ce type
        </button>
      </div>
    </div>
  );
}
