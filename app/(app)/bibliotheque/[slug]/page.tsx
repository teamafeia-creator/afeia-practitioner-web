'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { ResourceDetail } from '@/components/resources/ResourceDetail';
import { SendFicheModal } from '@/components/library/SendFicheModal';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { createResource, deleteResource, getResourceById, getResourceBySlug } from '@/lib/queries/resources';
import { getSentForResource, type SentRow } from '@/lib/queries/library';
import { FORMAT_LABELS, colorOfTheme, ficheTheme, relativeSent } from '@/lib/library';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { EducationalResource } from '@/lib/types';

type Fiche = EducationalResource & { theme_label?: string | null };

export default function FichePage() {
  const { user, loading: authLoading } = useRequireAuth('/login');
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [fiche, setFiche] = useState<Fiche | null | undefined>(undefined);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const f = ((await getResourceBySlug(slug)) ?? (await getResourceById(slug))) as Fiche | null;
    setFiche(f);
    if (f) setSent(await getSentForResource(user.id, f.id));
  }, [user, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading || fiche === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return null;
  if (!fiche) {
    return (
      <div className="rounded-2xl border border-divider bg-surface p-8 text-center text-stone">
        Cette fiche n’existe pas ou a été supprimée. <Link href="/bibliotheque" className="text-sage">Retour à la bibliothèque</Link>
      </div>
    );
  }

  const theme = ficheTheme(fiche);
  const color = colorOfTheme(theme);
  const afeia = fiche.source === 'afeia';
  const own = fiche.practitioner_id === user.id;

  async function duplicate() {
    if (!user || !fiche) return;
    setBusy(true);
    try {
      const copy = await createResource(user.id, {
        title: `${fiche.title} (ma version)`,
        summary: fiche.summary ?? undefined,
        content_type: fiche.content_type,
        content_markdown: fiche.content_markdown ?? undefined,
        file_path: fiche.file_path ?? undefined,
        file_name: fiche.file_name ?? undefined,
        video_url: fiche.video_url ?? undefined,
        category: fiche.category,
        tags: fiche.tags ?? [],
        read_time_minutes: fiche.read_time_minutes ?? undefined,
      });
      if (!copy) throw new Error();
      if (fiche.theme_label) await supabase.from('educational_resources').update({ theme_label: fiche.theme_label }).eq('id', copy.id);
      showToast.success('Copie créée dans Mes fiches. Vous pouvez la modifier.');
      router.push(`/bibliotheque/${copy.slug ?? copy.id}/modifier`);
    } catch {
      showToast.error('La copie n’a pas pu être créée.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !fiche) return;
    setBusy(true);
    const ok = await deleteResource(fiche.id, user.id);
    if (ok) {
      showToast.success('Fiche supprimée.');
      router.push('/bibliotheque');
    } else {
      showToast.error('La fiche n’a pas pu être supprimée.');
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-[1180px] flex-col gap-[18px]">
      <Toaster />
      <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2 text-sm">
        <Link href="/bibliotheque" className="flex-none text-sage hover:text-sage-dark">← Bibliothèque</Link>
        <span className="text-mist">/</span>
        <span className="truncate text-stone">{fiche.title}</span>
      </nav>

      <div className="flex flex-wrap items-start gap-6">
        <article className="flex min-w-0 flex-[999_1_520px] flex-col gap-5 rounded-[18px] border border-divider bg-surface p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-[26px] items-center rounded-full bg-surface-raised px-2.5 text-xs font-semibold" style={{ color }}>{theme}</span>
            <span className="inline-flex h-[26px] items-center rounded-full bg-surface-raised px-2.5 text-xs text-[#B8C1CF]">{FORMAT_LABELS[fiche.content_type]}</span>
            {fiche.read_time_minutes ? <span className="text-[13px] text-stone">◷ {fiche.read_time_minutes} min de lecture</span> : null}
            {afeia && <span className="inline-flex h-[26px] items-center rounded-full bg-sage-light px-2.5 text-xs font-bold text-sage">AFEIA</span>}
          </div>
          <h1 className="font-serif text-[34px] font-medium leading-[1.2] text-charcoal">{fiche.title}</h1>
          {fiche.summary && <p className="max-w-[62ch] text-[17px] leading-relaxed text-[#B8C1CF]">{fiche.summary}</p>}
          <div className="h-px bg-divider" />
          <div className="fiche-body max-w-[66ch] text-base leading-[1.7] text-[#D5DBE4]">
            <ResourceDetail resource={fiche} />
          </div>
          <div role="note" className="flex gap-2 rounded-[10px] border border-[#5C4F1E] bg-[#332D17] px-3.5 py-2.5 text-[13px] leading-normal text-[#F5E3A8]">
            ⚠ Ces conseils d’hygiène de vie ne remplacent pas un avis médical. En cas de traitement en cours, vérifiez avec votre médecin qu’ils sont compatibles.
          </div>
          {(fiche.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fiche.tags.map((t) => (
                <span key={t} className="inline-flex h-[26px] items-center rounded-full border border-divider px-2.5 text-xs text-stone">#{t}</span>
              ))}
            </div>
          )}
        </article>

        <aside className="flex min-w-0 max-w-[340px] flex-[1_1_280px] flex-col gap-3.5">
          <div className="flex flex-col gap-2 rounded-2xl border border-divider bg-surface p-[18px]">
            <button type="button" onClick={() => setSendOpen(true)} className="h-[46px] rounded-[10px] bg-sage text-[15px] font-semibold text-ink hover:bg-sage-deep">
              Envoyer à un consultant
            </button>
            {own && (
              <div className="flex gap-2">
                <Link href={`/bibliotheque/${fiche.slug ?? fiche.id}/modifier`} className="flex h-[42px] flex-1 items-center justify-center rounded-[10px] border border-divider text-sm text-charcoal">
                  Modifier
                </Link>
                <button type="button" onClick={() => setDelOpen(true)} className="h-[42px] rounded-[10px] border border-[#4A2F2F] px-3.5 text-sm text-[#E57B7B]">
                  Supprimer
                </button>
              </div>
            )}
            {afeia && (
              <>
                <button type="button" disabled={busy} onClick={() => void duplicate()} className="h-[42px] rounded-[10px] border border-divider text-sm text-charcoal disabled:opacity-60">
                  Dupliquer pour l’adapter
                </button>
                <span className="text-xs leading-normal text-stone">Fiche rédigée par l’équipe Afeia. Dupliquez-la pour en faire votre version.</span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-[18px]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-charcoal">Déjà envoyée à</h2>
              {sent.length > 0 && <span className="text-xs text-stone">{sent.length} consultant{sent.length > 1 ? 's' : ''}</span>}
            </div>
            {sent.length === 0 && <span className="text-[13px] text-stone">Pas encore envoyée.</span>}
            {sent.map((s, i) => (
              <Link key={s.consultant_id} href={`/consultants/${s.consultant_id}`} className="flex items-center gap-2.5 text-charcoal">
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-ink" style={{ background: FACE_COLORS[i % FACE_COLORS.length] }}>
                  {initialsOf(s.name)}
                </span>
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-sm">{s.name}</span>
                  <span className="text-xs text-stone">envoyée {relativeSent(s.sent_at)}</span>
                </span>
                <span className={`text-xs ${s.read_at ? 'text-sage' : 'text-stone'}`}>{s.read_at ? '✓ Lue' : 'Pas encore lue'}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <SendFicheModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        practitionerId={user.id}
        resourceId={fiche.id}
        title={fiche.title}
        sent={sent}
        onSent={() => void load()}
      />

      <Modal isOpen={delOpen} onClose={() => setDelOpen(false)} title="Supprimer cette fiche ?">
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-[1.55] text-[#B8C1CF]">
            {sent.length
              ? `Elle disparaîtra de votre bibliothèque. Les ${sent.length} consultant${sent.length > 1 ? 's' : ''} qui l’ont reçue la garderont dans leur app.`
              : 'Elle disparaîtra de votre bibliothèque. Cette action est définitive.'}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDelOpen(false)} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
            <button type="button" disabled={busy} onClick={() => void remove()} className="h-11 rounded-[10px] bg-[#E57B7B] px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
