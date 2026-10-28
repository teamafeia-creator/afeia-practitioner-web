'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronDown, Link2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ANAMNESIS_SECTIONS } from '@/lib/anamnesis';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import {
  archivePreliminaryQuestionnaire,
  createConsultantFromQuestionnaire,
  getPreliminaryQuestionnaires,
  linkQuestionnaireToExistingConsultant,
  restorePreliminaryQuestionnaire,
} from '@/services/preliminary-questionnaire';
import type { PreliminaryQuestionnaire } from '@/lib/types';

type Tab = 'pending' | 'linked_to_consultant' | 'archived' | 'all';
type ConsultantLite = { id: string; name: string; email: string | null; created_at: string };

const TABS: [Tab, string][] = [
  ['pending', 'En attente'],
  ['linked_to_consultant', 'Associés'],
  ['archived', 'Archivés'],
  ['all', 'Tous'],
];

const STATUS: Record<PreliminaryQuestionnaire['status'], { l: string; bg: string; fg: string }> = {
  pending: { l: 'En attente', bg: '#373131', fg: '#E8A87C' },
  linked_to_consultant: { l: 'Associé', bg: '#23383B', fg: '#6DD4B8' },
  archived: { l: 'Archivé', bg: '#1C2230', fg: '#8B95A5' },
};

const HOW = [
  { n: '1', t: 'Partagez votre lien', d: 'Sur votre site, en signature d’e-mail ou à la prise de rendez-vous. Il vous désigne déjà.' },
  { n: '2', t: 'La personne le remplit', d: '13 rubriques, environ 15 minutes, sans créer de compte.' },
  { n: '3', t: 'Vous créez le dossier', d: 'L’anamnèse est préremplie et l’accès à l’app est envoyé.' },
];

const HOW_KEY = 'afeia.questionnaires.howClosed';
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function whenShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Aujourd’hui, ${timeFmt.format(d)}`;
  if (d.toDateString() === y.toDateString()) return `Hier, ${timeFmt.format(d)}`;
  return `${dayFmt.format(d)}, ${timeFmt.format(d)}`;
}

function whenLong(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `aujourd’hui à ${timeFmt.format(d)}`;
  if (d.toDateString() === y.toDateString()) return `hier à ${timeFmt.format(d)}`;
  return `le ${longFmt.format(d)} à ${timeFmt.format(d)}`;
}

function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

const answer = (q: PreliminaryQuestionnaire, section: string, key: string) => (q.responses?.[section]?.[key] ?? '').trim();

function analyse(q: PreliminaryQuestionnaire) {
  const sections = ANAMNESIS_SECTIONS.map((s) => {
    const qa = s.questions.map((x) => ({ q: x.label, a: answer(q, s.id, x.key) })).filter((x) => x.a);
    return { id: s.id, t: s.title, qa };
  });
  const filledIds = new Set(sections.filter((s) => s.qa.length > 0).map((s) => s.id));
  return {
    sections: sections.filter((s) => s.qa.length > 0),
    rubrics: ANAMNESIS_SECTIONS.map((s) => filledIds.has(s.id)),
    filled: filledIds.size,
    missing: ANAMNESIS_SECTIONS.filter((s) => !filledIds.has(s.id)).map((s) => s.title),
    motif: answer(q, 'motif', 'motif_principal'),
    goal: answer(q, 'motif', 'motif_objectifs'),
    meds: answer(q, 'general', 'general_traitements'),
  };
}

function QuestionnairesInner() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const router = useRouter();
  const params = useSearchParams();

  const [items, setItems] = useState<PreliminaryQuestionnaire[]>([]);
  const [consultants, setConsultants] = useState<ConsultantLite[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(params.get('id'));
  const [howOpen, setHowOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ motif: true });
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [lq, setLq] = useState('');
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(HOW_KEY) === '1') setHowOpen(false);
    } catch {
      /* préférence locale indisponible */
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [list, cons, prac] = await Promise.all([
        getPreliminaryQuestionnaires({ limit: 200 }),
        supabase.from('consultants').select('id, name, first_name, last_name, email, created_at').eq('practitioner_id', user.id).is('deleted_at', null),
        supabase.from('practitioners').select('booking_slug').eq('id', user.id).maybeSingle(),
      ]);
      setItems(list);
      setConsultants(
        ((cons.data ?? []) as { id: string; name: string | null; first_name: string | null; last_name: string | null; email: string | null; created_at: string }[]).map((c) => ({
          id: c.id,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Consultant',
          email: c.email,
          created_at: c.created_at,
        }))
      );
      setSlug((prac.data?.booking_slug as string | null) ?? null);
    } catch {
      showToast.error('Les questionnaires n’ont pas pu être chargés.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const term = q.trim().toLowerCase();
  const count = (t: Tab) => items.filter((x) => t === 'all' || x.status === t).length;
  const shown = items.filter(
    (x) => (tab === 'all' || x.status === tab) && (!term || `${x.first_name} ${x.last_name} ${x.email}`.toLowerCase().includes(term))
  );
  const sel = shown.find((x) => x.id === selId) ?? shown[0] ?? null;
  const d = useMemo(() => (sel ? analyse(sel) : null), [sel]);
  const byEmail = useMemo(() => {
    const m = new Map<string, ConsultantLite>();
    consultants.forEach((c) => c.email && m.set(c.email.toLowerCase(), c));
    return m;
  }, [consultants]);
  const match = sel && sel.status === 'pending' ? byEmail.get(sel.email.toLowerCase()) ?? null : null;
  const linked = sel?.linked_consultant_id ? consultants.find((c) => c.id === sel.linked_consultant_id) ?? null : null;

  const pend = count('pending');
  const newCount = items.filter((x) => x.status === 'pending' && Date.now() - new Date(x.created_at).getTime() < 86400000).length;
  const summary = pend > 0 ? `${pend} en attente${newCount ? ` · ${newCount} nouveau${newCount > 1 ? 'x' : ''} depuis hier` : ''} · remplis avant la première séance` : 'Aucun questionnaire en attente';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://afeia.fr';
  const link = slug ? `${origin}/questionnaire/${slug}` : null;

  const setStatusLocal = (id: string, patch: Partial<PreliminaryQuestionnaire>) =>
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  async function create() {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await createConsultantFromQuestionnaire(sel.id);
      setStatusLocal(sel.id, { status: 'linked_to_consultant', linked_consultant_id: r.consultantId, linked_at: new Date().toISOString() });
      showToast.success(`Dossier de ${sel.first_name} créé · code d’accès envoyé à ${r.email ?? sel.email}`);
      void load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Le dossier n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  }

  async function linkTo(consultantId: string) {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await linkQuestionnaireToExistingConsultant(sel.id, consultantId);
      const name = consultants.find((c) => c.id === consultantId)?.name ?? 'ce consultant';
      setStatusLocal(sel.id, { status: 'linked_to_consultant', linked_consultant_id: consultantId, linked_at: new Date().toISOString() });
      setLinkOpen(false);
      setPick(null);
      showToast.success(
        `Questionnaire associé au dossier de ${name} · ${r.filled} réponse${r.filled > 1 ? 's' : ''} ajoutée${r.filled > 1 ? 's' : ''} à l’anamnèse${r.kept ? `, ${r.kept} déjà renseignée${r.kept > 1 ? 's' : ''} conservée${r.kept > 1 ? 's' : ''}` : ''}`
      );
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'L’association a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!sel) return;
    const id = sel.id;
    try {
      await archivePreliminaryQuestionnaire(id);
      setStatusLocal(id, { status: 'archived' });
      showToast.success(`Questionnaire de ${sel.first_name} archivé`, {
        action: { label: 'Annuler', onClick: () => void restore(id) },
      });
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'L’archivage a échoué.');
    }
  }

  async function restore(id: string) {
    try {
      await restorePreliminaryQuestionnaire(id);
      setStatusLocal(id, { status: 'pending' });
      showToast.success('Questionnaire remis en attente');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const allOpen = d ? d.sections.every((s) => open[s.id]) : false;
  const lterm = lq.trim().toLowerCase();
  const cands = consultants.filter((c) => !lterm || `${c.name} ${c.email ?? ''}`.toLowerCase().includes(lterm)).slice(0, 40);

  return (
    <div className="flex max-w-[1180px] flex-col gap-5">
      <Toaster />
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-medium text-charcoal">Questionnaires préliminaires</h1>
          <span className="text-[15px] text-stone">{summary}</span>
        </div>
        <div className="flex min-w-0 flex-[0_1_460px] items-center gap-2 rounded-xl border border-divider bg-surface py-1.5 pl-3.5 pr-1.5">
          <Link2 className="h-4 w-4 flex-none text-stone" aria-hidden="true" />
          {link ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-[#B8C1CF]">{link.replace(/^https?:\/\//, '')}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  } catch {
                    showToast.error('La copie a échoué. Sélectionnez le lien à la main.');
                  }
                }}
                className={`h-[38px] flex-none rounded-[9px] px-3.5 text-sm font-semibold ${copied ? 'bg-sage-light text-sage' : 'bg-sage text-ink'}`}
              >
                {copied ? '✓ Lien copié' : 'Copier mon lien'}
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm text-stone">Choisissez l’adresse de votre page pour obtenir votre lien.</span>
              <Link href="/settings/booking" className="flex h-[38px] flex-none items-center rounded-[9px] border border-divider px-3.5 text-sm text-charcoal">
                Paramètres
              </Link>
            </>
          )}
        </div>
      </header>

      {howOpen && (
        <section aria-label="Comment ça marche" className="flex flex-wrap items-stretch overflow-hidden rounded-2xl border border-divider bg-surface">
          {HOW.map((h) => (
            <div key={h.n} className="flex flex-[1_1_220px] gap-3 border-r border-divider px-[18px] py-4">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sage-light text-[13px] font-semibold text-sage">{h.n}</span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-sm font-semibold text-charcoal">{h.t}</span>
                <span className="text-[13px] leading-[1.45] text-stone">{h.d}</span>
              </span>
            </div>
          ))}
          <button
            type="button"
            aria-label="Masquer l'explication"
            onClick={() => {
              setHowOpen(false);
              try {
                window.localStorage.setItem(HOW_KEY, '1');
              } catch {
                /* ignoré */
              }
            }}
            className="flex w-11 flex-none items-center justify-center text-stone hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Statut" className="flex gap-1 rounded-xl border border-divider bg-surface p-1">
          {TABS.map(([k, l]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className={`flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium ${on ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}
              >
                {l}
                <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${on ? 'bg-sage text-ink' : 'bg-divider text-[#B8C1CF]'}`}>
                  {count(k)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex h-11 flex-[1_1_260px] items-center gap-2 rounded-xl border border-divider bg-surface px-3.5 text-stone focus-within:border-sage">
          <span className="sr-only">Rechercher un questionnaire</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou e-mail" className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none" />
        </label>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="Liste des questionnaires" className="flex min-w-0 max-w-[400px] flex-[1_1_320px] flex-col gap-2">
          {shown.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-divider px-5 py-7 text-center text-sm leading-normal text-stone">
              {term
                ? `Aucun questionnaire ne correspond à « ${q} ».`
                : tab === 'pending'
                  ? 'Rien en attente. Les questionnaires remplis via votre lien arriveront ici.'
                  : 'Aucun questionnaire dans cette catégorie.'}
            </div>
          )}
          {shown.map((x) => {
            const on = sel?.id === x.id;
            const s = STATUS[x.status];
            const a = analyse(x);
            const isNew = x.status === 'pending' && Date.now() - new Date(x.created_at).getTime() < 86400000;
            const name = `${x.first_name} ${x.last_name}`;
            return (
              <button
                key={x.id}
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => {
                  setSelId(x.id);
                  router.replace(`/questionnaires?id=${x.id}`, { scroll: false });
                }}
                className="flex w-full flex-col gap-2 rounded-[14px] border px-4 py-3.5 text-left text-charcoal"
                style={{ borderColor: on ? '#6DD4B8' : '#2A3140', background: on ? '#1C2230' : '#151A23' }}
              >
                <span className="flex w-full items-center gap-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-ink" style={{ background: colorOf(x.id) }}>
                    {initialsOf(name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                      <span className="truncate">{name}</span>
                      {isNew && <span aria-label="Nouveau" className="h-2 w-2 flex-none rounded-full bg-terracotta" />}
                    </span>
                    <span className="text-xs text-stone">{whenShort(x.created_at)}</span>
                  </span>
                  <span className="inline-flex h-[22px] flex-none items-center rounded-full px-2 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
                    {s.l}
                  </span>
                </span>
                {a.motif && <span className="line-clamp-2 text-[13px] leading-[1.45] text-[#B8C1CF]">{a.motif}</span>}
                <span className="flex w-full items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-sm bg-divider">
                    <span className="block h-full bg-sage" style={{ width: `${Math.round((a.filled / ANAMNESIS_SECTIONS.length) * 100)}%` }} />
                  </span>
                  <span className="text-xs text-stone">{a.filled} / {ANAMNESIS_SECTIONS.length} rubriques</span>
                </span>
              </button>
            );
          })}
        </section>

        {sel && d && (
          <article aria-label="Détail du questionnaire" className="flex min-w-0 flex-[999_1_460px] flex-col gap-4 rounded-[18px] border border-divider bg-surface p-6">
            <div className="flex flex-wrap items-start gap-3.5">
              <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full text-[17px] font-semibold text-ink" style={{ background: colorOf(sel.id) }}>
                {initialsOf(`${sel.first_name} ${sel.last_name}`)}
              </span>
              <div className="flex flex-[1_1_220px] flex-col gap-1">
                <h2 className="font-serif text-[26px] font-medium text-charcoal">{sel.first_name} {sel.last_name}</h2>
                <span className="text-sm text-stone">{sel.email} · {sel.phone || 'téléphone non renseigné'}</span>
                <span className="text-[13px] text-stone">Soumis {whenLong(sel.created_at)}</span>
              </div>
              <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[13px] font-semibold" style={{ background: STATUS[sel.status].bg, color: STATUS[sel.status].fg }}>
                {STATUS[sel.status].l}
              </span>
            </div>

            {match && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#5A4636] bg-terracotta-light px-4 py-3.5">
                <span className="flex-[1_1_260px] text-sm leading-normal text-[#F2D2BB]">
                  Un dossier existe déjà avec cet e-mail : <strong>{match.name}</strong>, suivi depuis {monthFmt.format(new Date(match.created_at))}. Associez plutôt que de créer un doublon.
                </span>
                <button type="button" disabled={busy} onClick={() => void linkTo(match.id)} className="h-10 rounded-[10px] bg-terracotta px-3.5 text-sm font-semibold text-ink disabled:opacity-60">
                  Associer à {match.name.split(' ')[0]}
                </button>
              </div>
            )}

            {sel.status === 'pending' && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void create()}
                    className={`flex h-11 items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold disabled:opacity-60 ${match ? 'border border-divider text-charcoal' : 'bg-sage text-ink'}`}
                  >
                    {busy && <Spinner size="sm" />}
                    Créer le dossier consultant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkOpen(true);
                      setPick(match?.id ?? null);
                      setLq('');
                    }}
                    className="h-11 rounded-[10px] border border-divider bg-surface-raised px-4 text-sm font-medium text-charcoal"
                  >
                    Associer à un consultant existant
                  </button>
                  <button type="button" onClick={() => void archive()} className="h-11 px-3.5 text-sm text-stone hover:text-charcoal">
                    Archiver
                  </button>
                </div>
                <span className="-mt-1.5 text-[13px] leading-normal text-stone">
                  Créer le dossier préremplit l’anamnèse et envoie à {sel.first_name} son code d’accès à l’application. Votre conclusion s’écrit ensuite dans les notes privées du dossier.
                </span>
              </>
            )}

            {sel.status === 'linked_to_consultant' && sel.linked_consultant_id && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sage-light px-4 py-3.5">
                <span className="flex-[1_1_240px] text-sm text-[#CFEFE5]">
                  Associé au dossier de {linked?.name ?? sel.first_name}
                  {sel.linked_at ? ` le ${longFmt.format(new Date(sel.linked_at))}` : ''}. Les réponses ont complété son anamnèse.
                </span>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/consultants/${sel.linked_consultant_id}?tab=notes`}
                    title="Ouvre l'onglet Notes privées du dossier, invisible pour le consultant"
                    className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-sage px-3.5 text-sm font-semibold text-ink"
                  >
                    🔒 Écrire ma conclusion ↗
                  </Link>
                  <Link href={`/consultants/${sel.linked_consultant_id}?tab=anamnese`} className="inline-flex h-10 items-center rounded-[10px] border border-[#2F5A50] px-3.5 text-sm font-medium text-[#CFEFE5]">
                    Voir l’anamnèse ↗
                  </Link>
                </div>
              </div>
            )}

            {sel.status === 'archived' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-divider bg-surface-raised px-4 py-3.5">
                <span className="flex-[1_1_240px] text-sm text-[#B8C1CF]">Archivé. Il ne sera associé à aucun dossier.</span>
                <button type="button" onClick={() => void restore(sel.id)} className="h-10 rounded-[10px] border border-divider px-3.5 text-sm text-charcoal">
                  Remettre en attente
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface-raised px-[18px] py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-stone">Motif</span>
                <span className="font-serif text-[19px] leading-[1.4] text-charcoal">{d.motif ? `« ${d.motif} »` : 'Non renseigné'}</span>
                {d.goal && <span className="text-sm text-[#B8C1CF]">Objectif : {d.goal}</span>}
              </div>
              <div role="note" className="flex items-start gap-2 rounded-[10px] border border-[#5C4F1E] bg-[#332D17] px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#F2C94C]" aria-hidden="true" />
                <span className="text-[13px] leading-[1.45] text-[#F5E3A8]">
                  <strong className="font-semibold text-[#F2C94C]">Traitements déclarés : {d.meds || 'non renseigné'}.</strong> {sel.first_name} doit toujours vérifier avec son médecin que vos recommandations sont compatibles avec sa situation.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-charcoal">Réponses</h3>
                <span className="text-[13px] text-stone">{d.filled} rubriques sur {ANAMNESIS_SECTIONS.length}</span>
                <span aria-hidden="true" className="flex max-w-[220px] flex-[1_1_80px] gap-[3px]">
                  {d.rubrics.map((on, i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-[3px]" style={{ background: on ? '#6DD4B8' : '#2A3140' }} />
                  ))}
                </span>
                <span className="flex-1" />
                {d.sections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpen(Object.fromEntries(d.sections.map((s) => [s.id, !allOpen])))}
                    className="h-8 rounded-lg border border-divider px-2.5 text-[13px] text-[#B8C1CF]"
                  >
                    {allOpen ? 'Tout replier' : 'Tout déplier'}
                  </button>
                )}
              </div>
              {d.sections.map((s) => {
                const isOpen = !!open[s.id];
                return (
                  <div key={s.id} className="overflow-hidden rounded-xl border border-divider">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                      className="flex min-h-[48px] w-full items-center gap-2.5 bg-surface-raised px-4 text-left text-[15px] font-medium text-charcoal"
                    >
                      <span className="flex-1">{s.t}</span>
                      <span className="text-xs text-stone">{s.qa.length} réponse{s.qa.length > 1 ? 's' : ''}</span>
                      <ChevronDown className={`h-4 w-4 text-stone ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-3.5 p-4">
                        {s.qa.map((a) => (
                          <div key={a.q} className="flex flex-col gap-1">
                            <span className="text-xs text-stone">{a.q}</span>
                            <span className="max-w-[62ch] whitespace-pre-wrap text-[15px] leading-normal text-charcoal">{a.a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {d.missing.length > 0 && (
                <span className="px-0.5 pt-1 text-[13px] leading-normal text-stone">
                  Non remplies : {d.missing.join(', ')}. Vous pourrez les compléter en séance, dans l’anamnèse.
                </span>
              )}
            </div>
          </article>
        )}
      </div>

      <Modal isOpen={linkOpen && !!sel} onClose={() => setLinkOpen(false)} title={`Associer le questionnaire de ${sel?.first_name ?? ''}`}>
        <div className="flex flex-col gap-3.5">
          <label className="flex h-11 items-center gap-2 rounded-[10px] border border-divider bg-cream px-3 text-stone focus-within:border-sage">
            <span className="sr-only">Rechercher un consultant</span>
            <input type="search" value={lq} onChange={(e) => setLq(e.target.value)} placeholder="Rechercher un consultant" className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none" />
          </label>
          <div role="radiogroup" aria-label="Consultant" className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
            {cands.length === 0 && <span className="px-1 text-sm text-stone">Aucun consultant ne correspond.</span>}
            {cands.map((c) => {
              const on = pick === c.id;
              const same = !!sel && !!c.email && c.email.toLowerCase() === sel.email.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(c.id)}
                  className="flex min-h-[48px] items-center gap-2.5 rounded-[10px] border px-3 text-left text-charcoal"
                  style={{ borderColor: on ? '#6DD4B8' : '#2A3140', background: on ? '#23383B' : 'transparent' }}
                >
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-xs font-semibold text-ink" style={{ background: colorOf(c.id) }}>
                    {initialsOf(c.name)}
                  </span>
                  <span className="flex flex-1 flex-col gap-px">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.email && <span className="text-xs text-stone">{c.email}</span>}
                  </span>
                  {same && <span className="text-xs text-terracotta">même e-mail</span>}
                </button>
              );
            })}
          </div>
          <span className="text-[13px] leading-normal text-stone">
            Les réponses complètent l’anamnèse : les champs déjà remplis sont conservés, et la version précédente reste dans l’historique.
          </span>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLinkOpen(false)} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
              Annuler
            </button>
            <button
              type="button"
              disabled={!pick || busy}
              onClick={() => pick && void linkTo(pick)}
              className="h-11 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:bg-divider disabled:text-stone"
            >
              Associer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function QuestionnairesPage() {
  return (
    <Suspense fallback={null}>
      <QuestionnairesInner />
    </Suspense>
  );
}
