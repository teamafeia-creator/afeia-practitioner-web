'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { ALL_MOTIFS, BLOCK_SECTIONS, BLOCK_SECTION_LABELS, MOTIF_LABELS, type ConsultationMotif } from '@/lib/blocks-types';
import { archiveBlock, saveBlock, type PractitionerBlock } from '@/lib/queries/library';

const field = 'rounded-[10px] border bg-cream px-3 text-sm text-charcoal outline-none placeholder:text-mist focus:border-sage';

/** Créer / modifier un bloc de conseillancier (écrit par le praticien). */
export function BlocModal({
  open,
  block,
  knownCustomMotifs,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  block: PractitionerBlock | null;
  knownCustomMotifs: string[];
  onClose: () => void;
  onSaved: (b: PractitionerBlock) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [section, setSection] = useState<string>('objectifs');
  const [content, setContent] = useState('');
  const [motifs, setMotifs] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [extraMotifs, setExtraMotifs] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [menu, setMenu] = useState(false);
  const [newMotif, setNewMotif] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(block?.title ?? '');
    setSection(block?.section ?? 'objectifs');
    setContent(block?.content ?? '');
    setMotifs(block?.motifs ?? []);
    setCustom(block?.custom_motifs ?? []);
    setExtraMotifs([]);
    setTags((block?.tags ?? []).join(', '));
    setMenu(false);
    setNewMotif('');
    setTried(false);
  }, [open, block]);

  const allCustom = Array.from(new Set([...knownCustomMotifs, ...extraMotifs, ...custom]));
  const titleOk = title.trim().length > 0;
  const contentOk = content.trim().length > 0;
  const picked = [...motifs.map((m) => MOTIF_LABELS[m as ConsultationMotif] ?? m), ...custom];

  function addMotif() {
    const v = newMotif.trim();
    if (!v) return;
    const enumHit = ALL_MOTIFS.find((m) => MOTIF_LABELS[m].toLowerCase() === v.toLowerCase());
    if (enumHit) {
      if (!motifs.includes(enumHit)) setMotifs((m) => [...m, enumHit]);
      showToast.success('Ce motif existe déjà : il est sélectionné.');
    } else {
      const existing = allCustom.find((m) => m.toLowerCase() === v.toLowerCase());
      const name = existing ?? v;
      if (!existing) setExtraMotifs((x) => [...x, v]);
      if (!custom.includes(name)) setCustom((c) => [...c, name]);
      showToast.success(existing ? 'Ce motif existe déjà : il est sélectionné.' : `Motif « ${v} » ajouté et sélectionné.`);
    }
    setNewMotif('');
  }

  async function save() {
    if (!titleOk || !contentOk) {
      setTried(true);
      return;
    }
    setBusy(true);
    try {
      const saved = await saveBlock(block?.id ?? null, {
        title: title.trim(),
        content: content.trim(),
        section,
        motifs: motifs.length || custom.length ? motifs : ['universel'],
        custom_motifs: custom,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      showToast.success(block ? 'Bloc enregistré.' : 'Bloc créé. Il est proposé dans vos conseillanciers.');
      onSaved(saved);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Le bloc n’a pas pu être enregistré.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!block) return;
    setBusy(true);
    try {
      await archiveBlock(block.id);
      showToast.success('Bloc supprimé. Les conseillanciers qui l’utilisent gardent leur texte.');
      onDeleted(block.id);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Le bloc n’a pas pu être supprimé.');
    } finally {
      setBusy(false);
    }
  }

  const row = (label: string, on: boolean, toggle: () => void) => (
    <button
      key={label}
      type="button"
      role="option"
      aria-selected={on}
      onClick={toggle}
      className="flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-charcoal"
      style={{ background: on ? '#23383B' : 'transparent' }}
    >
      <span
        className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border text-xs font-bold text-ink"
        style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent' }}
      >
        {on ? '✓' : ''}
      </span>
      {label}
    </button>
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={block ? 'Modifier le bloc' : 'Créer un bloc'} size="lg">
      <div className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Titre
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Protocole digestif de base"
            className={`${field} h-11 text-[15px]`}
            style={{ borderColor: tried && !titleOk ? '#E8A87C' : '#2A3140' }}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Section du conseillancier
          <select value={section} onChange={(e) => setSection(e.target.value)} className={`${field} h-11 border-divider`}>
            {BLOCK_SECTIONS.map((s) => <option key={s} value={s}>{BLOCK_SECTION_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Contenu
          <textarea
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Le texte qui sera inséré dans le conseillancier. Vous pourrez l’adapter pour chaque consultant."
            className={`${field} resize-y py-3 leading-[1.6]`}
            style={{ borderColor: tried && !contentOk ? '#E8A87C' : '#2A3140' }}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span id="motifs-label" className="text-[13px] text-stone">Motifs de consultation, pour le proposer au bon moment</span>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={menu}
            aria-labelledby="motifs-label"
            className="flex min-h-[44px] items-center gap-2 rounded-[10px] border bg-cream px-3 py-1.5 text-left"
            style={{ borderColor: menu ? '#2F5A50' : '#2A3140' }}
          >
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {picked.length === 0 && <span className="text-sm text-mist">Choisir un ou plusieurs motifs</span>}
              {picked.map((m) => (
                <span key={m} className="inline-flex h-[26px] items-center rounded-full bg-sage-light px-2.5 text-xs font-medium text-sage">{m}</span>
              ))}
            </span>
            <ChevronDown className={`h-4 w-4 flex-none text-stone ${menu ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {menu && (
            <div role="listbox" aria-multiselectable="true" aria-labelledby="motifs-label" className="flex max-h-[260px] flex-col overflow-y-auto rounded-xl border border-divider bg-surface-raised p-1.5">
              {ALL_MOTIFS.map((m) => row(MOTIF_LABELS[m], motifs.includes(m), () => setMotifs((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))))}
              {allCustom.map((m) => row(m, custom.includes(m), () => setCustom((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))))}
              <div className="mt-1 flex gap-1.5 border-t border-divider px-1 pb-0.5 pt-2">
                <input
                  value={newMotif}
                  onChange={(e) => setNewMotif(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMotif();
                    }
                  }}
                  aria-label="Nouveau motif"
                  placeholder="Ajouter un motif, ex. Ménopause"
                  className={`${field} h-9 min-w-0 flex-1 border-divider text-[13px]`}
                />
                <button
                  type="button"
                  onClick={addMotif}
                  disabled={!newMotif.trim()}
                  className="h-9 rounded-lg bg-sage px-3 text-[13px] font-semibold text-ink disabled:bg-divider disabled:text-stone"
                >
                  ＋ Ajouter
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Mots-clés, séparés par des virgules
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Ex. digestion, confort, transit" className={`${field} h-10 border-divider`} />
        </label>
        {tried && (!titleOk || !contentOk) && (
          <span role="alert" className="text-[13px] text-terracotta">{!titleOk ? 'Le titre est obligatoire.' : 'Le contenu est obligatoire.'}</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {block && (
            <button type="button" onClick={() => void remove()} disabled={busy} className="h-11 rounded-[10px] border border-[#4A2F2F] px-3.5 text-sm text-[#E57B7B]">
              Supprimer
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
          <button type="button" onClick={() => void save()} disabled={busy} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-70">
            {busy && <Spinner size="sm" />}
            {block ? 'Enregistrer' : 'Créer le bloc'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
