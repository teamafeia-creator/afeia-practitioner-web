'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { useInvoiceStats } from '@/hooks/use-invoice-stats';
import { supabase } from '@/lib/supabase';
import { NewInvoiceModal, loadToBill, type ToBill } from '@/components/invoicing/NewInvoiceModal';
import { METHOD_LABELS, STATUS_UI, consultantName, dateShort, eur, urssafQuarter } from '@/lib/invoicing/display';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { ConsultationInvoice, InvoiceStatus } from '@/lib/invoicing/types';

type Tab = 'all' | InvoiceStatus;
const TABS: [Tab, string][] = [
  ['all', 'Toutes'],
  ['draft', 'Brouillons'],
  ['issued', 'En attente'],
  ['paid', 'Payées'],
  ['refunded', 'Remboursées'],
  ['cancelled', 'Annulées'],
];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

async function download(url: string, token: string, name: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error();
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

function FacturationInner() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const router = useRouter();
  const params = useSearchParams();
  const { stats, refetch: refetchStats } = useInvoiceStats();

  const [token, setToken] = useState('');
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [toBill, setToBill] = useState<ToBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(params.get('nouvelle') === '1');
  const [pick, setPick] = useState<string | null>(params.get('seance'));
  const exportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token ?? '';
    setToken(t);
    try {
      const [list, settings, bill] = await Promise.all([
        fetch('/api/invoicing/list?limit=1000', { headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : { invoices: [] })),
        fetch('/api/invoicing/settings', { headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : { settings: null })),
        loadToBill(user.id).catch(() => [] as ToBill[]),
      ]);
      setInvoices(list.invoices ?? []);
      setConfigured(!!settings.settings);
      setToBill(bill);
    } catch {
      showToast.error('La facturation n’a pas pu être chargée.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const now = new Date();
  const term = q.trim().toLowerCase();
  const shown = invoices.filter(
    (i) => (tab === 'all' || i.status === tab) && (!term || `${consultantName(i)} ${i.numero ?? ''}`.toLowerCase().includes(term))
  );
  const pending = invoices.filter((i) => i.status === 'issued' && !i.is_avoir);
  const paidCount = invoices.filter((i) => i.status === 'paid' && new Date(i.payment_date ?? i.created_at).getFullYear() === now.getFullYear()).length;
  const lastMonth = useMemo(() => {
    const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return invoices
      .filter((i) => i.status === 'paid' && i.payment_date && new Date(i.payment_date).getFullYear() === m.getFullYear() && new Date(i.payment_date).getMonth() === m.getMonth())
      .reduce((s, i) => s + Number(i.montant), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);
  const caMois = stats?.ca_mois ?? 0;
  const evol = lastMonth > 0 ? Math.round(((caMois - lastMonth) / lastMonth) * 100) : null;
  const urssaf = urssafQuarter(invoices, now);

  const kpis = [
    {
      l: `Encaissé en ${MONTHS[now.getMonth()]}`,
      v: eur(caMois),
      s: evol === null ? 'Rien d’encaissé le mois dernier' : `${evol >= 0 ? '+' : '−'}${Math.abs(evol)} % par rapport à ${MONTHS[(now.getMonth() + 11) % 12]}`,
      c: '#E8EDF4',
    },
    { l: `Encaissé en ${now.getFullYear()}`, v: eur(stats?.ca_annee ?? 0), s: `${paidCount} facture${paidCount > 1 ? 's' : ''} payée${paidCount > 1 ? 's' : ''}`, c: '#E8EDF4' },
    { l: 'En attente de paiement', v: eur(stats?.montant_en_attente ?? pending.reduce((s, i) => s + Number(i.montant), 0)), s: `${pending.length} facture${pending.length > 1 ? 's' : ''} émise${pending.length > 1 ? 's' : ''}`, c: '#E8A87C' },
    { l: 'Panier moyen', v: stats?.ticket_moyen ? eur(Math.round(stats.ticket_moyen)) : '—', s: 'par séance facturée', c: '#E8EDF4' },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex max-w-[1180px] flex-col gap-5">
      <Toaster />
      <section className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="font-serif text-[36px] font-medium text-charcoal">Facturation</h1>
          <p className="text-[15px] text-stone">Vos factures de séances et votre chiffre d’affaires.</p>
        </div>
        {configured && (
          <div className="relative" ref={exportRef}>
            <button type="button" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
              Exporter ▾
            </button>
            {exportOpen && (
              <div role="menu" className="absolute right-0 top-[50px] z-10 flex w-[260px] flex-col rounded-xl border border-divider bg-surface-raised p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setExportOpen(false);
                    try {
                      await download('/api/invoicing/export/csv?period=month', token, `factures_${period}.csv`);
                    } catch {
                      showToast.error('L’export CSV a échoué.');
                    }
                  }}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-charcoal hover:bg-surface"
                >
                  <span className="text-sm">Tableau (CSV)</span>
                  <span className="text-xs text-stone">Pour votre comptable ou un tableur</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setExportOpen(false);
                    try {
                      await download('/api/invoicing/export/pdf-summary?period=month', token, `recapitulatif_${period}.pdf`);
                    } catch {
                      showToast.error('L’export PDF a échoué.');
                    }
                  }}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-charcoal hover:bg-surface"
                >
                  <span className="text-sm">Récapitulatif (PDF)</span>
                  <span className="text-xs text-stone">Total du mois, prêt à archiver</span>
                </button>
              </div>
            )}
          </div>
        )}
        <Link href="/settings/facturation" className="inline-flex h-11 items-center px-3.5 text-sm text-stone hover:text-charcoal">Réglages</Link>
        {configured && (
          <button
            type="button"
            onClick={() => {
              setPick(null);
              setNewOpen(true);
            }}
            className="h-11 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep"
          >
            ＋ Nouvelle facture
          </button>
        )}
      </section>

      {configured === false && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-divider bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold text-charcoal">Configurez votre facturation</h2>
          <p className="max-w-md text-sm text-stone">Renseignez votre SIRET et votre adresse de facturation pour émettre vos premières factures.</p>
          <Link href="/settings/facturation" className="inline-flex h-11 items-center rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink">Configurer</Link>
        </div>
      )}

      {configured && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {kpis.map((k) => (
              <div key={k.l} className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-surface p-[18px]">
                <span className="text-[13px] text-stone">{k.l}</span>
                <span className="font-serif text-[30px] tabular-nums" style={{ color: k.c }}>{k.v}</span>
                <span className="text-xs text-stone">{k.s}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {toBill.length > 0 && (
              <div className="flex flex-[2_1_380px] flex-wrap items-center gap-3 rounded-[14px] border border-[#5A4636] bg-terracotta-light px-[18px] py-4">
                <span className="flex flex-[1_1_240px] flex-col gap-[3px]">
                  <span className="text-[15px] font-semibold text-[#F2D2BB]">
                    {toBill.length} séance{toBill.length > 1 ? 's' : ''} terminée{toBill.length > 1 ? 's' : ''} sans facture
                  </span>
                  <span className="text-[13px] text-[#D9B9A2]">{toBill.slice(0, 4).map((t) => `${t.who.split(' ')[0]} (${t.date})`).join(', ')}{toBill.length > 4 ? '…' : ''}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPick(toBill[0].appointmentId);
                    setNewOpen(true);
                  }}
                  className="h-10 rounded-[10px] bg-terracotta px-3.5 text-sm font-semibold text-ink"
                >
                  Facturer
                </button>
              </div>
            )}
            <div className="flex flex-[1_1_260px] flex-col gap-[3px] rounded-[14px] border border-[#2E3A60] bg-[#1F2640] px-[18px] py-4">
              <span className="text-[13px] text-[#A9B8EC]">À déclarer à l’URSSAF · {urssaf.label}</span>
              <span className="font-serif text-2xl text-[#D4DCF6]">{eur(urssaf.total)}</span>
              <span className="text-xs text-[#9AA8D6]">Encaissé depuis le {urssaf.since} · déclaration avant le {urssaf.deadline}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="Statut" className="flex flex-wrap gap-1 rounded-xl border border-divider bg-surface p-1">
              {TABS.map(([k, l]) => {
                const on = tab === k;
                const n = invoices.filter((i) => k === 'all' || i.status === k).length;
                return (
                  <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)} className={`h-[34px] rounded-lg px-3 text-[13px] font-medium ${on ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}>
                    {l} <span className="text-stone">{n}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex h-[42px] flex-[1_1_220px] items-center gap-2 rounded-[10px] border border-divider bg-surface px-3 text-stone focus-within:border-sage">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Rechercher</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Consultant ou n° de facture" className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-mist" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-divider bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-stone">
                  <th scope="col" className="px-[18px] py-3.5 font-medium">N°</th>
                  <th scope="col" className="px-2 py-3.5 font-medium">Consultant</th>
                  <th scope="col" className="px-2 py-3.5 font-medium">Séance</th>
                  <th scope="col" className="px-2 py-3.5 font-medium">Émise le</th>
                  <th scope="col" className="px-2 py-3.5 text-right font-medium">Montant</th>
                  <th scope="col" className="px-2 py-3.5 font-medium">Paiement</th>
                  <th scope="col" className="py-3.5 pl-2 pr-[18px] font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => {
                  const s = STATUS_UI[i.status];
                  const who = consultantName(i);
                  return (
                    <tr
                      key={i.id}
                      tabIndex={0}
                      onClick={() => router.push(`/facturation/${i.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/facturation/${i.id}`)}
                      className="cursor-pointer border-t border-divider hover:bg-surface-raised focus:bg-surface-raised focus:outline-none"
                    >
                      <td className="px-[18px] py-3 tabular-nums text-[#B8C1CF]">{i.status === 'draft' ? 'Brouillon' : i.numero ?? '—'}</td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2.5 text-charcoal">
                          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-ink" style={{ background: colorOf(i.consultant_id) }}>
                            {initialsOf(who)}
                          </span>
                          {who}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{i.is_avoir ? `Avoir · ${i.description}` : i.description}</td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{dateShort(i.date_emission)}</td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums text-charcoal">{eur(Number(i.montant))}</td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{i.payment_method ? METHOD_LABELS[i.payment_method] : '—'}</td>
                      <td className="py-3 pl-2 pr-[18px]">
                        <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>{s.l}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <p className="p-7 text-center text-sm text-stone">{invoices.length ? 'Aucune facture dans cette catégorie.' : 'Aucune facture pour l’instant.'}</p>}
          </div>
        </>
      )}

      {configured && (
        <NewInvoiceModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          practitionerId={user.id}
          authToken={token}
          toBill={toBill}
          initialPick={pick}
          onCreated={(inv) => {
            void load();
            refetchStats();
            router.push(`/facturation/${inv.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function FacturationPage() {
  return (
    <Suspense fallback={null}>
      <FacturationInner />
    </Suspense>
  );
}
