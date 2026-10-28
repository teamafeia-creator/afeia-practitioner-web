'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Plus } from 'lucide-react';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getTodayAppointments } from '@/lib/queries/appointments';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePractitionerStats } from '@/hooks/usePractitionerStats';
import { useMorningReview } from '@/hooks/useMorningReview';
import { useReviewActivity } from '@/hooks/useReviewActivity';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { getPeriodRange, type PeriodKey } from '@/lib/types/stats';
import { fetchDashboardExtraStats, type DashboardExtraStats } from '@/lib/dashboard/extraStats';
import { FACE_COLORS, displayName, getReviewQueue, initialsOf, reviewMinutes, reviewSentence } from '@/lib/morning-review/queue';
import { StatsCarousel, ICONS, type StatCategory, type PeriodOption } from '@/components/dashboard/StatsCarousel';
import type { Appointment } from '@/lib/types';

type ConsultantRow = { id: string; activated?: boolean | null };

const RECONTACT_DAYS = 30;

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const PERIODS: PeriodOption<PeriodKey>[] = [
  { key: 'this_week', label: 'Semaine', title: 'Cette semaine' },
  { key: 'this_month', label: 'Mois', title: 'Ce mois-ci' },
  { key: 'this_quarter', label: 'Trimestre', title: 'Ce trimestre' },
  { key: 'this_year', label: 'Année', title: 'Cette année' },
];

function appointmentName(a: Appointment): string {
  const p = a.patient;
  if (!p) return a.booking_name || 'Consultant';
  return p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Consultant';
}

function durationLabel(a: Appointment): string {
  const min = Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000);
  if (!Number.isFinite(min) || min <= 0) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)} %`);
const num = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));

function sleepLabel(h: number | null): string {
  if (h === null) return '—';
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const { stats, loading: statsLoading, reload } = usePractitionerStats(period);
  const { data: review } = useMorningReview();
  const { data: activity } = useReviewActivity();
  const { unreadCount } = useMessageNotifications();

  const [firstName, setFirstName] = useState('');
  const [today, setToday] = useState<Appointment[]>([]);
  const [consultantIds, setConsultantIds] = useState<string[]>([]);
  const [recontactCount, setRecontactCount] = useState(0);
  const [draftPlansCount, setDraftPlansCount] = useState(0);
  const [extra, setExtra] = useState<DashboardExtraStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user) return;
    try {
      const [{ data: practitioner }, todayApts, { data: consultants, error: consultantsError }, { count: drafts }] = await Promise.all([
        supabase.from('practitioners').select('name, full_name').eq('id', user.id).maybeSingle(),
        getTodayAppointments().catch(() => [] as Appointment[]),
        supabase.from('consultants').select('id, activated').eq('practitioner_id', user.id).is('deleted_at', null),
        supabase.from('consultant_plans').select('id', { count: 'exact', head: true }).eq('practitioner_id', user.id).eq('status', 'draft'),
      ]);

      const fullName = (practitioner?.name as string | null) ?? (practitioner?.full_name as string | null) ?? '';
      setFirstName(fullName.split(' ')[0] ?? '');
      setToday(todayApts);
      setDraftPlansCount(drafts ?? 0);
      if (consultantsError) showToast.error('Les consultants n’ont pas pu être chargés.');

      const list = (consultants ?? []) as ConsultantRow[];
      const ids = list.map((c) => c.id);
      setConsultantIds(ids);

      if (ids.length > 0) {
        // Dernier contact = dernière séance réalisée (agenda ou historique)
        const [{ data: apts }, { data: consults }] = await Promise.all([
          supabase.from('appointments').select('consultant_id, starts_at').in('consultant_id', ids).eq('status', 'completed'),
          supabase.from('consultations').select('consultant_id, date').in('consultant_id', ids),
        ]);
        const last = new Map<string, number>();
        const bump = (id: string | null, d: string | null) => {
          if (!id || !d) return;
          const t = new Date(d).getTime();
          if (t > (last.get(id) ?? 0)) last.set(id, t);
        };
        (apts ?? []).forEach((a: { consultant_id: string; starts_at: string }) => bump(a.consultant_id, a.starts_at));
        (consults ?? []).forEach((c: { consultant_id: string; date: string }) => bump(c.consultant_id, c.date));
        const threshold = Date.now() - RECONTACT_DAYS * 86400000;
        setRecontactCount(list.filter((c) => c.activated !== false && (last.get(c.id) ?? 0) < threshold).length);
      } else {
        setRecontactCount(0);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        router.replace('/login');
      } else {
        showToast.error('Le tableau de bord n’a pas pu être chargé.');
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void load();
        reload();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, reload]);

  useEffect(() => {
    if (!user) return;
    const { start, end } = getPeriodRange(period);
    let cancelled = false;
    fetchDashboardExtraStats(user.id, consultantIds, start, end)
      .then((r) => !cancelled && setExtra(r))
      .catch(() => !cancelled && setExtra(null));
    return () => {
      cancelled = true;
    };
  }, [user, consultantIds, period]);

  const queue = useMemo(
    () => getReviewQueue(review?.consultantsSummary ?? [], new Set((activity?.today ?? []).map((a) => a.consultant_id))),
    [review, activity]
  );

  const categories: StatCategory[] = useMemo(() => {
    const hasConsultants = stats.totalConsultants > 0;
    const observance = stats.avgObservanceRate === 0 && stats.lowObservanceConsultants.length === 0 ? null : stats.avgObservanceRate;
    const activeRatio = hasConsultants ? Math.round((stats.activeConsultants / stats.totalConsultants) * 100) : null;
    const top = stats.topConcerns[0];
    const reviewRatio = extra && extra.reviewsDone !== null && extra.reviewDays > 0 ? Math.round((extra.reviewsDone / extra.reviewDays) * 100) : null;
    return [
      {
        label: 'Activité',
        tiles: [
          { label: 'Séances', value: num(stats.sessionsCount), icon: ICONS.cal, tone: 'mint', series: stats.sessionsByWeek.map((w) => w.count) },
          { label: 'Nouveaux consultants', value: num(stats.newConsultants), icon: ICONS.users, tone: 'mint' },
          {
            label: 'Actifs',
            value: hasConsultants ? `${stats.activeConsultants} / ${stats.totalConsultants}` : '—',
            pill: activeRatio !== null ? `${activeRatio} %` : undefined,
            icon: ICONS.pulse,
            tone: 'blue',
          },
          { label: 'Fidélisation', value: hasConsultants ? pct(stats.retentionRate) : '—', pill: 'au moins 2 séances', icon: ICONS.loop, tone: 'warm' },
          { label: 'Chiffre d’affaires', value: euro.format(stats.revenue ?? 0), icon: ICONS.cash, tone: 'mint', series: stats.revenueByMonth.map((m) => m.total) },
          { label: 'Remplissage du journal', value: hasConsultants ? pct(stats.avgJournalFillRate) : '—', pill: '7 derniers jours', icon: ICONS.book, tone: 'blue' },
        ],
      },
      {
        label: 'Accompagnement',
        tiles: [
          { label: 'Conseillanciers créés', value: num(stats.carePlansCount), icon: ICONS.doc, tone: 'mint' },
          { label: 'Conseillanciers partagés', value: num(stats.carePlansShared), icon: ICONS.share, tone: 'mint' },
          { label: 'Observance moyenne', value: pct(observance), pill: observance !== null ? '7 derniers jours' : undefined, icon: ICONS.check, tone: 'mint' },
          { label: 'Messages échangés', value: num(extra?.messagesCount), icon: ICONS.msg, tone: 'blue' },
          { label: 'Questionnaires reçus', value: num(extra?.questionnairesCount), icon: ICONS.list, tone: 'blue' },
          {
            label: 'Motif n° 1',
            value: top ? capitalize(top.concern) : '—',
            pill: top ? `${top.count} consultant${top.count > 1 ? 's' : ''}` : undefined,
            icon: ICONS.moon,
            tone: 'pink',
          },
        ],
      },
      {
        label: 'Bien-être des consultants',
        tiles: [
          {
            label: 'Avec objet connecté',
            value: extra?.wearableConsultants != null && hasConsultants ? `${extra.wearableConsultants} / ${stats.totalConsultants}` : '—',
            icon: ICONS.ring,
            tone: 'blue',
          },
          { label: 'Sommeil moyen', value: sleepLabel(extra?.avgSleepHours ?? null), icon: ICONS.moon, tone: 'blue' },
          { label: 'VFC nocturne moyenne', value: extra?.avgHrv != null ? `${Math.round(extra.avgHrv)} ms` : '—', icon: ICONS.pulse, tone: 'blue' },
          {
            label: 'Revues du matin faites',
            value: extra?.reviewsDone != null ? `${extra.reviewsDone} / ${extra.reviewDays}` : '—',
            pill: reviewRatio !== null ? `${reviewRatio} %` : undefined,
            pillTone: reviewRatio !== null && reviewRatio >= 80 ? 'up' : 'flat',
            icon: ICONS.sun,
            tone: 'warm',
          },
          { label: 'Alertes traitées', value: num(extra?.alertsHandled), icon: ICONS.check, tone: 'mint' },
          { label: 'Suivis de cycle actifs', value: num(extra?.cycleTracking), icon: ICONS.loop, tone: 'pink' },
        ],
      },
    ];
  }, [stats, extra]);

  if (authLoading || loading) return <SkeletonDashboard />;
  if (!isAuthenticated) return null;

  const todayLabel = capitalize(dateFmt.format(new Date()));
  const sessionsLine = `${today.length} séance${today.length > 1 ? 's' : ''} aujourd’hui`;
  const reviewLine = queue.length > 0 ? ` · ${queue.length} consultant${queue.length > 1 ? 's' : ''} à regarder ce matin` : '';

  const todos = [
    {
      href: '/consultants?filtre=a-relancer',
      l: 'Consultants à relancer',
      s: `Plus de ${RECONTACT_DAYS} jours sans contact`,
      n: recontactCount,
      c: '#E8A87C',
      tint: '#373131',
      d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
    },
    {
      href: '/plans?statut=brouillon',
      l: 'Conseillanciers en brouillon',
      s: 'À finaliser et partager',
      n: draftPlansCount,
      c: '#6DD4B8',
      tint: '#23383B',
      d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
    },
    {
      href: '/messages',
      l: 'Messages non lus',
      s: unreadCount > 0 ? 'En attente de votre réponse' : 'Vous êtes à jour',
      n: unreadCount,
      c: '#7B93DB',
      tint: '#1F2640',
      d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    },
  ];

  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-7">
      <Toaster />

      <section className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-stone">{todayLabel}</span>
          <h1 className="font-serif text-[40px] font-medium leading-[1.1] tracking-[-0.01em] text-charcoal">
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h1>
          <p className="text-[15px] text-stone">{sessionsLine}{reviewLine}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/agenda?nouvelle=1"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-divider px-[18px] text-sm font-medium text-charcoal hover:border-sage"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Nouvelle séance
          </Link>
          <Link
            href="/consultants/new"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nouveau consultant
          </Link>
        </div>
      </section>

      {queue.length > 0 && (
        <section aria-label="Revue du matin" className="flex flex-wrap items-center gap-5 rounded-2xl border border-divider bg-surface px-6 py-[22px]">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-terracotta-light">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <g stroke="#E8A87C" strokeWidth="2" strokeLinecap="round">
                <path d="M16 3v3.5M16 25.5V29M3 16h3.5M25.5 16H29M6.8 6.8l2.5 2.5M22.7 22.7l2.5 2.5M6.8 25.2l2.5-2.5M22.7 9.3l2.5-2.5" />
              </g>
              <circle cx="16" cy="16" r="6.5" fill="#E8A87C" />
              <circle cx="16" cy="16" r="6.5" fill="none" stroke="#F6C9A6" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="flex flex-[1_1_320px] flex-col gap-1">
            <span className="text-[17px] font-semibold text-charcoal">Revue du matin</span>
            <span className="text-sm leading-normal text-[#C9CFDA]">{reviewSentence(queue)}</span>
          </div>
          <div aria-hidden="true" className="flex pl-2.5">
            {queue.slice(0, 5).map((s, i) => (
              <span
                key={s.consultant.id}
                className="-ml-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface text-xs font-semibold text-ink"
                style={{ background: FACE_COLORS[i % FACE_COLORS.length] }}
              >
                {initialsOf(displayName(s))}
              </span>
            ))}
          </div>
          <Link
            href="/morning-review"
            className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-sage-light px-4 text-sm font-semibold text-sage hover:text-sage-dark"
          >
            Commencer · ~{reviewMinutes(queue.length)} min
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-7">
        <section className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Aujourd’hui</h2>
            <Link href="/agenda" className="text-sm text-sage hover:text-sage-dark">Voir l’agenda</Link>
          </div>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-divider bg-surface">
            {today.length === 0 && (
              <p className="px-5 py-6 text-sm text-stone">Aucune séance prévue aujourd’hui.</p>
            )}
            {today.map((a, i) => {
              const visio = a.location_type === 'video';
              const href = a.consultant_id ? `/consultants/${a.consultant_id}` : '/agenda';
              return (
                <Link
                  key={a.id}
                  href={href}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-surface-raised ${i > 0 ? 'border-t border-divider' : ''}`}
                >
                  <div className="flex w-14 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold tabular-nums text-charcoal">{timeFmt.format(new Date(a.starts_at))}</span>
                    <span className="text-xs text-stone">{durationLabel(a)}</span>
                  </div>
                  <div className="w-[3px] self-stretch rounded-sm" style={{ background: a.consultation_type?.color || '#6DD4B8' }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="truncate text-[15px] font-medium text-charcoal">{appointmentName(a)}</span>
                    <span className="truncate text-[13px] text-stone">{a.consultation_type?.name ?? 'Séance'}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={visio ? { background: '#1F2640', color: '#A9B8EC' } : { background: '#23383B', color: '#6DD4B8' }}
                  >
                    {visio ? 'Visio' : 'Cabinet'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3.5">
          <h2 className="text-lg font-semibold text-charcoal">À faire</h2>
          {todos.map((t) => (
            <Link
              key={t.l}
              href={t.href}
              className="flex items-center gap-3.5 rounded-[14px] border border-divider bg-surface px-4 py-3.5 text-charcoal hover:border-sage"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px]" style={{ background: t.tint, color: t.c }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.d} />
                </svg>
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-medium">{t.l}</span>
                <span className="text-[13px] text-stone">{t.s}</span>
              </span>
              <span
                className="flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-[13px] font-semibold"
                style={t.n > 0 ? { background: t.c, color: '#0A0E14' } : { background: '#1C2230', color: '#8B95A5' }}
              >
                {t.n}
              </span>
            </Link>
          ))}
        </section>
      </div>

      <StatsCarousel categories={categories} periods={PERIODS} period={period} onPeriod={setPeriod} loading={statsLoading} />
    </div>
  );
}
