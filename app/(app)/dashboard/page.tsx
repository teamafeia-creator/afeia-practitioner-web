'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  FileText,
  ChevronRight,
  Clock,
  AlertTriangle,
  MessageSquare,
  Receipt,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getTodayAppointments, getRecentCompletedWithoutNotes } from '@/lib/queries/appointments';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePractitionerStats } from '@/hooks/usePractitionerStats';
import { StatCard } from '@/components/ui/StatCard';
import type { Appointment } from '@/lib/types';

type ConsultantRow = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_premium?: boolean | null;
  status?: string | null;
  activated?: boolean | null;
};

type AlertConsultant = {
  id: string;
  name: string;
  lastContact?: string | null;
};

type DraftPlan = {
  id: string;
  consultant_id: string;
  updated_at?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short'
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
});

const RECONTACT_DAYS = 30;

function getConsultantName(consultant: ConsultantRow): string {
  if (consultant.name) return consultant.name;
  const parts = [consultant.first_name, consultant.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Consultant';
}

function getAppointmentName(appointment: Appointment): string {
  const p = appointment.patient;
  if (!p) return appointment.booking_name || 'Consultant';
  return p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Consultant';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const { stats, loading: statsLoading } = usePractitionerStats('this_month');
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [recentWithoutNotes, setRecentWithoutNotes] = useState<Appointment[]>([]);
  const [recontactConsultants, setRecontactConsultants] = useState<AlertConsultant[]>([]);
  const [pendingPlans, setPendingPlans] = useState<AlertConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Bonjour');
  const [practitionerName, setPractitionerName] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon apres-midi');
    else setGreeting('Bonsoir');
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user) return;

    try {
      const userId = user.id;

      const { data: practitioner, error: practitionerError } = await supabase
        .from('practitioners')
        .select('name')
        .eq('id', userId)
        .single();

      if (!practitionerError && practitioner?.name) {
        setPractitionerName(practitioner.name.split(' ')[0]);
      }

      const [todayApts, noNotes] = await Promise.all([
        getTodayAppointments().catch(() => []),
        getRecentCompletedWithoutNotes().catch(() => []),
      ]);
      setTodayAppointments(todayApts);
      setRecentWithoutNotes(noNotes);

      const { data: consultants, error: consultantsError } = await supabase
        .from('consultants')
        .select('id, name, first_name, last_name, is_premium, status, activated')
        .eq('practitioner_id', userId)
        .is('deleted_at', null);

      if (consultantsError) {
        showToast.error('Erreur lors du chargement des consultants');
      }

      const consultantList = (consultants ?? []) as ConsultantRow[];
      const consultantIds = consultantList.map((c) => c.id);
      const consultantNameMap = new Map(consultantList.map((c) => [c.id, getConsultantName(c)]));

      if (consultantIds.length > 0) {
        const { data: appointmentsHistory } = await supabase
          .from('appointments')
          .select('consultant_id, starts_at')
          .in('consultant_id', consultantIds)
          .eq('status', 'completed');

        const lastContactMap = new Map<string, string>();
        (appointmentsHistory ?? []).forEach((a: { consultant_id: string; starts_at: string }) => {
          if (!a.consultant_id || !a.starts_at) return;
          const current = lastContactMap.get(a.consultant_id);
          if (!current || new Date(a.starts_at) > new Date(current)) {
            lastContactMap.set(a.consultant_id, a.starts_at);
          }
        });

        const { data: consultationsHistory } = await supabase
          .from('consultations')
          .select('consultant_id, date')
          .in('consultant_id', consultantIds);

        (consultationsHistory ?? []).forEach((c: { consultant_id: string; date: string }) => {
          if (!c.consultant_id || !c.date) return;
          const current = lastContactMap.get(c.consultant_id);
          if (!current || new Date(c.date) > new Date(current)) {
            lastContactMap.set(c.consultant_id, c.date);
          }
        });

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - RECONTACT_DAYS);

        const needsContact = consultantList
          .filter((c) => c.activated !== false)
          .map((c) => {
            const lastContact = lastContactMap.get(c.id);
            const needs = !lastContact || new Date(lastContact) < threshold;
            return needs ? { id: c.id, name: getConsultantName(c), lastContact } : null;
          })
          .filter(Boolean) as AlertConsultant[];

        setRecontactConsultants(needsContact);

        const { data: draftPlans } = await supabase
          .from('consultant_plans')
          .select('id, consultant_id, updated_at')
          .eq('practitioner_id', userId)
          .eq('status', 'draft');

        const pending = (draftPlans ?? []).map((plan: DraftPlan) => ({
          id: plan.id,
          name: consultantNameMap.get(plan.consultant_id) ?? 'Consultant',
          lastContact: plan.updated_at ?? null,
        }));

        setPendingPlans(pending);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        showToast.error('Session expiree. Veuillez vous reconnecter.');
        router.replace('/login');
      } else {
        showToast.error('Erreur lors du chargement du tableau de bord');
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const todayLabel = useMemo(() => dateFormatter.format(new Date()), []);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <SkeletonDashboard />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-divider rounded-xl p-8 text-center">
          <p className="text-stone">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toaster />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>
              {greeting}
              {practitionerName ? `, ${practitionerName}` : ''}
            </h1>
            <p className="text-sm text-stone capitalize mt-1">{todayLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => router.push('/consultants/new')}
            >
              Nouveau consultant
            </Button>
            <Button
              variant="secondary"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => router.push('/agenda')}
            >
              Nouvelle seance
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2-Column Layout: 60/40 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column — Temporal Flow (60%) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Today's Appointments */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>
                Aujourd&apos;hui
              </h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/agenda')}>
                Voir l&apos;agenda
              </Button>
            </div>

            {todayAppointments.length > 0 ? (
              <div className="bg-white border border-divider rounded-xl overflow-hidden shadow-card">
                <div className="divide-y divide-divider">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 hover:bg-cream/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/consultants/${appointment.consultant_id || ''}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <div className="text-sm font-semibold text-sage">
                            {timeFormatter.format(new Date(appointment.starts_at))}
                          </div>
                          <div className="text-[11px] text-stone">
                            {timeFormatter.format(new Date(appointment.ends_at))}
                          </div>
                        </div>
                        <Avatar name={getAppointmentName(appointment)} size="md" />
                        <div>
                          <p className="font-medium text-charcoal text-sm">
                            {getAppointmentName(appointment)}
                          </p>
                          <p className="text-xs text-stone">
                            {appointment.consultation_type?.name || 'Consultation'}
                            {appointment.location_type === 'video' && ' · Visio'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {appointment.consultation_type?.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: appointment.consultation_type.color }}
                          />
                        )}
                        {appointment.patient?.is_premium && (
                          <span className="badge-premium px-2 py-0.5 rounded-2xl text-xs font-medium">
                            Premium
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-stone" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-divider rounded-xl p-8 text-center shadow-card">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-light mx-auto mb-4">
                  <Calendar className="h-7 w-7 text-sage" />
                </div>
                <h4 className="text-base font-semibold text-charcoal mb-2">
                  Aucune seance prevue aujourd&apos;hui
                </h4>
                <p className="text-sm text-stone mb-4">
                  Planifiez votre prochaine seance en quelques clics.
                </p>
                <Button
                  variant="primary"
                  icon={<Calendar className="w-4 h-4" />}
                  onClick={() => router.push('/agenda')}
                >
                  Ouvrir l&apos;agenda
                </Button>
              </div>
            )}
          </section>

          {/* Recent sessions without notes */}
          {recentWithoutNotes.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold font-serif text-charcoal mb-4" style={{ letterSpacing: '-0.02em' }}>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-gold" />
                  Seances recentes sans notes
                </span>
              </h2>
              <div className="bg-white border border-divider rounded-xl p-4 border-l-4 border-l-gold shadow-card">
                <p className="text-sm text-charcoal mb-3">
                  N&apos;oubliez pas de rediger vos notes pour ces seances :
                </p>
                <div className="space-y-2">
                  {recentWithoutNotes.slice(0, 5).map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => {
                        if (apt.consultant_id) router.push(`/consultants/${apt.consultant_id}?tab=Notes+de+séance`);
                      }}
                      className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-cream transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={getAppointmentName(apt)} size="sm" />
                        <div>
                          <span className="text-sm font-medium text-charcoal">{getAppointmentName(apt)}</span>
                          <span className="text-xs text-stone ml-2">
                            {shortDateFormatter.format(new Date(apt.starts_at))}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recent Consultants to Recontact */}
          {recontactConsultants.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>
                  Activite recente
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/consultants')}
                >
                  Voir tous
                </Button>
              </div>
              <div className="bg-white border border-divider rounded-xl overflow-hidden shadow-card">
                <div className="divide-y divide-divider">
                  {recontactConsultants.slice(0, 5).map((consultant) => (
                    <div
                      key={consultant.id}
                      className="flex items-center justify-between p-4 hover:bg-cream/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/consultants/${consultant.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={consultant.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-charcoal">{consultant.name}</div>
                          <div className="flex items-center gap-1 text-xs text-stone">
                            <Clock className="h-3 w-3" />
                            Dernier contact :{' '}
                            {consultant.lastContact
                              ? shortDateFormatter.format(new Date(consultant.lastContact))
                              : 'Aucun'}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/consultants/${consultant.id}`);
                        }}
                      >
                        Relancer
                      </Button>
                    </div>
                  ))}
                </div>
                {recontactConsultants.length > 5 && (
                  <div className="p-4 bg-cream/50 text-center">
                    <span className="text-xs text-stone">
                      +{recontactConsultants.length - 5} autres consultants a relancer
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column — Static (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* To-do counters */}
          <section>
            <h2 className="text-xl font-semibold font-serif text-charcoal mb-4" style={{ letterSpacing: '-0.02em' }}>
              A faire
            </h2>
            <div className="space-y-3">
              {/* Consultants to recontact */}
              <button
                onClick={() => router.push('/consultants?filter=recontact')}
                className="w-full bg-white border border-divider rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta-light">
                    <Users className="h-5 w-5 text-terracotta" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-charcoal">Consultants a relancer</div>
                    <div className="text-xs text-stone">+ de {RECONTACT_DAYS} jours sans contact</div>
                  </div>
                </div>
                <span className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-terracotta text-white text-sm font-semibold px-2">
                  {recontactConsultants.length}
                </span>
              </button>

              {/* Pending plans */}
              <button
                onClick={() => router.push('/consultants')}
                className="w-full bg-white border border-divider rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-light">
                    <FileText className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-charcoal">Conseillanciers en brouillon</div>
                    <div className="text-xs text-stone">A finaliser et partager</div>
                  </div>
                </div>
                <span className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-sage text-white text-sm font-semibold px-2">
                  {pendingPlans.length}
                </span>
              </button>

              {/* Unread messages */}
              <button
                onClick={() => router.push('/messages')}
                className="w-full bg-white border border-divider rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky/10">
                    <MessageSquare className="h-5 w-5 text-sky" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-charcoal">Messages non lus</div>
                    <div className="text-xs text-stone">Conversations en attente</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-stone" />
              </button>
            </div>
          </section>

          {/* Quick Stats */}
          {!statsLoading && (
            <section>
              <h2 className="text-xl font-semibold font-serif text-charcoal mb-4" style={{ letterSpacing: '-0.02em' }}>
                Statistiques rapides
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon="👥"
                  value={stats.activeConsultants}
                  label="Consultants actifs"
                  color="#5B8C6E"
                />
                <StatCard
                  icon="📅"
                  value={stats.sessionsCount}
                  label="Seances ce mois"
                  color="#5B8C6E"
                />
                <StatCard
                  icon="🔄"
                  value={`${stats.retentionRate}%`}
                  label="Fidelisation"
                  color={stats.retentionRate >= 70 ? '#7BAE7F' : stats.retentionRate >= 50 ? '#D4A060' : '#D4738B'}
                />
                <StatCard
                  icon="💰"
                  value={stats.revenue > 0 ? `${(stats.revenue / 100).toFixed(0)} €` : '—'}
                  label="CA mensuel"
                  color="#5B8C6E"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
