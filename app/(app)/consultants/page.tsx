'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Plus, Search, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { getMyConsultantsAndInvitations } from '@/services/practitioner.service';
import { invitationService } from '@/services/invitation.service';
import { supabase } from '@/lib/supabase';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';

type ConsultantRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  activated?: boolean | null;
  status?: string | null;
  is_premium?: boolean | null;
  is_demo?: boolean | null;
};

type InvitationRow = {
  id: string;
  consultant_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  invited_at: string;
  code_expires_at?: string;
  status: string;
};

type Row = {
  id: string;
  name: string;
  city: string;
  email: string;
  phoneDigits: string;
  premium: boolean;
  demo: boolean;
  lastDate: Date | null;
  nextDate: Date | null;
  relance: boolean;
  color: string;
};

type SortKey = 'name' | 'last' | 'next';
const PER = 8;
const DAY = 86400000;
const M = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function fmt(d: Date) {
  return `${d.getDate()} ${M[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}

function displayName(c: { name?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null }) {
  return c.name || c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Consultant';
}

/** Téléphone normalisé : chiffres seuls, +33 → 0. */
function digits(s: string | null | undefined) {
  return (s ?? '').replace(/\D/g, '').replace(/^33(?=\d{9}$)/, '0');
}

function agoLabel(d: Date | null) {
  if (!d) return 'jamais vu en séance';
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days <= 0) return 'aujourd’hui';
  if (days < 31) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

function nextLabel(d: Date | null) {
  if (!d) return 'À planifier';
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain';
  return fmt(d);
}

const selectCls = 'h-10 cursor-pointer rounded-[10px] border bg-surface pl-3 pr-8 text-sm text-charcoal outline-none focus:border-sage';

function ConsultantsInner() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const params = useSearchParams();

  const [rows, setRows] = useState<Row[]>([]);
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [relancedToday, setRelancedToday] = useState<Set<string>>(new Set());
  const [hasSlug, setHasSlug] = useState(false);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(params.get('q') ?? '');
  const [offre, setOffre] = useState<'tous' | 'Premium' | 'Standard'>('tous');
  const [last, setLast] = useState<'tous' | 'm1' | 'm3' | 'old' | 'none'>('tous');
  const [next, setNext] = useState<'tous' | 'planned' | 'todo'>('tous');
  const [rel, setRel] = useState(params.get('filtre') === 'a-relancer');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState(1);
  const [page, setPage] = useState(1);
  const [invOpen, setInvOpen] = useState(true);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const [modal, setModal] = useState<Row | null>(null);
  const [channel, setChannel] = useState<'app' | 'email'>('app');
  const [draft, setDraft] = useState('');
  const [withLink, setWithLink] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (params.get('deleted') === '1') showToast.success('Le dossier a été supprimé définitivement.');
    if (params.get('created') === '1') showToast.success('Invitation envoyée : le code d’activation est parti par e-mail.');
  }, [params]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getMyConsultantsAndInvitations();
      if (!result.success) throw new Error(result.error);
      const invitations = (result.invitations ?? []) as InvitationRow[];
      const invitedIds = new Set(invitations.map((i) => i.consultant_id).filter(Boolean) as string[]);
      const consultants = ((result.consultants ?? []) as ConsultantRow[]).filter((c, i, arr) => !invitedIds.has(c.id) && arr.findIndex((x) => x.id === c.id) === i);
      const ids = consultants.map((c) => c.id);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const nowIso = new Date().toISOString();
      const [pastApts, futureApts, consults, relances, prac] = await Promise.all([
        ids.length ? supabase.from('appointments').select('consultant_id, starts_at').in('consultant_id', ids).eq('status', 'completed') : Promise.resolve({ data: [] }),
        ids.length
          ? supabase.from('appointments').select('consultant_id, starts_at').in('consultant_id', ids).gte('starts_at', nowIso).not('status', 'in', '("cancelled","rescheduled")')
          : Promise.resolve({ data: [] }),
        ids.length ? supabase.from('consultations').select('consultant_id, date').in('consultant_id', ids) : Promise.resolve({ data: [] }),
        supabase.from('practitioner_actions').select('consultant_id').eq('practitioner_id', user.id).eq('type', 'relance').gte('created_at', startOfDay.toISOString()),
        supabase.from('practitioners').select('booking_slug').eq('id', user.id).maybeSingle(),
      ]);

      const lastMap = new Map<string, number>();
      const bumpLast = (id: string | null, iso: string | null) => {
        if (!id || !iso) return;
        const t = new Date(iso).getTime();
        if (t <= Date.now() && t > (lastMap.get(id) ?? 0)) lastMap.set(id, t);
      };
      ((pastApts.data ?? []) as { consultant_id: string; starts_at: string }[]).forEach((a) => bumpLast(a.consultant_id, a.starts_at));
      ((consults.data ?? []) as { consultant_id: string; date: string }[]).forEach((c) => bumpLast(c.consultant_id, c.date));
      const nextMap = new Map<string, number>();
      ((futureApts.data ?? []) as { consultant_id: string; starts_at: string }[]).forEach((a) => {
        const t = new Date(a.starts_at).getTime();
        if (!nextMap.has(a.consultant_id) || t < (nextMap.get(a.consultant_id) as number)) nextMap.set(a.consultant_id, t);
      });

      setRows(
        consultants.map((c, i) => {
          const lastT = lastMap.get(c.id);
          const nextT = nextMap.get(c.id);
          const lastDate = lastT ? new Date(lastT) : null;
          const nextDate = nextT ? new Date(nextT) : null;
          const lastDays = lastDate ? (Date.now() - lastDate.getTime()) / DAY : null;
          return {
            id: c.id,
            name: displayName(c),
            city: c.city || '—',
            email: (c.email ?? '').toLowerCase(),
            phoneDigits: digits(c.phone),
            premium: !!c.is_premium || c.status === 'premium',
            demo: !!c.is_demo,
            lastDate,
            nextDate,
            relance: c.activated !== false && !nextDate && (lastDays === null || lastDays > 30),
            color: FACE_COLORS[i % FACE_COLORS.length],
          };
        })
      );
      setInvites(invitations.filter((i) => i.status === 'pending'));
      setRelancedToday(new Set(((relances.data ?? []) as { consultant_id: string }[]).map((r) => r.consultant_id)));
      setHasSlug(!!prac.data?.booking_slug);
    } catch {
      showToast.error('La liste des consultants n’a pas pu être chargée.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const term = q.trim().toLowerCase();
  const termDigits = digits(q);
  const filtered = useMemo(() => {
    const okLast = (r: Row) => {
      if (last === 'tous') return true;
      if (last === 'none') return !r.lastDate;
      if (!r.lastDate) return false;
      const days = (Date.now() - r.lastDate.getTime()) / DAY;
      return last === 'm1' ? days <= 30 : last === 'm3' ? days > 30 && days <= 90 : days > 90;
    };
    const okNext = (r: Row) => (next === 'tous' ? true : next === 'planned' ? !!r.nextDate : !r.nextDate);
    const okSearch = (r: Row) =>
      !term || r.name.toLowerCase().includes(term) || r.email.includes(term) || (termDigits.length >= 2 && r.phoneDigits.includes(termDigits));
    const big = Number.MAX_SAFE_INTEGER;
    const key: Record<SortKey, (r: Row) => string | number> = {
      name: (r) => r.name.toLocaleLowerCase('fr'),
      last: (r) => (r.lastDate ? (Date.now() - r.lastDate.getTime()) : big),
      next: (r) => (r.nextDate ? r.nextDate.getTime() : big),
    };
    return rows
      .filter((r) => (offre === 'tous' || (offre === 'Premium') === r.premium) && okLast(r) && okNext(r) && (!rel || (r.relance && !relancedToday.has(r.id))) && okSearch(r))
      .sort((a, b) => {
        const x = key[sort](a);
        const y = key[sort](b);
        return (typeof x === 'string' ? x.localeCompare(y as string, 'fr') : x < (y as number) ? -1 : x > (y as number) ? 1 : 0) * dir;
      });
  }, [rows, offre, last, next, rel, term, termDigits, sort, dir, relancedToday]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(page, pages);
  const visible = filtered.slice((cur - 1) * PER, cur * PER);
  const anyFilter = !!q || offre !== 'tous' || last !== 'tous' || next !== 'tous' || rel;
  const relCount = rows.filter((r) => r.relance && !relancedToday.has(r.id)).length;
  const clear = () => {
    setQ('');
    setOffre('tous');
    setLast('tous');
    setNext('tous');
    setRel(false);
    setPage(1);
  };

  const sorter = (k: SortKey, label: string) => {
    const on = sort === k;
    return (
      <button
        type="button"
        onClick={() => {
          setDir(on ? -dir : 1);
          setSort(k);
        }}
        className={`inline-flex h-9 items-center gap-1.5 px-1.5 text-[13px] font-medium ${on ? 'text-charcoal' : 'text-stone'}`}
      >
        {label} <span aria-hidden="true">{on ? (dir === 1 ? '↑' : '↓') : '↕'}</span>
      </button>
    );
  };
  const ariaSort = (k: SortKey) => (sort === k ? (dir === 1 ? 'ascending' : 'descending') : 'none');

  const premiumCount = rows.filter((r) => r.premium).length;
  const expired = (i: InvitationRow) => !!i.code_expires_at && new Date(i.code_expires_at) < new Date();
  const expiredCount = invites.filter(expired).length;

  async function sendRelance() {
    if (!modal) return;
    if (!draft.trim()) {
      showToast.error('Le message est vide.');
      return;
    }
    setSending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`/api/consultants/${modal.id}/relance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ channel, text: draft.trim(), withLink }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'La relance n’a pas pu être envoyée.');
      setRelancedToday((s) => new Set(s).add(modal.id));
      showToast.success(`Relance envoyée à ${modal.name}${channel === 'email' ? ' par e-mail' : ' sur Afeia'}`);
      setModal(null);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La relance n’a pas pu être envoyée.');
    } finally {
      setSending(false);
    }
  }

  async function resend(inv: InvitationRow) {
    setBusyInvite(inv.id);
    try {
      const r = await invitationService.resendInvitationCode(inv.email);
      if (!r.success) throw new Error(r.error);
      showToast.success(`Un nouveau code a été envoyé à ${inv.email}`);
      void load();
    } catch (e) {
      showToast.error(e instanceof Error && e.message ? e.message : 'Le code n’a pas pu être renvoyé.');
    } finally {
      setBusyInvite(null);
    }
  }

  async function cancelInvite(inv: InvitationRow) {
    setBusyInvite(inv.id);
    try {
      const r = await invitationService.cancelInvitation(inv.id);
      if (!r.success) throw new Error(r.error);
      setInvites((list) => list.filter((x) => x.id !== inv.id));
      showToast.success(`L’invitation de ${inv.email} est annulée`);
    } catch (e) {
      showToast.error(e instanceof Error && e.message ? e.message : 'L’invitation n’a pas pu être annulée.');
    } finally {
      setBusyInvite(null);
      setConfirmCancel(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex max-w-[1180px] flex-col gap-5">
        <h1 className="font-serif text-[36px] font-medium leading-tight text-charcoal">Consultants</h1>
        <SkeletonList items={6} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex max-w-[1180px] flex-col gap-5">
      <Toaster />
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[36px] font-medium leading-[1.1] text-charcoal">Consultants</h1>
          <p className="text-[15px] text-stone">
            {rows.length} actif{rows.length > 1 ? 's' : ''} · {premiumCount} en Premium
            {invites.length > 0 ? ` · ${invites.length} invitation${invites.length > 1 ? 's' : ''} en attente` : ''}
          </p>
        </div>
        <Link href="/consultants/new" className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau consultant
        </Link>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-11 flex-[1_1_280px] items-center gap-2.5 rounded-[10px] border border-divider bg-cream px-3.5 text-stone focus-within:border-sage">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Rechercher un consultant</span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Nom, e-mail ou téléphone"
              className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none"
            />
          </label>
          <span className="text-[13px] text-stone">{filtered.length} sur {rows.length}</span>
          {anyFilter && (
            <button type="button" onClick={clear} className="h-9 px-2.5 text-[13px] text-sage hover:text-sage-dark">
              Réinitialiser
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-stone">
            Offre
            <select value={offre} onChange={(e) => { setOffre(e.target.value as typeof offre); setPage(1); }} className={selectCls} style={{ borderColor: offre !== 'tous' ? '#6DD4B8' : '#2A3140' }}>
              <option value="tous">Toutes</option>
              <option value="Premium">Premium</option>
              <option value="Standard">Standard</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone">
            Dernière séance
            <select value={last} onChange={(e) => { setLast(e.target.value as typeof last); setPage(1); }} className={selectCls} style={{ borderColor: last !== 'tous' ? '#6DD4B8' : '#2A3140' }}>
              <option value="tous">Toutes</option>
              <option value="m1">Moins d’un mois</option>
              <option value="m3">1 à 3 mois</option>
              <option value="old">Plus de 3 mois</option>
              <option value="none">Jamais vu</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone">
            Prochain RDV
            <select value={next} onChange={(e) => { setNext(e.target.value as typeof next); setPage(1); }} className={selectCls} style={{ borderColor: next !== 'tous' ? '#6DD4B8' : '#2A3140' }}>
              <option value="tous">Tous</option>
              <option value="planned">Planifié</option>
              <option value="todo">À planifier</option>
            </select>
          </label>
          <label
            className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-sm text-charcoal"
            style={{ borderColor: rel ? '#5A4636' : '#2A3140', background: rel ? '#373131' : 'transparent' }}
          >
            <input type="checkbox" checked={rel} onChange={() => { setRel((v) => !v); setPage(1); }} className="h-4 w-4 accent-terracotta" />
            À relancer <span className="text-stone">{relCount}</span>
          </label>
        </div>
      </div>

      {cur === 1 && invites.length > 0 && (
        <section aria-label="Invitations en attente" className="overflow-hidden rounded-2xl border border-divider bg-surface">
          <button
            type="button"
            onClick={() => setInvOpen((v) => !v)}
            aria-expanded={invOpen}
            aria-controls="inv-list"
            className="flex min-h-[52px] w-full items-center gap-2.5 px-5 text-left text-charcoal"
          >
            <span className="text-base font-semibold">Invitations en attente</span>
            <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-terracotta-light px-[7px] text-xs font-semibold text-terracotta">{invites.length}</span>
            <span className="flex-1 text-[13px] text-stone">
              {[expiredCount ? `${expiredCount} expirée${expiredCount > 1 ? 's' : ''}` : null, invites.length - expiredCount ? `${invites.length - expiredCount} en attente` : null].filter(Boolean).join(' · ')}
            </span>
            <ChevronDown className={`h-[18px] w-[18px] text-stone transition-transform duration-200 ${invOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {invOpen && (
            <div id="inv-list" className="flex flex-col border-t border-divider">
              {invites.map((inv, i) => {
                const isExp = expired(inv);
                const name = displayName(inv);
                const sent = new Date(inv.invited_at);
                return (
                  <div key={inv.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-divider' : ''}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-mist text-[13px] font-semibold text-[#C9CFDA]">{initialsOf(name)}</span>
                    <span className="flex flex-[1_1_200px] flex-col gap-0.5">
                      <span className="font-medium text-charcoal">{name}</span>
                      <span className="text-[13px] text-stone">Code envoyé {agoLabel(sent) === 'aujourd’hui' ? 'aujourd’hui' : `le ${fmt(sent)}`} · {inv.email}</span>
                    </span>
                    <span
                      className="rounded-full px-2.5 py-[3px] text-xs font-medium"
                      style={isExp ? { background: '#3A2224', color: '#F2A3A3' } : { background: '#2A3140', color: '#C9CFDA' }}
                    >
                      {isExp ? 'Expirée' : 'En attente'}
                    </span>
                    <button
                      type="button"
                      disabled={busyInvite === inv.id}
                      onClick={() => void resend(inv)}
                      className="inline-flex h-9 items-center rounded-lg border border-divider px-3 text-[13px] text-charcoal hover:border-sage disabled:opacity-60"
                    >
                      Renvoyer le code
                    </button>
                    {confirmCancel === inv.id ? (
                      <span className="flex items-center gap-2 text-[13px]">
                        <button type="button" onClick={() => setConfirmCancel(null)} className="h-9 px-2 text-stone">Garder</button>
                        <button type="button" disabled={busyInvite === inv.id} onClick={() => void cancelInvite(inv)} className="h-9 rounded-lg bg-[#3A2224] px-3 font-semibold text-[#F2A3A3]">
                          Confirmer l’annulation
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmCancel(inv.id)} className="inline-flex h-9 items-center px-2 text-[13px] text-[#F2A3A3]">
                        Annuler
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="overflow-x-auto rounded-2xl border border-divider bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[13px] text-stone">
              <th scope="col" aria-sort={ariaSort('name')} className="px-3.5 py-2 font-medium">{sorter('name', 'Consultant')}</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Offre</th>
              <th scope="col" aria-sort={ariaSort('last')} className="px-1.5 py-2 font-medium">{sorter('last', 'Dernière séance')}</th>
              <th scope="col" aria-sort={ariaSort('next')} className="px-1.5 py-2 font-medium">{sorter('next', 'Prochain RDV')}</th>
              <th scope="col" className="py-3.5 pl-3 pr-5 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const done = relancedToday.has(r.id);
              return (
                <tr key={r.id} className="border-t border-divider">
                  <td className="px-5 py-3">
                    <Link href={`/consultants/${r.id}`} className="flex items-center gap-3 text-charcoal hover:text-sage">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-ink" style={{ background: r.color }}>
                        {initialsOf(r.name)}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {r.name}
                          {r.demo && <span className="ml-2 rounded-full border border-divider px-2 py-px text-[11px] text-stone">Démo</span>}
                        </span>
                        <span className="text-[13px] text-stone">{r.city}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3">
                    <span
                      className="rounded-full px-2.5 py-[3px] text-xs font-medium"
                      style={r.premium ? { background: '#373131', color: '#E8A87C' } : { background: '#23383B', color: '#6DD4B8' }}
                    >
                      {r.premium ? 'Premium' : 'Standard'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="flex flex-col gap-0.5">
                      <span className={r.lastDate ? 'text-charcoal' : 'text-stone'}>{r.lastDate ? fmt(r.lastDate) : 'Aucune'}</span>
                      <span className="text-xs" style={{ color: r.relance ? '#E8A87C' : '#8B95A5' }}>{agoLabel(r.lastDate)}</span>
                    </span>
                  </td>
                  <td className={`p-3 ${r.nextDate ? 'text-charcoal' : 'text-stone'}`}>{nextLabel(r.nextDate)}</td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    {r.relance && !done && (
                      <button
                        type="button"
                        onClick={() => {
                          setModal(r);
                          setChannel('app');
                          setWithLink(hasSlug);
                          setDraft(`Bonjour ${r.name.split(' ')[0]}, j’espère que vous allez bien depuis notre dernière séance. Où en êtes-vous avec vos conseils ? Si vous le souhaitez, nous pouvons faire un point ensemble.`);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#5A4636] bg-terracotta-light px-3 text-[13px] font-medium text-terracotta"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Relancer
                      </button>
                    )}
                    {done && <span className="inline-flex h-9 items-center px-1 text-[13px] text-sage">✓ Relancé aujourd’hui</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-stone">
            {rows.length === 0 ? (
              <>Aucun consultant pour l’instant. <Link href="/consultants/new" className="text-sage underline">Ajouter le premier</Link></>
            ) : (
              <>Aucun consultant ne correspond. <button type="button" onClick={clear} className="text-sage underline">Effacer les filtres</button></>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-divider px-5 py-3 text-[13px] text-stone">
          <span>{filtered.length === 0 ? '' : `${(cur - 1) * PER + 1}–${Math.min(cur * PER, filtered.length)} sur ${filtered.length} · page ${cur} / ${pages}`}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={cur <= 1} onClick={() => setPage(Math.max(1, cur - 1))} aria-label="Page précédente" className="h-9 rounded-lg border border-divider px-3 text-charcoal disabled:text-mist">
              ‹ Précédente
            </button>
            <button type="button" disabled={cur >= pages} onClick={() => setPage(Math.min(pages, cur + 1))} aria-label="Page suivante" className="h-9 rounded-lg border border-divider px-3 text-charcoal disabled:text-mist">
              Suivante ›
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal ? `Relancer ${modal.name}` : ''} description={modal ? `Dernière séance : ${modal.lastDate ? fmt(modal.lastDate) : 'aucune'} · ${agoLabel(modal.lastDate)}` : undefined}>
        <div className="flex flex-col gap-4">
          <div role="group" aria-label="Canal" className="flex gap-1.5 rounded-xl border border-divider bg-cream p-1">
            {([['app', 'Message Afeia'], ['email', 'E-mail']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={channel === k}
                onClick={() => setChannel(k)}
                className={`h-[38px] flex-1 rounded-lg text-sm font-medium ${channel === k ? 'bg-sage-light text-sage' : 'text-charcoal'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <label htmlFor="relance-msg" className="-mb-2 text-[13px] text-stone">Message (modifiable)</label>
          <textarea
            id="relance-msg"
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-y rounded-xl border border-divider bg-cream px-3.5 py-3 text-sm leading-[1.55] text-charcoal outline-none focus:border-sage"
          />
          <label className={`flex items-center gap-2.5 text-sm ${hasSlug ? 'cursor-pointer text-[#C9CFDA]' : 'text-mist'}`}>
            <input type="checkbox" disabled={!hasSlug} checked={withLink && hasSlug} onChange={() => setWithLink((v) => !v)} className="h-4 w-4 accent-sage" />
            Joindre mon lien de prise de rendez-vous
            {!hasSlug && <Link href="/settings/booking" className="text-sage">· à configurer</Link>}
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
              Annuler
            </button>
            <button type="button" disabled={sending} onClick={() => void sendRelance()} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-70">
              {sending && <Spinner size="sm" />}
              Envoyer la relance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ConsultantsPage() {
  return (
    <Suspense fallback={null}>
      <ConsultantsInner />
    </Suspense>
  );
}
