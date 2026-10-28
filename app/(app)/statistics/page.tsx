'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePractitionerStats } from '@/hooks/usePractitionerStats';
import { supabase } from '@/lib/supabase';
import { eur, urssafQuarter } from '@/lib/invoicing/display';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

type Period = 'mois' | 'trimestre' | 'annee' | 'douze';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MON = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOTIF_COLORS = ['#E8A87C', '#7B93DB', '#E8C46B', '#A9B8EC', '#E8A5C6', '#F0B8A0'];

function ranges(p: Period, now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case 'mois':
      return {
        cur: { start: new Date(y, m, 1), end: now },
        prev: { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) },
        sentence: `${MONTHS[m].charAt(0).toUpperCase()}${MONTHS[m].slice(1)} ${y}, comparé à ${MONTHS[(m + 11) % 12]}.`,
      };
    case 'trimestre': {
      const q = Math.floor(m / 3);
      return {
        cur: { start: new Date(y, q * 3, 1), end: now },
        prev: { start: new Date(y, q * 3 - 3, 1), end: new Date(y, q * 3, 0, 23, 59, 59) },
        sentence: `Depuis le 1er ${MONTHS[q * 3]}, comparé au trimestre précédent.`,
      };
    }
    case 'annee':
      return {
        cur: { start: new Date(y, 0, 1), end: now },
        prev: { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59) },
        sentence: `Depuis le 1er janvier, comparé à ${y - 1}.`,
      };
    default:
      return {
        cur: { start: new Date(y - 1, m, now.getDate()), end: now },
        prev: { start: new Date(y - 2, m, now.getDate()), end: new Date(y - 1, m, now.getDate()) },
        sentence: 'Les 12 derniers mois glissants.',
      };
  }
}

function delta(cur: number, prev: number, unit = '') {
  const d = Math.round(cur - prev);
  if (d === 0) return { d: unit ? `= ${unit}`.trim() : '=', neg: false };
  return { d: `${d > 0 ? '+' : '−'}${Math.abs(d)}${unit ? ` ${unit}` : ''}`, neg: d < 0 };
}

function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

export default function StatisticsPage() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [period, setPeriod] = useState<Period>('mois');
  const now = useMemo(() => new Date(), []);
  const r = useMemo(() => ranges(period, now), [period, now]);
  const { stats, loading } = usePractitionerStats(r.cur);
  const { stats: prev } = usePractitionerStats(r.prev);

  const [weeks, setWeeks] = useState<{ v: number; l: string }[]>([]);
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);

  useEffect(() => {
    if (!user) return;
    const firstWeek = startOfWeek(new Date(now.getTime() - 11 * 7 * 86400000));
    supabase
      .from('appointments')
      .select('starts_at, status')
      .eq('practitioner_id', user.id)
      .gte('starts_at', firstWeek.toISOString())
      .lte('starts_at', now.toISOString())
      .not('status', 'in', '("cancelled","rescheduled")')
      .then(({ data }) => {
        const counts = Array.from({ length: 12 }, () => 0);
        ((data ?? []) as { starts_at: string }[]).forEach((a) => {
          const i = Math.floor((startOfWeek(new Date(a.starts_at)).getTime() - firstWeek.getTime()) / (7 * 86400000));
          if (i >= 0 && i < 12) counts[i] += 1;
        });
        setWeeks(counts.map((v, i) => ({ v, l: i === 11 ? 'cette sem.' : `S${isoWeek(new Date(firstWeek.getTime() + i * 7 * 86400000))}` })));
      });
    (async () => {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/invoicing/list?limit=2000', { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
      if (res.ok) setInvoices(((await res.json()).invoices ?? []) as ConsultationInvoice[]);
    })();
  }, [user, now]);

  // CA encaissé par mois, 12 derniers mois
  const ca = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
    const vals = months.map((m) =>
      invoices
        .filter((inv) => inv.payment_date && (inv.status === 'paid' || inv.status === 'refunded'))
        .filter((inv) => {
          const d = new Date(inv.payment_date as string);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        })
        .reduce((s, inv) => s + Number(inv.montant), 0)
    );
    return { vals, labels: months.map((m) => MON[m.getMonth()]) };
  }, [invoices, now]);

  const caPeriod = useMemo(() => {
    const paid = invoices.filter((inv) => inv.payment_date && inv.status === 'paid' && new Date(inv.payment_date) >= r.cur.start && new Date(inv.payment_date) <= r.cur.end);
    const total = paid.reduce((s, inv) => s + Number(inv.montant), 0);
    return { total, count: paid.length, avg: paid.length ? Math.round(total / paid.length) : 0 };
  }, [invoices, r]);
  const urssaf = urssafQuarter(invoices, now);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activity = [
    { l: 'Séances réalisées', v: String(stats.sessionsCount), s: 'Hors séances annulées', ...delta(stats.sessionsCount, prev.sessionsCount) },
    { l: 'Nouveaux consultants', v: String(stats.newConsultants), s: 'Arrivés sur la période', ...delta(stats.newConsultants, prev.newConsultants) },
    { l: 'Consultants actifs', v: String(stats.activeConsultants), s: 'Séance, message ou journal sur la période', ...delta(stats.activeConsultants, prev.activeConsultants) },
    { l: 'Fidélisation', v: stats.totalConsultants ? `${Math.round(stats.retentionRate)} %` : '—', s: 'Consultants venus au moins deux fois', ...delta(stats.retentionRate, prev.retentionRate, 'pts') },
  ];

  // Séances par semaine
  const maxW = Math.max(4, ...weeks.map((w) => w.v));
  const avg = weeks.length ? weeks.reduce((s, w) => s + w.v, 0) / weeks.length : 0;
  const yW = (v: number) => 176 - (v / maxW) * 150;

  // CA 12 mois
  const maxC = Math.max(100, ...ca.vals) * 1.12;
  const x0 = 40;
  const step = (880 - x0) / 11;
  const xC = (i: number) => Math.round(x0 + i * step);
  const yC = (v: number) => Math.round(190 - (v / maxC) * 170);
  const line = ca.vals.map((v, i) => `${i ? 'L' : 'M'}${xC(i)} ${yC(v)}`).join(' ');

  const motifs = stats.topConcerns.slice(0, 6);
  const mmax = motifs[0]?.count ?? 1;
  const sharedPct = stats.carePlansCount ? Math.round((stats.carePlansShared / stats.carePlansCount) * 100) : null;
  const observance = stats.avgObservanceRate === 0 && stats.lowObservanceConsultants.length === 0 ? null : stats.avgObservanceRate;
  const engage = [
    { l: 'Conseillanciers créés', v: String(stats.carePlansCount), s: `Dont ${stats.carePlansShared} partagé${stats.carePlansShared > 1 ? 's' : ''} avec le consultant`, w: null as number | null, c: '' },
    { l: 'Partagés', v: sharedPct === null ? '—' : `${sharedPct} %`, s: 'Des conseillanciers créés', w: sharedPct, c: '#6DD4B8' },
    { l: 'Journaux remplis', v: stats.totalConsultants ? `${Math.round(stats.avgJournalFillRate)} %` : '—', s: 'Consultants ayant écrit dans leur journal ces 7 derniers jours', w: stats.totalConsultants ? stats.avgJournalFillRate : null, c: '#7B93DB' },
    { l: 'Recommandations suivies', v: observance === null ? '—' : `${observance} %`, s: 'D’après les cases cochées dans l’app, 7 derniers jours', w: observance, c: '#E8A87C' },
  ];

  const h2 = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-stone';
  const card = 'rounded-2xl border border-divider bg-surface';

  return (
    <div className={`flex max-w-[1180px] flex-col gap-6 pb-10 ${loading ? 'opacity-80' : ''}`}>
      <section className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="font-serif text-[36px] font-medium text-charcoal">Statistiques</h1>
          <p className="text-[15px] text-stone">{r.sentence}</p>
        </div>
        <div role="group" aria-label="Période" className="flex gap-1 rounded-xl border border-divider bg-surface p-1">
          {([['mois', 'Ce mois'], ['trimestre', 'Trimestre'], ['annee', 'Année'], ['douze', '12 mois']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)} className={`h-9 rounded-[9px] px-3.5 text-sm font-medium ${period === k ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={h2}>Activité</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {activity.map((k) => (
            <div key={k.l} className={`flex flex-col gap-2 p-[18px] ${card}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-stone">{k.l}</span>
                <span className="inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold" style={k.neg ? { background: '#373131', color: '#E8A87C' } : { background: '#23383B', color: '#6DD4B8' }}>
                  {k.d}
                </span>
              </div>
              <span className="font-serif text-[34px] tabular-nums text-charcoal">{k.v}</span>
              <span className="text-xs text-stone">{k.s}</span>
            </div>
          ))}
        </div>
        <div className={`flex flex-col gap-3 p-5 ${card}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-charcoal">Séances par semaine</h3>
            <span className="text-[13px] text-stone">12 dernières semaines · moyenne {avg.toFixed(1).replace('.', ',')} / semaine</span>
          </div>
          <svg viewBox="0 0 900 200" width="100%" role="img" aria-label={`Séances par semaine sur 12 semaines, moyenne ${avg.toFixed(1).replace('.', ',')}`} className="block overflow-visible">
            <line x1="30" y1={Math.round(yW(avg))} x2="900" y2={Math.round(yW(avg))} stroke="#8B95A5" strokeDasharray="4 4" />
            {weeks.map((w, i) => (
              <g key={i}>
                <rect x={50 + i * 72} y={Math.round(yW(w.v))} width="48" height={Math.max(0, Math.round(176 - yW(w.v)))} rx="6" fill={i === 11 ? '#6DD4B8' : '#2F5A50'} />
                <text x={74 + i * 72} y={Math.round(yW(w.v)) - 6} textAnchor="middle" fill="#E8EDF4" fontSize="12">{w.v}</text>
                <text x={74 + i * 72} y="196" textAnchor="middle" fill="#8B95A5" fontSize="11">{w.l}</text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={h2}>Financier</h2>
        <div className="flex flex-wrap gap-3">
          <div className={`flex flex-[3_1_520px] flex-col gap-3 p-5 ${card}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-charcoal">Chiffre d’affaires encaissé</h3>
              <span className="text-[13px] text-stone">12 derniers mois</span>
            </div>
            <svg viewBox="0 0 900 220" width="100%" role="img" aria-label="Chiffre d’affaires mensuel sur 12 mois" className="block overflow-visible">
              <path d={`${line} L${xC(11)} 190 L${xC(0)} 190 Z`} fill="#6DD4B8" opacity="0.12" />
              <path d={line} fill="none" stroke="#6DD4B8" strokeWidth="2.5" strokeLinejoin="round" />
              {ca.vals.map((v, i) => (
                <g key={i}>
                  <circle cx={xC(i)} cy={yC(v)} r={i === 11 ? 5 : 3} fill={i === 11 ? '#6DD4B8' : '#3E7D6D'}>
                    <title>{`${ca.labels[i]} : ${eur(v)}`}</title>
                  </circle>
                  <text x={xC(i)} y="214" textAnchor="middle" fill="#8B95A5" fontSize="11">{ca.labels[i]}</text>
                </g>
              ))}
              <text x={xC(11) - 10} y={yC(ca.vals[11]) - 12} textAnchor="end" fill="#E8EDF4" fontSize="13" fontWeight="600">{eur(ca.vals[11])}</text>
            </svg>
          </div>
          <div className="flex flex-[1_1_260px] flex-col gap-3">
            <div className={`flex flex-col gap-1.5 p-[18px] ${card}`}>
              <span className="text-[13px] text-stone">CA sur la période</span>
              <span className="font-serif text-[34px] text-charcoal">{eur(caPeriod.total)}</span>
              <span className="text-xs text-stone">
                {caPeriod.count} facture{caPeriod.count > 1 ? 's' : ''} payée{caPeriod.count > 1 ? 's' : ''}{caPeriod.count ? ` · panier moyen ${eur(caPeriod.avg)}` : ''}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl border border-[#2E3A60] bg-[#1F2640] p-[18px]">
              <span className="text-[13px] text-[#A9B8EC]">À déclarer à l’URSSAF · trimestre en cours</span>
              <span className="font-serif text-[28px] text-[#D4DCF6]">{eur(urssaf.total)}</span>
              <span className="text-xs text-[#9AA8D6]">Montant encaissé depuis le {urssaf.since}. Rappel, pas une déclaration.</span>
            </div>
            <Link href="/facturation" className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-divider text-sm text-charcoal hover:border-sage">
              Voir la facturation →
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={h2}>Accompagnement</h2>
        <div className="flex flex-wrap gap-3">
          <div className={`flex flex-[1_1_340px] flex-col gap-3.5 p-5 ${card}`}>
            <h3 className="text-base font-semibold text-charcoal">Motifs de consultation</h3>
            {motifs.length === 0 && <span className="text-sm text-stone">Les motifs apparaissent quand ils sont renseignés dans les dossiers.</span>}
            {motifs.map((m, i) => (
              <div key={m.concern} className="flex flex-col gap-[5px]">
                <div className="flex justify-between text-sm text-charcoal">
                  <span>{m.concern.charAt(0).toUpperCase() + m.concern.slice(1)}</span>
                  <span className="tabular-nums text-stone">{m.count}</span>
                </div>
                <span className="h-2 overflow-hidden rounded bg-surface-raised">
                  <span className="block h-full rounded" style={{ width: `${Math.round((m.count / mmax) * 100)}%`, background: MOTIF_COLORS[i] }} />
                </span>
              </div>
            ))}
          </div>
          <div className="grid flex-[1_1_340px] grid-cols-2 gap-3">
            {engage.map((e) => (
              <div key={e.l} className={`flex flex-col gap-2 p-[18px] ${card}`}>
                <span className="text-[13px] text-stone">{e.l}</span>
                <span className="font-serif text-[30px] text-charcoal">{e.v}</span>
                {e.w !== null && (
                  <span className="h-1.5 overflow-hidden rounded-[3px] bg-surface-raised">
                    <span className="block h-full" style={{ width: `${Math.min(100, Math.round(e.w))}%`, background: e.c }} />
                  </span>
                )}
                <span className="text-xs leading-[1.45] text-stone">{e.s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-xs text-mist">Indicateurs d’activité et de suivi, non médicaux.</p>
    </div>
  );
}
