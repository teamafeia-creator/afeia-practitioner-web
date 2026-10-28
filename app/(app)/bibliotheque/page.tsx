'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getEducationalResources } from '@/lib/queries/resources';
import {
  getAssignmentCounts,
  getFicheFavorites,
  getResourceFavorites,
  getSentForResource,
  listMyBlocks,
  listResources,
  openResource,
  setFicheFavorite,
  setResourceFavorite,
  toggleBlockFavorite,
  type PractitionerBlock,
  type PractitionerResource,
  type SentRow,
} from '@/lib/queries/library';
import { FORMAT_LABELS, RESOURCE_FORMATS, colorOfTheme, ficheTheme } from '@/lib/library';
import { BLOCK_SECTION_LABELS, MOTIF_LABELS, type ConsultationMotif } from '@/lib/blocks-types';
import { SendFicheModal } from '@/components/library/SendFicheModal';
import { BlocModal } from '@/components/library/BlocModal';
import { ResourceModal } from '@/components/library/ResourceModal';
import type { EducationalResource } from '@/lib/types';

type Tab = 'fiches' | 'blocs' | 'ressources';
type Fiche = EducationalResource & { theme_label?: string | null };

type Card = {
  id: string;
  cat: string;
  title: string;
  text: string;
  afeia: boolean;
  fav: boolean;
  chips: string[];
  meta: string;
  onFav: () => void;
  onOpen: () => void;
};

function LibraryInner() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = (['fiches', 'blocs', 'ressources'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'fiches') as Tab;
  const sendTo = params.get('envoyer');

  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('all');
  const [cat, setCat] = useState('Tous');
  const [favOnly, setFavOnly] = useState(false);

  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [ficheFavs, setFicheFavs] = useState<Set<string>>(new Set());
  const [sentCounts, setSentCounts] = useState<Record<string, number>>({});
  const [blocks, setBlocks] = useState<PractitionerBlock[]>([]);
  const [resources, setResources] = useState<PractitionerResource[]>([]);
  const [resFavs, setResFavs] = useState<Set<string>>(new Set());
  const [authorLabel, setAuthorLabel] = useState('');
  const [sendToName, setSendToName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [blocModal, setBlocModal] = useState<{ open: boolean; block: PractitionerBlock | null }>({ open: false, block: null });
  const [resModal, setResModal] = useState(false);
  const [sendFor, setSendFor] = useState<{ fiche: Fiche; sent: SentRow[] } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [f, ff, counts, b, r, rf, prac] = await Promise.all([
        getEducationalResources(user.id),
        getFicheFavorites(),
        getAssignmentCounts(user.id),
        listMyBlocks().catch(() => [] as PractitionerBlock[]),
        listResources().catch(() => [] as PractitionerResource[]),
        getResourceFavorites(),
        supabase.from('practitioners').select('first_name, last_name, full_name').eq('id', user.id).maybeSingle(),
      ]);
      setFiches(f as Fiche[]);
      setFicheFavs(ff);
      setSentCounts(counts);
      setBlocks(b.filter((x) => x.source === 'praticien' && x.owner_id === user.id && !x.is_archived));
      setResources(r);
      setResFavs(rf);
      const p = prac.data as { first_name: string | null; last_name: string | null; full_name: string | null } | null;
      const first = p?.first_name || p?.full_name?.split(' ')[0] || '';
      const last = p?.last_name || p?.full_name?.split(' ').slice(1).join(' ') || '';
      setAuthorLabel(`${first}${last ? ` ${last[0]}.` : ''}`.trim());
    } catch {
      showToast.error('La bibliothèque n’a pas pu être chargée.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!sendTo) return;
    supabase
      .from('consultants')
      .select('name, first_name, last_name')
      .eq('id', sendTo)
      .maybeSingle()
      .then(({ data }) => {
        const c = data as { name: string | null; first_name: string | null; last_name: string | null } | null;
        setSendToName(c ? c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') : null);
      });
  }, [sendTo]);

  const pickTab = (t: Tab) => {
    setTab(t);
    setCat('Tous');
    setQ('');
    setSrc('all');
    router.replace(`/bibliotheque?onglet=${t}${sendTo ? `&envoyer=${sendTo}` : ''}`, { scroll: false });
  };

  const openSend = async (f: Fiche) => {
    if (!user) return;
    const sent = await getSentForResource(user.id, f.id);
    setSendFor({ fiche: f, sent });
  };

  const term = q.trim().toLowerCase();
  const allMotifsCustom = useMemo(() => Array.from(new Set(blocks.flatMap((b) => b.custom_motifs ?? []))), [blocks]);

  const cards: Card[] = useMemo(() => {
    if (tab === 'fiches') {
      return fiches
        .filter((f) => src === 'all' || (src === 'afeia' ? f.source === 'afeia' : f.source !== 'afeia'))
        .map((f) => {
          const n = sentCounts[f.id] ?? 0;
          const read = f.read_time_minutes ?? null;
          return {
            id: f.id,
            cat: ficheTheme(f),
            title: f.title,
            text: f.summary ?? '',
            afeia: f.source === 'afeia',
            fav: ficheFavs.has(f.id),
            chips: [FORMAT_LABELS[f.content_type]],
            meta: `${read ? `${read} min · ` : ''}envoyée ${n} fois`,
            search: `${f.title} ${f.summary ?? ''} ${(f.tags ?? []).join(' ')} ${ficheTheme(f)}`,
            onFav: () => {
              const on = !ficheFavs.has(f.id);
              setFicheFavs((s) => {
                const x = new Set(s);
                if (on) x.add(f.id);
                else x.delete(f.id);
                return x;
              });
              if (user) void setFicheFavorite(user.id, f.id, on);
            },
            onOpen: () => (sendTo ? void openSend(f) : router.push(`/bibliotheque/${f.slug ?? f.id}`)),
          };
        })
        .filter((c) => !term || c.search.toLowerCase().includes(term))
        .map(({ search: _s, ...c }) => c);
    }
    if (tab === 'blocs') {
      return blocks
        .map((b) => ({
          id: b.id,
          cat: BLOCK_SECTION_LABELS[b.section] ?? b.section,
          title: b.title,
          text: b.content,
          afeia: false,
          fav: b.is_favorite,
          chips: [...b.motifs.map((m) => MOTIF_LABELS[m as ConsultationMotif] ?? m), ...(b.custom_motifs ?? [])].slice(0, 2),
          meta: `${b.usage_count} utilisation${b.usage_count > 1 ? 's' : ''}`,
          search: `${b.title} ${b.content} ${(b.tags ?? []).join(' ')}`,
          onFav: () => {
            setBlocks((list) => list.map((x) => (x.id === b.id ? { ...x, is_favorite: !x.is_favorite } : x)));
            void toggleBlockFavorite(b.id).catch(() => showToast.error('Action impossible.'));
          },
          onOpen: () => setBlocModal({ open: true, block: b }),
        }))
        .filter((c) => !term || c.search.toLowerCase().includes(term))
        .map(({ search: _s, ...c }) => c);
    }
    return resources
      .filter((r) => {
        if (src === 'all') return true;
        if (src === 'afeia') return r.source === 'afeia';
        if (src === 'moi') return r.owner_id === user?.id;
        return r.source === 'practitioner' && r.owner_id !== user?.id;
      })
      .map((r) => {
        const mine = r.owner_id === user?.id;
        const by =
          r.source === 'afeia'
            ? 'Équipe Afeia'
            : mine
              ? r.review_status === 'pending'
                ? 'Vous · partagée, en relecture par l’équipe Afeia'
                : r.review_status === 'published'
                  ? 'Vous · partagée avec les praticiens'
                  : r.review_status === 'rejected'
                    ? 'Vous · non retenue pour le partage'
                    : 'Vous · visible par vous seul'
              : `Partagé par ${r.author_label || 'un praticien'}`;
        return {
          id: r.id,
          cat: r.category,
          title: r.title,
          text: r.description ?? '',
          afeia: r.source === 'afeia',
          fav: resFavs.has(r.id),
          chips: [(RESOURCE_FORMATS.find((x) => x[0] === r.format) ?? ['', 'Lien'])[1], ...(r.review_status === 'pending' ? ['En relecture'] : [])],
          meta: by,
          search: `${r.title} ${r.description ?? ''} ${r.category} ${by}`,
          onFav: () => {
            const on = !resFavs.has(r.id);
            setResFavs((s) => {
              const x = new Set(s);
              if (on) x.add(r.id);
              else x.delete(r.id);
              return x;
            });
            if (user) void setResourceFavorite(user.id, r.id, on);
          },
          onOpen: async () => {
            if (r.url) {
              window.open(r.url, '_blank', 'noopener,noreferrer');
              return;
            }
            // Ouverture immédiate (évite le blocage des fenêtres), puis lien signé
            const win = window.open('', '_blank');
            if (win) win.opener = null;
            const link = await openResource(r);
            if (link && win) win.location.href = link;
            else {
              win?.close();
              showToast.error('Le document n’est pas disponible.');
            }
          },
        };
      })
      .filter((c) => !term || c.search.toLowerCase().includes(term))
      .map(({ search: _s, ...c }) => c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fiches, blocks, resources, ficheFavs, resFavs, sentCounts, src, term, user, sendTo]);

  const catsAvail = ['Tous', ...Array.from(new Set(cards.map((c) => c.cat)))];
  const curCat = catsAvail.includes(cat) ? cat : 'Tous';
  const shown = cards.filter((c) => (curCat === 'Tous' || c.cat === curCat) && (!favOnly || c.fav));
  const unit = tab === 'ressources' ? 'ressource' : tab === 'fiches' ? 'fiche' : 'bloc';

  const subtitle =
    tab === 'ressources'
      ? 'Pour vous : documents, études et modèles, partagés par l’équipe Afeia et par d’autres praticiens'
      : tab === 'fiches'
        ? 'Fiches à lire et à partager avec vos consultants'
        : 'Vos blocs, écrits par vous, à réutiliser dans vos conseillanciers';
  const cta = tab === 'ressources' ? 'Proposer une ressource' : tab === 'fiches' ? 'Créer une fiche' : 'Créer un bloc';
  const sources =
    tab === 'ressources'
      ? [['all', 'Tout'], ['afeia', 'AFEIA'], ['communaute', 'Praticiens'], ['moi', 'Mes ressources']]
      : [['all', 'Tout'], ['afeia', 'AFEIA'], ['moi', 'Mes fiches']];

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex max-w-[1180px] flex-col gap-[18px]">
      <Toaster />
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[36px] font-medium leading-[1.1] text-charcoal">Bibliothèque</h1>
          <p className="text-[15px] text-stone">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => (tab === 'ressources' ? setResModal(true) : tab === 'fiches' ? router.push('/bibliotheque/nouvelle') : setBlocModal({ open: true, block: null }))}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep"
        >
          ＋ {cta}
        </button>
      </section>

      {sendTo && sendToName && tab === 'fiches' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2F5A50] bg-sage-light px-4 py-3 text-sm text-[#CFEFE5]">
          <span className="flex-1">Choisissez la fiche à envoyer à <strong>{sendToName}</strong>.</span>
          <button type="button" onClick={() => router.replace('/bibliotheque?onglet=fiches')} aria-label="Ne plus envoyer" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#CFEFE5]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Type de contenu" className="flex gap-1 overflow-x-auto border-b border-divider">
        {([['fiches', 'Fiches éducatives', fiches.length], ['blocs', 'Blocs conseillancier', blocks.length], ['ressources', 'Ressources', resources.length]] as const).map(([k, l, n]) => {
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pickTab(k)}
              className={`-mb-px h-11 whitespace-nowrap border-b-2 px-4 text-[15px] font-medium ${on ? 'border-sage text-charcoal' : 'border-transparent text-stone'}`}
            >
              {l} <span className="text-stone">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-11 max-w-[340px] flex-[1_1_240px] items-center gap-2.5 rounded-[10px] border border-divider bg-surface px-3.5 text-stone focus-within:border-sage">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'ressources' ? 'Titre, thème, auteur…' : tab === 'fiches' ? 'Titre, thème, mot-clé…' : 'Titre ou contenu du bloc…'}
            className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-mist"
          />
        </label>
        {tab !== 'blocs' && (
          <div role="group" aria-label="Origine" className="flex gap-[3px] rounded-[10px] border border-divider bg-surface p-[3px]">
            {sources.map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={src === k}
                onClick={() => setSrc(k)}
                className={`h-9 rounded-lg px-3 text-[13px] font-medium ${src === k ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-pressed={favOnly}
          onClick={() => setFavOnly((v) => !v)}
          className="h-[42px] rounded-[10px] border px-3 text-[13px] font-medium"
          style={favOnly ? { borderColor: '#5C4F1E', background: '#3A3320', color: '#F2C94C' } : { borderColor: '#2A3140', background: '#151A23', color: '#B8C1CF' }}
        >
          ★ Favoris
        </button>
      </div>
      <div role="group" aria-label="Thème" className="flex flex-wrap gap-1.5">
        {catsAvail.map((c) => {
          const on = c === curCat;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => setCat(c)}
              className="h-[34px] rounded-full border px-3 text-[13px] font-medium"
              style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#23383B' : 'transparent', color: on ? '#6DD4B8' : '#E8EDF4' }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <span className="text-[13px] text-stone">{shown.length} {unit}{shown.length > 1 ? 's' : ''}</span>

      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-divider px-5 py-12 text-center">
          <span className="text-[15px] font-medium text-charcoal">
            {cards.length === 0 && tab === 'blocs' ? 'Vous n’avez pas encore de bloc. Créez le premier pour l’insérer dans vos conseillanciers.' : 'Rien ne correspond à ces filtres'}
          </span>
          {cards.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setSrc('all');
                setCat('Tous');
                setFavOnly(false);
              }}
              className="h-[38px] rounded-[10px] border border-divider px-3.5 text-sm text-charcoal"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3.5">
        {shown.map((i) => {
          const c = colorOfTheme(i.cat);
          return (
            <div key={i.id} className="relative flex flex-col gap-2.5 rounded-[14px] border border-divider bg-surface p-[18px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                <span className="text-xs font-semibold uppercase tracking-[0.04em]" style={{ color: c }}>{i.cat}</span>
                {i.afeia && <span className="inline-flex h-5 items-center rounded-full bg-sage-light px-[7px] text-[10px] font-bold text-sage">AFEIA</span>}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={i.onFav}
                  aria-pressed={i.fav}
                  aria-label={i.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  className="-my-1.5 -mr-1.5 h-8 w-8 rounded-lg text-base"
                  style={{ color: i.fav ? '#F2C94C' : '#3A4252' }}
                >
                  ★
                </button>
              </div>
              <button type="button" onClick={i.onOpen} className="flex flex-col gap-2 text-left text-charcoal">
                <span className="font-serif text-lg leading-[1.3]">{i.title}</span>
                <span className="line-clamp-3 text-sm leading-normal text-stone">{i.text}</span>
              </button>
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                {i.chips.map((ch) => (
                  <span key={ch} className="inline-flex h-[22px] items-center rounded-full bg-surface-raised px-2 text-[11px] text-[#B8C1CF]">{ch}</span>
                ))}
                <span className="flex-1" />
                <span className="text-xs text-mist">{i.meta}</span>
              </div>
            </div>
          );
        })}
      </div>

      <BlocModal
        open={blocModal.open}
        block={blocModal.block}
        knownCustomMotifs={allMotifsCustom}
        onClose={() => setBlocModal({ open: false, block: null })}
        onSaved={(b) => setBlocks((list) => (list.some((x) => x.id === b.id) ? list.map((x) => (x.id === b.id ? b : x)) : [b, ...list]))}
        onDeleted={(id) => setBlocks((list) => list.filter((x) => x.id !== id))}
      />
      <ResourceModal
        open={resModal}
        practitionerId={user.id}
        authorLabel={authorLabel}
        onClose={() => setResModal(false)}
        onSaved={(r) => setResources((list) => [r, ...list])}
      />
      {sendFor && (
        <SendFicheModal
          open
          onClose={() => setSendFor(null)}
          practitionerId={user.id}
          resourceId={sendFor.fiche.id}
          title={sendFor.fiche.title}
          sent={sendFor.sent}
          preselect={sendTo ? [sendTo] : []}
          onSent={(ids) => {
            setSentCounts((m) => ({ ...m, [sendFor.fiche.id]: (m[sendFor.fiche.id] ?? 0) + ids.filter((id) => !sendFor.sent.some((s) => s.consultant_id === id)).length }));
            if (sendTo) router.push(`/messages?consultant=${sendTo}`);
          }}
        />
      )}
    </div>
  );
}

export default function BibliothequePage() {
  return (
    <Suspense fallback={null}>
      <LibraryInner />
    </Suspense>
  );
}
