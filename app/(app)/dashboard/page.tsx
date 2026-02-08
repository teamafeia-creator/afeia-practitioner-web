'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  ClipboardList,
  Send,
  Users,
  FileText,
  ChevronRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getTodayAppointments, getRecentCompletedWithoutNotes } from '@/lib/queries/appointments';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useAuth';
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
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [recentWithoutNotes, setRecentWithoutNotes] = useState<Appointment[]>([]);
  const [recontactConsultants, setRecontactConsultants] = useState<AlertConsultant[]>([]);
  const [pendingPlans, setPendingPlans] = useState<AlertConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Bonjour');
  const [practitionerName, setPractitionerName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

      // Load today's appointments from native table
      const [todayApts, noNotes] = await Promise.all([
        getTodayAppointments().catch(() => []),
        getRecentCompletedWithoutNotes().catch(() => []),
      ]);
      setTodayAppointments(todayApts);
      setRecentWithoutNotes(noNotes);

      // Load consultants for recontact
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
        // Use appointments table for last contact instead of consultations
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

        // Also check consultations table for legacy data
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
        <div className="glass-card p-8 text-center">
          <p className="text-warmgray">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toaster />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-lg p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-charcoal tracking-tight">
              {greeting}
              {practitionerName ? `, ${practitionerName}` : ''} !
            </h2>
            <p className="text-warmgray text-sm capitalize mt-1">{todayLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => router.push('/agenda')}
            >
              Nouvelle seance
            </Button>
            <Button
              variant="outline"
              icon={<Users className="w-4 h-4" />}
              onClick={() => router.push('/consultants/new')}
            >
              Ajouter un consultant
            </Button>
            {isAdmin ? (
              <Button variant="ghost" onClick={() => router.push('/admin')}>
                Admin
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Today's Appointments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">VOS SEANCES AUJOURD&apos;HUI</h3>
          <Button variant="ghost" size="sm" onClick={() => router.push('/agenda')}>
            Voir l&apos;agenda
          </Button>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/10">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 hover:bg-white/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/consultants/${appointment.consultant_id || ''}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <div className="text-sm font-semibold text-teal">
                        {timeFormatter.format(new Date(appointment.starts_at))}
                      </div>
                      <div className="text-[10px] text-warmgray">
                        {timeFormatter.format(new Date(appointment.ends_at))}
                      </div>
                    </div>
                    <Avatar name={getAppointmentName(appointment)} size="md" />
                    <div>
                      <p className="font-medium text-charcoal">
                        {getAppointmentName(appointment)}
                      </p>
                      <p className="text-xs text-warmgray">
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
                      <span className="badge-premium px-2 py-0.5 rounded-md text-xs font-semibold">
                        Premium
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-warmgray" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 mx-auto mb-4">
              <Calendar className="h-8 w-8 text-teal" />
            </div>
            <h4 className="text-lg font-semibold text-charcoal mb-2">
              Aucune seance prevue aujourd&apos;hui
            </h4>
            <p className="text-sm text-warmgray mb-4">
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              SEANCES RECENTES SANS NOTES
            </h3>
          </div>
          <div className="glass-card p-4 border-l-4 border-amber-400">
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
                  className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={getAppointmentName(apt)} size="sm" />
                    <div>
                      <span className="text-sm font-medium text-charcoal">{getAppointmentName(apt)}</span>
                      <span className="text-xs text-warmgray ml-2">
                        {shortDateFormatter.format(new Date(apt.starts_at))}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-warmgray" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Alerts & Notifications Section */}
      <section>
        <h3 className="section-title mb-4">ALERTES ET NOTIFICATIONS</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Consultants to recontact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="alert-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
                  <Users className="h-5 w-5 text-gold" />
                </div>
                <span className="font-semibold text-charcoal">Consultants a recontacter</span>
              </div>
              <span className="badge-urgent px-2.5 py-1 rounded-md text-xs font-semibold">
                {recontactConsultants.length}
              </span>
            </div>
            <p className="text-sm text-warmgray mb-4">
              Dernier contact il y a plus de {RECONTACT_DAYS} jours
            </p>
            <button
              onClick={() => router.push('/consultants?filter=recontact')}
              className="alert-action w-full flex items-center justify-center gap-2"
            >
              Voir la liste
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>

          {/* Pending plans */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="alert-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aubergine/15">
                  <FileText className="h-5 w-5 text-aubergine" />
                </div>
                <span className="font-semibold text-charcoal">Conseillanciers en attente</span>
              </div>
              <span className="badge-info px-2.5 py-1 rounded-md text-xs font-semibold">
                {pendingPlans.length}
              </span>
            </div>
            <p className="text-sm text-warmgray mb-4">
              Conseillanciers en brouillon a finaliser et partager
            </p>
            <button
              onClick={() => router.push('/consultants')}
              className="alert-action w-full flex items-center justify-center gap-2"
            >
              Finaliser
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>

          {/* Upcoming appointments - now links to agenda */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="alert-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/15">
                  <Calendar className="h-5 w-5 text-teal" />
                </div>
                <span className="font-semibold text-charcoal">Seances du jour</span>
              </div>
              <span className="badge-standard px-2.5 py-1 rounded-md text-xs font-semibold">
                {todayAppointments.length}
              </span>
            </div>
            <p className="text-sm text-warmgray mb-4">
              Vos seances prevues aujourd&apos;hui
            </p>
            <button
              onClick={() => router.push('/agenda')}
              className="alert-action w-full flex items-center justify-center gap-2"
            >
              Ouvrir l&apos;agenda
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h3 className="section-title mb-4">ACTIONS RAPIDES</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Create consultation - now opens agenda */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="action-card"
            onClick={() => router.push('/agenda')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal/15 action-icon mb-4">
              <Calendar className="h-6 w-6 text-teal" />
            </div>
            <h4 className="text-base font-semibold text-charcoal action-title mb-1">
              Planifier une seance
            </h4>
            <p className="text-sm text-warmgray action-desc">
              Ouvrir l&apos;agenda et creer un rendez-vous.
            </p>
          </motion.div>

          {/* Add note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="action-card"
            onClick={() => router.push('/consultants')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal/15 action-icon mb-4">
              <ClipboardList className="h-6 w-6 text-teal" />
            </div>
            <h4 className="text-base font-semibold text-charcoal action-title mb-1">
              Ajouter note
            </h4>
            <p className="text-sm text-warmgray action-desc">
              Mettre a jour un dossier consultant existant.
            </p>
          </motion.div>

          {/* Send questionnaire */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="action-card"
            onClick={() => router.push('/questionnaires')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal/15 action-icon mb-4">
              <Send className="h-6 w-6 text-teal" />
            </div>
            <h4 className="text-base font-semibold text-charcoal action-title mb-1">
              Envoyer questionnaire
            </h4>
            <p className="text-sm text-warmgray action-desc">
              Preparer et envoyer un nouveau questionnaire.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Recent Consultants to Recontact */}
      {recontactConsultants.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">CONSULTANTS A RELANCER</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/consultants')}
            >
              Voir tous
            </Button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/10">
              {recontactConsultants.slice(0, 5).map((consultant) => (
                <div
                  key={consultant.id}
                  className="flex items-center justify-between p-4 hover:bg-white/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/consultants/${consultant.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={consultant.name} size="sm" />
                    <div>
                      <div className="text-sm font-medium text-charcoal">{consultant.name}</div>
                      <div className="flex items-center gap-1 text-xs text-warmgray">
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
              <div className="p-4 bg-white/20 text-center">
                <span className="text-xs text-warmgray">
                  +{recontactConsultants.length - 5} autres consultants a relancer
                </span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
