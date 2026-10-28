'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { RESOURCE_CATEGORIES, RESOURCE_FORMATS, type ResourceFormat } from '@/lib/library';
import { proposeResource, type PractitionerResource } from '@/lib/queries/library';

const MAX = 10 * 1024 * 1024;
const field = 'rounded-[10px] border border-divider bg-cream px-3 text-sm text-charcoal outline-none placeholder:text-mist focus:border-sage';

/** « Proposer une ressource » : privée, ou partagée après relecture par l'équipe Afeia. */
export function ResourceModal({
  open,
  practitionerId,
  authorLabel,
  onClose,
  onSaved,
}: {
  open: boolean;
  practitionerId: string;
  authorLabel: string;
  onClose: () => void;
  onSaved: (r: PractitionerResource) => void;
}) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<ResourceFormat>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Outils');
  const [description, setDescription] = useState('');
  const [share, setShare] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setFormat('link');
    setUrl('');
    setFile(null);
    setCategory('Outils');
    setDescription('');
    setShare(false);
    setTried(false);
  }, [open]);

  const isLink = format === 'link' || format === 'video';
  const errors: string[] = [];
  if (!title.trim()) errors.push('Donnez un titre à la ressource.');
  if (isLink && !/^https?:\/\/\S+\.\S+/.test(url.trim())) errors.push('Indiquez un lien complet, qui commence par https://.');
  if (!isLink && !file) errors.push('Ajoutez le fichier.');

  async function save() {
    if (errors.length) {
      setTried(true);
      return;
    }
    setBusy(true);
    try {
      const r = await proposeResource(practitionerId, { title, description, category, format, url: isLink ? url : '', file: isLink ? null : file, share }, authorLabel);
      showToast.success(share ? 'Merci ! L’équipe Afeia relit la ressource avant de la partager avec les autres praticiens.' : 'Ressource ajoutée à votre bibliothèque.');
      onSaved(r);
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La ressource n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Proposer une ressource" size="lg">
      <div className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Titre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Modèle de compte rendu de séance"
            className={`${field} h-11 text-[15px]`}
            style={tried && !title.trim() ? { borderColor: '#E8A87C' } : undefined}
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone">Format</span>
          <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-1.5">
            {RESOURCE_FORMATS.map(([k, l]) => {
              const on = format === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setFormat(k);
                    setFile(null);
                  }}
                  className="h-9 rounded-full border px-3.5 text-[13px] font-medium"
                  style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
        {isLink ? (
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Lien
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={`${field} h-[42px]`} />
          </label>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.odt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX) {
                  showToast.error('Le fichier dépasse 10 Mo.');
                  return;
                }
                setFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-charcoal"
              style={{ borderColor: file ? '#2F5A50' : '#2A3140' }}
            >
              <span className="text-[22px] text-sage" aria-hidden="true">⇪</span>
              <span className="text-sm font-medium">{file ? `✓ ${file.name}` : 'Choisir le fichier'}</span>
              <span className="text-xs text-stone">PDF, Word ou image, 10 Mo maximum</span>
            </button>
          </>
        )}
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Thème
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} h-[42px]`}>
            {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          En quoi elle est utile
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Une ou deux phrases pour vos confrères." className={`${field} resize-y py-2.5 leading-normal`} />
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-divider bg-surface-raised p-3.5">
          <input type="checkbox" checked={share} onChange={() => setShare((v) => !v)} className="mt-px h-[18px] w-[18px] flex-none accent-sage" />
          <span className="flex flex-col gap-[3px]">
            <span className="text-sm font-medium text-charcoal">Partager avec tous les praticiens Afeia</span>
            <span className="text-[13px] leading-normal text-stone">
              L’équipe Afeia la relit avant publication. Votre prénom, l’initiale de votre nom et votre ville sont affichés. Sinon, elle reste visible par vous seul.
            </span>
          </span>
        </label>
        {tried && errors.length > 0 && (
          <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-3.5 py-2.5 text-[13px] text-[#F2D2BB]">
            {errors.map((e) => <div key={e}>{e}</div>)}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
          <button type="button" onClick={() => void save()} disabled={busy} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-70">
            {busy && <Spinner size="sm" />}
            {share ? 'Envoyer en relecture' : 'Ajouter à mes ressources'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
