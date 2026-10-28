'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import { relativeSent } from '@/lib/library';
import { sendFiche, type SentRow } from '@/lib/queries/library';

type Cons = { id: string; name: string };

/** Envoi d'une fiche à un ou plusieurs consultants, avec un petit mot facultatif. */
export function SendFicheModal({
  open,
  onClose,
  practitionerId,
  resourceId,
  title,
  sent,
  preselect,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  resourceId: string;
  title: string;
  sent: SentRow[];
  preselect?: string[];
  onSent: (ids: string[]) => void;
}) {
  const [cons, setCons] = useState<Cons[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(preselect ?? []);
    setQ('');
    setNote('');
    supabase
      .from('consultants')
      .select('id, name, first_name, last_name')
      .eq('practitioner_id', practitionerId)
      .is('deleted_at', null)
      .then(({ data }) => {
        const list = ((data ?? []) as { id: string; name: string | null; first_name: string | null; last_name: string | null }[])
          .map((c) => ({ id: c.id, name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Consultant' }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        setCons(list);
      });
  }, [open, practitionerId, preselect]);

  const sentMap = useMemo(() => new Map(sent.map((s) => [s.consultant_id, s])), [sent]);
  const term = q.trim().toLowerCase();
  const shown = cons.filter((c) => !term || c.name.toLowerCase().includes(term));

  async function send() {
    if (picked.length === 0) {
      showToast.error('Choisissez au moins un consultant.');
      return;
    }
    setBusy(true);
    try {
      await sendFiche(practitionerId, resourceId, picked, note.trim() || null);
      const names = cons.filter((c) => picked.includes(c.id)).map((c) => c.name);
      showToast.success(`Fiche envoyée à ${names.join(', ')}.`);
      onSent(picked);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La fiche n’a pas pu être envoyée.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Envoyer « ${title} »`}>
      <div className="flex flex-col gap-3.5">
        <label className="flex h-11 items-center gap-2 rounded-[10px] border border-divider bg-cream px-3 focus-within:border-sage">
          <span className="sr-only">Rechercher un consultant</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un consultant" className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-mist" />
        </label>
        <div className="flex max-h-[260px] flex-col gap-1 overflow-y-auto">
          {shown.length === 0 && <span className="px-1 text-sm text-stone">Aucun consultant ne correspond.</span>}
          {shown.map((c) => {
            const on = picked.includes(c.id);
            const was = sentMap.get(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                className="flex min-h-[48px] items-center gap-2.5 rounded-[10px] border px-3 text-left text-charcoal"
                style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#23383B' : 'transparent' }}
              >
                <span
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[13px] font-bold text-ink"
                  style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent' }}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-stone">{was ? `Déjà reçue · ${relativeSent(was.sent_at)}` : 'Pas encore reçue'}</span>
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Petit mot, facultatif
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. Comme promis, la fiche dont on a parlé en séance."
            className="resize-y rounded-[10px] border border-divider bg-cream px-3 py-2.5 text-sm leading-normal text-charcoal outline-none placeholder:text-mist focus:border-sage"
          />
        </label>
        <span className="text-xs text-stone">Elle apparaît dans l’app du consultant, rubrique Mes fiches, avec une notification.</span>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || picked.length === 0}
            className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:bg-divider disabled:text-stone"
          >
            {busy && <Spinner size="sm" />}
            {picked.length > 1 ? `Envoyer à ${picked.length} consultants` : 'Envoyer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
