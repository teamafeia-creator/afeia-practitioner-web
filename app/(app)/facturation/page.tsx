'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { NewInvoiceModal, loadToBill, type ToBill } from '@/components/invoicing/NewInvoiceModal';
import { BillSessionsModal } from '@/components/invoicing/BillSessionsModal';
import { RemindModal, ageLabel, daysSince } from '@/components/invoicing/RemindModal';
import { BillingSetup, DevBadge } from '@/components/invoicing/BillingSetup';
import { ExternalToolView } from '@/components/invoicing/ExternalToolView';
import { FilterMenu, type FilterOption } from '@/components/invoicing/FilterMenu';
import { isBillingTool, type BillingTool, type ExternalTool } from '@/lib/invoicing/billing-tools';
import { defaultReminderText } from '@/lib/invoicing/manual-reminder';
import {
  KIND_LABELS,
  METHOD_LABELS,
  STATUS_UI,
  consultantName,
  dateShort,
  eur,
  kindOf,
  practitionerNameParts,
  urssafQuarter,
  type PractitionerName,
  type SessionKind,
} from '@/lib/invoicing/display';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { ConsultationInvoice, InvoiceDocumentType, InvoiceStatus, PaymentMethod, PractitionerBillingSettings } from '@/lib/invoicing/types';

type Tab = 'all' | InvoiceStatus;
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'unpaid_first' | 'who' | 'num';
type MenuKey = 'year' | 'month' | 'method' | 'kind' | 'sort';

const TABS: [Tab, string][] = [
  ['all', 'Toutes'],
  ['draft', 'Brouillons'],
  ['issued', 'En attente'],
  ['paid', 'Payées'],
  ['refunded', 'Remboursées'],
  ['cancelled', 'Annulées'],
];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_NAMES = MONTHS.map((m) => m.charAt(0).toUpperCase() + m.slice(1));
const PER_PAGE = 5;
const LATE_DAYS = 15;

const SORTS: Record<SortKey, string> = {
  date_desc: 'Date d’émission, récentes d’abord',
  date_asc: 'Date d’émission, anciennes d’abord',
  amount_desc: 'Montant, du plus élevé',
  amount_asc: 'Montant, du plus faible',
  unpaid_first: 'Impayées d’abord, les plus anciennes',
  who: 'Consultant, de A à Z',
  num: 'Numéro de facture',
};

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

const yearOf = (i: ConsultationInvoice) => (i.date_emission ? new Date(i.date_emission).getFullYear() : null);
const monthOf = (i: ConsultationInvoice) => (i.date_emission ? new Date(i.date_emission).getMonth() : null);
const ord = (i: ConsultationInvoice) => (i.status === 'draft' || !i.date_emission ? Number.MAX_SAFE_INTEGER : new Date(i.date_emission).getTime());
const methodOf = (i: ConsultationInvoice): PaymentMethod | 'none' => i.payment_method ?? 'none';
const isLate = (i: ConsultationInvoice) => i.status === 'issued' && !i.is_avoir && daysSince(i.date_emission) >= LATE_DAYS;
const amountOf = (i: ConsultationInvoice) => Number(i.montant);

const SORT_FN: Record<SortKey, (a: ConsultationInvoice, b: ConsultationInvoice) => number> = {
  date_desc: (a, b) => ord(b) - ord(a),
  date_asc: (a, b) => ord(a) - ord(b),
  amount_desc: (a, b) => amountOf(b) - amountOf(a),
  amount_asc: (a, b) => amountOf(a) - amountOf(b),
  unpaid_first: (a, b) => {
    const w = (x: ConsultationInvoice) => (x.status === 'issued' ? 100000 + daysSince(x.date_emission) : 0);
    return w(b) - w(a) || ord(b) - ord(a);
  },
  who: (a, b) => consultantName(a).localeCompare(consultantName(b), 'fr'),
  num: (a, b) => (b.numero ?? '').localeCompare(a.numero ?? ''),
};

function FacturationInner() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const router = useRouter();
  const params = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const thisYear = String(now.getFullYear());

  const [token, setToken] = useState('');
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [settings, setSettings] = useState<PractitionerBillingSettings | null | undefined>(undefined);
  const [toBill, setToBill] = useState<ToBill[]>([]);
  const [lastReminded, setLastReminded] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<BillingTool | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [prevTool, setPrevTool] = useState<ExternalTool | null>(null);
  const [practitioner, setPractitioner] = useState<PractitionerName | undefined>(undefined);
  const [savedReminder, setSavedReminder] = useState<string | null>(null);

  // Filtres et tri
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [year, setYear] = useState<string>(thisYear);
  const [month, setMonth] = useState<string>('all');
  const [method, setMethod] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [late, setLate] = useState(false);
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<MenuKey | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(params.get('nouvelle') === '1');
  const [pick, setPick] = useState<string | null>(params.get('seance'));
  const [billOpen, setBillOpen] = useState(false);
  const [remindIds, setRemindIds] = useState<string[] | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token ?? '';
    setToken(t);
    try {
      const [list, st, bill, prac] = await Promise.all([
        fetch('/api/invoicing/list?limit=1000', { headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : { invoices: [] })),
        fetch('/api/invoicing/settings', { headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : { settings: null })),
        loadToBill(user.id).catch(() => [] as ToBill[]),
        supabase.from('practitioners').select('billing_tool, name, full_name').eq('id', user.id).maybeSingle(),
      ]);
      const invs = (list.invoices ?? []) as ConsultationInvoice[];
      setInvoices(invs);
      setSettings(st.settings ?? null);
      setSavedReminder((st.settings as { relance_manuelle_template?: string | null } | null)?.relance_manuelle_template ?? null);
      setToBill(bill);
      if (prac.error) {
        // Colonne billing_tool absente (migration 20261104 non appliquée) : on relit le nom seul.
        const { data: p } = await supabase.from('practitioners').select('name, full_name').eq('id', user.id).maybeSingle();
        setPractitioner(practitionerNameParts(p?.name || p?.full_name));
      } else {
        setPractitioner(practitionerNameParts(prac.data?.name || prac.data?.full_name));
        setTool(isBillingTool(prac.data?.billing_tool) ? prac.data.billing_tool : null);
      }
      const issuedIds = invs.filter((i) => i.status === 'issued').map((i) => i.id);
      if (issuedIds.length) {
        const { data: hist } = await supabase
          .from('invoice_history')
          .select('invoice_id, created_at')
          .in('invoice_id', issuedIds)
          .eq('action', 'reminder_sent')
          .order('created_at', { ascending: true });
        const m: Record<string, string> = {};
        ((hist ?? []) as { invoice_id: string; created_at: string }[]).forEach((h) => (m[h.invoice_id] = h.created_at));
        setLastReminded(m);
      }
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

  useEffect(() => setPage(1), [tab, q, year, month, method, kind, sort, late]);

  async function chooseTool(next: BillingTool) {
    if (!user) return;
    if (tool && tool !== 'afeia') setPrevTool(tool);
    setTool(next);
    setSetupOpen(false);
    const { error } = await supabase.from('practitioners').update({ billing_tool: next }).eq('id', user.id);
    if (error) showToast.error('Votre choix n’a pas pu être enregistré : il sera redemandé à la prochaine visite.');
    else if (next !== 'afeia') showToast.success('C’est noté : vous continuez avec votre outil.');
  }

  // ----- Calculs de la liste (Afeia) -----
  const term = q.trim().toLowerCase();
  const inYear = useCallback((i: ConsultationInvoice) => year === 'all' || i.status === 'draft' || String(yearOf(i)) === year, [year]);
  const pass = useCallback(
    (i: ConsultationInvoice, skip?: 'tab' | 'year' | 'month' | 'method' | 'kind') =>
      (skip === 'tab' || tab === 'all' || i.status === tab) &&
      (skip === 'year' || inYear(i)) &&
      (skip === 'month' || month === 'all' || monthOf(i) === Number(month)) &&
      (skip === 'method' || method === 'all' || methodOf(i) === method) &&
      (skip === 'kind' || kind === 'all' || kindOf(i.description) === kind) &&
      (!late || isLate(i)) &&
      (!term || `${consultantName(i)} ${i.numero ?? ''} ${i.consultant_snapshot?.email ?? ''}`.toLowerCase().includes(term)),
    [tab, inYear, month, method, kind, late, term]
  );
  const shown = useMemo(() => invoices.filter((i) => pass(i)).sort(SORT_FN[sort]), [invoices, pass, sort]);
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const curPage = Math.min(page, pageCount);
  const pageRows = shown.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const years = useMemo(() => {
    const s = new Set<number>([now.getFullYear()]);
    invoices.forEach((i) => {
      const y = yearOf(i);
      if (y) s.add(y);
    });
    return [...s].sort((a, b) => b - a);
  }, [invoices, now]);

  const count = (skip: 'tab' | 'year' | 'month' | 'method' | 'kind', test: (i: ConsultationInvoice) => boolean) => invoices.filter((i) => pass(i, skip) && test(i)).length;

  const filters: { key: MenuKey; label: string; value: string; options: FilterOption[]; set: (k: string) => void }[] = [
    {
      key: 'year',
      label: 'Année',
      value: year,
      options: [{ k: 'all', l: 'Toutes', n: count('year', () => true) }, ...years.map((y) => ({ k: String(y), l: String(y), n: count('year', (i) => yearOf(i) === y) }))],
      set: setYear,
    },
    {
      key: 'month',
      label: 'Mois',
      value: month,
      options: [{ k: 'all', l: 'Tous' }, ...MONTH_NAMES.map((m, i) => ({ k: String(i), l: m, n: count('month', (x) => monthOf(x) === i) }))],
      set: setMonth,
    },
    {
      key: 'method',
      label: 'Moyen de paiement',
      value: method,
      options: [
        { k: 'all', l: 'Tous' },
        ...(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => ({ k: m, l: METHOD_LABELS[m], n: count('method', (x) => methodOf(x) === m) })),
        { k: 'none', l: 'Pas encore réglée', n: count('method', (x) => methodOf(x) === 'none') },
      ],
      set: setMethod,
    },
    {
      key: 'kind',
      label: 'Type de séance',
      value: kind,
      options: [{ k: 'all', l: 'Tous' }, ...(Object.keys(KIND_LABELS) as SessionKind[]).map((k) => ({ k, l: KIND_LABELS[k], n: count('kind', (x) => kindOf(x.description) === k) }))],
      set: setKind,
    },
    { key: 'sort', label: 'Trier par', value: sort, options: (Object.keys(SORTS) as SortKey[]).map((k) => ({ k, l: SORTS[k] })), set: (k) => setSort(k as SortKey) },
  ];

  const resetFilters = () => {
    setTab('all');
    setYear(thisYear);
    setMonth('all');
    setMethod('all');
    setKind('all');
    setLate(false);
    setQ('');
    setSort('date_desc');
  };
  const hasActive = tab !== 'all' || year !== thisYear || month !== 'all' || method !== 'all' || kind !== 'all' || late || !!term || sort !== 'date_desc';
  const chips = [
    tab !== 'all' && { l: STATUS_UI[tab as InvoiceStatus].l, clear: () => setTab('all') },
    year !== thisYear && { l: year === 'all' ? 'Toutes les années' : `Année ${year}`, clear: () => setYear(thisYear) },
    month !== 'all' && { l: MONTH_NAMES[Number(month)], clear: () => setMonth('all') },
    method !== 'all' && { l: method === 'none' ? 'Pas encore réglée' : METHOD_LABELS[method as PaymentMethod], clear: () => setMethod('all') },
    kind !== 'all' && { l: KIND_LABELS[kind as SessionKind], clear: () => setKind('all') },
    late && { l: 'En retard', clear: () => setLate(false) },
    term && { l: `« ${q.trim()} »`, clear: () => setQ('') },
  ].filter(Boolean) as { l: string; clear: () => void }[];

  const billed = shown.filter((i) => i.status !== 'cancelled' && i.status !== 'draft' && !i.is_avoir).reduce((s, i) => s + amountOf(i), 0);
  const cashed = shown.filter((i) => i.status === 'paid' && !i.is_avoir).reduce((s, i) => s + amountOf(i), 0);
  const resultLine = `${shown.length} facture${shown.length > 1 ? 's' : ''} · ${eur(billed)} facturés · dont ${eur(cashed)} encaissés`;

  // ----- Suivi des factures -----
  const unpaid = invoices.filter((i) => i.status === 'issued' && !i.is_avoir).sort((a, b) => ord(a) - ord(b));
  const urssaf = urssafQuarter(invoices, now);

  // ----- Indicateurs (année filtrée) -----
  const kpis = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid' && !i.is_avoir && i.payment_date);
    const pd = (i: ConsultationInvoice) => new Date(i.payment_date as string);
    const paidYear = paid.filter((i) => year === 'all' || String(pd(i).getFullYear()) === year);
    const sum = (xs: ConsultationInvoice[]) => xs.reduce((s, i) => s + amountOf(i), 0);
    const yearWord = year === 'all' ? 'depuis vos débuts' : `en ${year}`;
    let first: { l: string; v: string; s: string };
    if (year === thisYear) {
      const inMonth = (i: ConsultationInvoice, y: number, m: number) => pd(i).getFullYear() === y && pd(i).getMonth() === m;
      const cur = sum(paid.filter((i) => inMonth(i, now.getFullYear(), now.getMonth())));
      const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prev = sum(paid.filter((i) => inMonth(i, p.getFullYear(), p.getMonth())));
      const evol = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
      first = {
        l: `Encaissé en ${MONTHS[now.getMonth()]}`,
        v: eur(cur),
        s: evol === null ? `Rien d’encaissé en ${MONTHS[p.getMonth()]}` : `${evol >= 0 ? '+' : '−'}${Math.abs(evol)} % par rapport à ${MONTHS[p.getMonth()]}`,
      };
    } else {
      const byMonth = new Map<string, number>();
      paidYear.forEach((i) => {
        const k = `${pd(i).getFullYear()}-${pd(i).getMonth()}`;
        byMonth.set(k, (byMonth.get(k) ?? 0) + amountOf(i));
      });
      const best = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
      const [by, bm] = best ? best[0].split('-').map(Number) : [0, 0];
      first = {
        l: year === 'all' ? 'Meilleur mois' : `Meilleur mois de ${year}`,
        v: best ? eur(best[1]) : '—',
        s: best ? `en ${MONTHS[bm]}${year === 'all' ? ` ${by}` : ''}` : 'Aucun encaissement sur la période',
      };
    }
    const pending = invoices.filter((i) => i.status === 'issued' && !i.is_avoir && inYear(i));
    return [
      { ...first, c: '#E8EDF4' },
      { l: `Encaissé ${yearWord}`, v: eur(sum(paidYear)), s: `${paidYear.length} facture${paidYear.length > 1 ? 's' : ''} payée${paidYear.length > 1 ? 's' : ''}`, c: '#E8EDF4' },
      { l: 'En attente de paiement', v: eur(sum(pending)), s: `${pending.length} facture${pending.length > 1 ? 's' : ''} émise${pending.length > 1 ? 's' : ''}`, c: pending.length ? '#E8A87C' : '#E8EDF4' },
      { l: 'Panier moyen', v: paidYear.length ? eur(Math.round(sum(paidYear) / paidYear.length)) : '—', s: `par séance facturée ${yearWord}`, c: '#E8EDF4' },
    ];
  }, [invoices, year, thisYear, now, inYear]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const documentType = (settings?.libelle_document ?? 'facture') as InvoiceDocumentType;
  const signature = [practitioner?.prenom, practitioner?.nom].filter(Boolean).join(' ');
  const defaultRemText = defaultReminderText(signature);
  const configured = !!settings;
  // Les exports existants couvrent l'année civile en cours.
  const period = thisYear;

  // ===== Écran de choix =====
  if (!tool || setupOpen) {
    return (
      <div className="flex max-w-[1180px] flex-col gap-5">
        <Toaster />
        <BillingSetup current={tool && tool !== 'afeia' ? tool : prevTool} onChoose={chooseTool} />
        {setupOpen && tool && (
          <button type="button" onClick={() => setSetupOpen(false)} className="h-10 self-start text-sm text-sage">← Garder le mode actuel</button>
        )}
      </div>
    );
  }

  // ===== Outil externe =====
  if (tool !== 'afeia') {
    return (
      <div className="flex max-w-[1180px] flex-col gap-5">
        <Toaster />
        <ExternalToolView
          tool={tool}
          toBill={toBill}
          practitionerId={user.id}
          onChangeMode={() => setSetupOpen(true)}
          onChooseAfeia={() => void chooseTool('afeia')}
          onMarked={(id) => setToBill((xs) => xs.filter((x) => x.appointmentId !== id))}
        />
      </div>
    );
  }

  // ===== Facturation Afeia =====
  const toolbarBtn = 'h-11 rounded-[10px] border border-divider px-3.5 text-sm text-[#B8C1CF] hover:border-sage';

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
                      await download('/api/invoicing/export/csv?period=year', token, `factures_${period}.csv`);
                    } catch {
                      showToast.error('L’export CSV a échoué.');
                    }
                  }}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-charcoal hover:bg-surface"
                >
                  <span className="text-sm">Tableau (CSV) · {period}</span>
                  <span className="text-xs text-stone">Pour votre comptable ou un tableur</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setExportOpen(false);
                    try {
                      await download('/api/invoicing/export/pdf-summary?period=year', token, `recapitulatif_${period}.pdf`);
                    } catch {
                      showToast.error('L’export PDF a échoué.');
                    }
                  }}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-charcoal hover:bg-surface"
                >
                  <span className="text-sm">Récapitulatif (PDF)</span>
                  <span className="text-xs text-stone">Total de l’année {period}, prêt à archiver</span>
                </button>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => setSetupOpen(true)} className={toolbarBtn}>Changer de mode</button>
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

      <div role="note" className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#4E3A55] bg-[#2B2230] px-4 py-3">
        <DevBadge strong />
        <span className="flex-[1_1_320px] text-[13px] leading-normal text-[#E2CDEB]">
          Vous découvrez la facturation Afeia. Certaines fonctions sont encore en test et peuvent évoluer : gardez votre outil actuel pour vos factures officielles en attendant.
        </span>
        <button type="button" onClick={() => setSetupOpen(true)} className="h-[34px] rounded-lg border border-[#4E3A55] px-3 text-[13px] text-[#E2CDEB]">Revenir à mon outil</button>
      </div>

      {!configured && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-divider bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold text-charcoal">Configurez votre facturation</h2>
          <p className="max-w-md text-sm text-stone">Renseignez votre SIRET et votre adresse de facturation pour émettre vos premières factures.</p>
          <Link href="/settings/facturation" className="inline-flex h-11 items-center rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink">Configurer</Link>
        </div>
      )}

      {configured && (
        <>
          {/* Filtres et tri */}
          <section aria-label="Filtres et tri" className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex h-[42px] flex-[1_1_280px] items-center gap-2 rounded-[10px] border border-divider bg-cream px-3 text-stone focus-within:border-sage">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Rechercher</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Consultant, n° de facture ou e-mail" className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-mist" />
              </label>
              <div role="tablist" aria-label="Statut de paiement" className="flex flex-wrap gap-1 rounded-xl border border-divider bg-cream p-1">
                {TABS.map(([k, l]) => {
                  const on = tab === k;
                  const n = count('tab', (i) => k === 'all' || i.status === k);
                  return (
                    <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)} className={`h-[34px] rounded-lg px-3 text-[13px] font-medium ${on ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}>
                      {l} <span className="text-stone">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <FilterMenu
                  key={f.key}
                  label={f.label}
                  value={f.value}
                  options={f.options}
                  open={menu === f.key}
                  onToggle={(o) => setMenu(o ? f.key : null)}
                  onPick={f.set}
                />
              ))}
              <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[13px] text-charcoal" style={{ borderColor: late ? '#5A4636' : '#2A3140' }}>
                <input type="checkbox" checked={late} onChange={() => setLate((v) => !v)} className="h-4 w-4 accent-[#E8A87C]" />
                En retard de paiement (+{LATE_DAYS} jours)
              </label>
              <span className="flex-1" />
              {hasActive && (
                <button type="button" onClick={resetFilters} className="h-[38px] px-3 text-[13px] text-sage">Réinitialiser les filtres</button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-2.5">
              <span role="status" className="text-[13px] text-[#B8C1CF]">{resultLine}</span>
              {chips.map((c) => (
                <button
                  key={c.l}
                  type="button"
                  onClick={c.clear}
                  aria-label={`Retirer le filtre ${c.l}`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#2F5A50] bg-sage-light px-2.5 text-xs text-[#CFEFE5]"
                >
                  {c.l} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </section>

          {/* Tableau */}
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
                {pageRows.map((i) => {
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
                      <td className="px-2 py-3 text-right font-medium tabular-nums text-charcoal">{eur(amountOf(i))}</td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{i.payment_method ? METHOD_LABELS[i.payment_method] : '—'}</td>
                      <td className="py-3 pl-2 pr-[18px]">
                        <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>{s.l}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="p-7 text-center text-sm text-stone">{invoices.length ? 'Aucune facture ne correspond à ces filtres.' : 'Aucune facture pour l’instant.'}</p>
            )}
            {shown.length > PER_PAGE && (
              <nav aria-label="Pages de factures" className="flex flex-wrap items-center gap-2 border-t border-divider px-[18px] py-3">
                <span className="flex-[1_1_160px] text-[13px] text-stone">
                  {(curPage - 1) * PER_PAGE + 1}–{Math.min(curPage * PER_PAGE, shown.length)} sur {shown.length} factures
                </span>
                <button type="button" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} className="h-[34px] rounded-lg border border-divider px-3 text-[13px] text-charcoal disabled:text-mist">
                  ← Précédent
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                  const on = p === curPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={on ? 'page' : undefined}
                      aria-label={`Page ${p}`}
                      className="h-[34px] w-[34px] rounded-lg border text-[13px] font-semibold tabular-nums"
                      style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#23383B' : 'transparent', color: on ? '#6DD4B8' : '#B8C1CF' }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button type="button" disabled={curPage >= pageCount} onClick={() => setPage(curPage + 1)} className="h-[34px] rounded-lg border border-divider px-3 text-[13px] text-charcoal disabled:text-mist">
                  Suivant →
                </button>
              </nav>
            )}
          </div>

          {/* Suivi des factures : à facturer, URSSAF, impayés */}
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-[2_1_380px] flex-wrap items-center gap-3 rounded-[14px] border border-[#5A4636] bg-terracotta-light px-[18px] py-4">
              <span className="flex flex-[1_1_240px] flex-col gap-[3px]">
                <span className="text-[15px] font-semibold text-[#F2D2BB]">
                  {toBill.length === 0
                    ? '✓ Toutes vos séances terminées sont facturées'
                    : `${toBill.length} séance${toBill.length > 1 ? 's' : ''} terminée${toBill.length > 1 ? 's' : ''} sans facture`}
                </span>
                <span className="text-[13px] text-[#D9B9A2]">
                  {toBill.length
                    ? `${toBill.slice(0, 4).map((t) => `${t.who.split(' ')[0]} (${t.date})`).join(', ')}${toBill.length > 4 ? '…' : ''}`
                    : 'Les prochaines apparaîtront ici après chaque séance.'}
                </span>
              </span>
              {toBill.length > 0 && (
                <button type="button" onClick={() => setBillOpen(true)} aria-haspopup="dialog" className="h-10 rounded-[10px] bg-terracotta px-3.5 text-sm font-semibold text-ink">
                  Facturer
                </button>
              )}
            </div>
            <div className="flex flex-[1_1_260px] flex-col gap-[3px] rounded-[14px] border border-[#2E3A60] bg-[#1F2640] px-[18px] py-4">
              <span className="text-[13px] text-[#A9B8EC]">À déclarer à l’URSSAF · {urssaf.label}</span>
              <span className="font-serif text-2xl text-[#D4DCF6]">{eur(urssaf.total)}</span>
              <span className="text-xs text-[#9AA8D6]">Encaissé depuis le {urssaf.since} · déclaration avant le {urssaf.deadline}</span>
            </div>
          </div>

          {unpaid.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#4E3A55] bg-[#2B2230] px-[18px] py-4">
              <span className="flex flex-[1_1_280px] flex-col gap-[3px]">
                <span className="text-[15px] font-semibold text-[#EBD5F2]">
                  {unpaid.length} facture{unpaid.length > 1 ? 's' : ''} impayée{unpaid.length > 1 ? 's' : ''} · {eur(unpaid.reduce((s, i) => s + amountOf(i), 0))}
                </span>
                <span className="text-[13px] text-[#CDB6D6]">
                  {unpaid
                    .slice(0, 5)
                    .map((i) => `${consultantName(i).split(' ')[0]} (émise ${ageLabel(daysSince(i.date_emission))}${lastReminded[i.id] ? ', déjà relancé' : ''})`)
                    .join(', ')}
                  {unpaid.length > 5 ? '…' : ''}
                </span>
              </span>
              <button type="button" onClick={() => setRemindIds(unpaid.map((i) => i.id))} aria-haspopup="dialog" className="h-10 rounded-[10px] bg-[#D9B8E8] px-3.5 text-sm font-semibold text-ink">
                Relancer
              </button>
            </div>
          )}

          {/* Indicateurs */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {kpis.map((k) => (
              <div key={k.l} className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-surface p-[18px]">
                <span className="text-[13px] text-stone">{k.l}</span>
                <span className="font-serif text-[30px] tabular-nums" style={{ color: k.c }}>{k.v}</span>
                <span className="text-xs text-stone">{k.s}</span>
              </div>
            ))}
          </div>

          <NewInvoiceModal
            open={newOpen}
            onClose={() => setNewOpen(false)}
            practitionerId={user.id}
            authToken={token}
            toBill={toBill}
            initialPick={pick}
            practitionerName={practitioner}
            documentType={documentType}
            onCreated={(inv) => {
              void load();
              router.push(`/facturation/${inv.id}`);
            }}
          />
          <BillSessionsModal
            open={billOpen}
            onClose={() => setBillOpen(false)}
            toBill={toBill}
            authToken={token}
            practitionerName={practitioner}
            documentType={documentType}
            onEdit={(id) => {
              setBillOpen(false);
              setPick(id);
              setNewOpen(true);
            }}
            onDone={() => void load()}
          />
          <RemindModal
            open={remindIds !== null}
            onClose={() => setRemindIds(null)}
            unpaid={unpaid}
            initialIds={remindIds ?? []}
            lastReminded={lastReminded}
            authToken={token}
            savedText={savedReminder || defaultRemText}
            defaultText={defaultRemText}
            onSent={(text, saved) => {
              if (saved) setSavedReminder(text);
              void load();
            }}
          />
        </>
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
