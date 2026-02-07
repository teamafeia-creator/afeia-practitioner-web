'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  ClipboardList,
  Send,
  AlertCircle,
  Users,
  FileText,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getCalendlyUrlForCurrentPractitioner } from '@/lib/calendly';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useAuth';

type ConsultantRow = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_premium?: boolean | null;
  status?: string | null;
  activated?: boolean | null;
};

type ConsultationRow = {
  id: string;
  date: string;
  consultants?: {
    name?: string | null;
    is_premium?: boolean | null;
    status?: string | null;
  } | null;
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

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

const RECONTACT_DAYS = 30;

function getConsultantName(consultant: ConsultantRow): string {
  if (consultant.full_name) return consultant.full_name;
  const parts = [consultant.first_name, consultant.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Consultant';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [upcomingAppointments, setUpcomingAppointments] = useState<ConsultationRow[]>([]);
  const [recontactConsultants, setRecontactConsultants] = useState<AlertConsultant[]>([]);
  const [pendingPlans, setPendingPlans] = useState<AlertConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [calendlyLoading, setCalendlyLoading] = useState(true);
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
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

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

      const { data: consultants, error: consultantsError } = await supabase
        .from('consultants')
        .select('id, full_name, first_name, last_name, is_premium, status, activated')
        .eq('practitioner_id', userId)
        .is('deleted_at', null);

      if (consultantsError) {
        showToast.error('Erreur lors du chargement des consultants');
      }

      const consultantList = (consultants ?? []) as ConsultantRow[];
      const consultantIds = consultantList.map((consultant) => consultant.id);
      const consultantNameMap = new Map(consultantList.map((consultant) => [consultant.id, getConsultantName(consultant)]));

      const { data: consultations } = await supabase
        .from('consultations')
        .select('id, date, consultants(name, is_premium, status)')
        .eq('practitioner_id', userId)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);

      setUpcomingAppointments((consultations ?? []) as ConsultationRow[]);

      if (consultantIds.length > 0) {
        const { data: consultationsHistory } = await supabase
          .from('consultations')
          .select('consultant_id, date')
          .in('consultant_id', consultantIds);

        const lastContactMap = new Map<string, string>();
        (consultationsHistory ?? []).forEach((consultation) => {
          if (!consultation.consultant_id || !consultation.date) return;
          const current = lastContactMap.get(consultation.consultant_id);
          if (!current || new Date(consultation.date) > new Date(current)) {
            lastContactMap.set(consultation.consultant_id, consultation.date);
          }
        });

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - RECONTACT_DAYS);

        const needsContact = consultantList
          .filter((consultant) => consultant.activated !== false)
          .map((consultant) => {
            const lastContact = lastContactMap.get(consultant.id);
            const needs = !lastContact || new Date(lastContact) < threshold;
            return needs
              ? {
                id: consultant.id,
                name: getConsultantName(consultant),
                lastContact
              }
              : null;
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
          lastContact: plan.updated_at ?? null
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

  useEffect(() => {
    async function loadCalendly() {
      try {
        const url = await getCalendlyUrlForCurrentPractitioner();
        setCalendlyUrl(url);
      } catch {
        setCalendlyUrl(null);
      } finally {
        setCalendlyLoading(false);
      }
    }

    if (isAuthenticated) {
      loadCalendly();
    }
  }, [isAuthenticated]);

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
              icon={<Users className="w-4 h-4" />}
              onClick={() => router.push('/consultants/new')}
            >
              Ajouter un consultant
            </Button>
            <Button
              variant="outline"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => {
                if (calendlyLoading) {
                  showToast.info('Calendly en cours de chargement...');
                  return;
                }
                if (!calendlyUrl) {
                  showToast.warning('Configurez votre lien Calendly dans les parametres');
                  return;
                }
                window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              Creer consultation
            </Button>
            {isAdmin ? (
              <Button variant="ghost" onClick={() => router.push('/admin')}>
                Admin
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Calendly Warning */}
      {!calendlyLoading && !calendlyUrl && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4 border-l-4 border-gold"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-charcoal">
              <AlertCircle className="h-5 w-5 text-gold flex-shrink-0" />
              Calendly non configure. Connectez votre calendrier pour faciliter les prises de RDV.
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
              Configurer
            </Button>
          </div>
        </motion.div>
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
                <span className="font-semibold text-charcoal">Bilans en attente</span>
              </div>
              <span className="badge-info px-2.5 py-1 rounded-md text-xs font-semibold">
                {pendingPlans.length}
              </span>
            </div>
            <p className="text-sm text-warmgray mb-4">
              Plans en brouillon a finaliser et valider
            </p>
            <button
              onClick={() => router.push('/consultants')}
              className="alert-action w-full flex items-center justify-center gap-2"
            >
              Finaliser
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>

          {/* Upcoming appointments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="alert-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aubergine/15">
                  <Calendar className="h-5 w-5 text-aubergine" />
                </div>
                <span className="font-semibold text-charcoal">Consultations a venir</span>
              </div>
              <span className="badge-info px-2.5 py-1 rounded-md text-xs font-semibold">
                {upcomingAppointments.length}
              </span>
            </div>
            <p className="text-sm text-warmgray mb-4">
              Prochains rendez-vous planifies
            </p>
            <button
              onClick={() => {
                if (!calendlyUrl) {
                  showToast.warning('Configurez Calendly dans les parametres');
                  return;
                }
                window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
              }}
              className="alert-action w-full flex items-center justify-center gap-2"
            >
              Ouvrir Calendly
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h3 className="section-title mb-4">ACTIONS RAPIDES</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Create consultation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="action-card"
            onClick={() => {
              if (!calendlyUrl) {
                showToast.warning('Configurez Calendly dans les parametres');
                return;
              }
              window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal/15 action-icon mb-4">
              <Calendar className="h-6 w-6 text-teal" />
            </div>
            <h4 className="text-base font-semibold text-charcoal action-title mb-1">
              Creer consultation
            </h4>
            <p className="text-sm text-warmgray action-desc">
              Planifier un rendez-vous ou un suivi consultant.
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

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">PROCHAINES CONSULTATIONS</h3>
            <span className="badge-info px-2.5 py-1 rounded-md text-xs font-semibold">
              {upcomingAppointments.length} a venir
            </span>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/10">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 hover:bg-white/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/consultations/${appointment.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={appointment.consultants?.name || 'Consultant'} size="md" />
                    <div>
                      <p className="font-medium text-charcoal">
                        {appointment.consultants?.name ?? 'Consultant'}
                      </p>
                      <p className="text-sm text-warmgray">
                        {dateTimeFormatter.format(new Date(appointment.date))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {appointment.consultants?.is_premium ||
                    appointment.consultants?.status === 'premium' ? (
                      <span className="badge-premium px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide">
                        Premium
                      </span>
                    ) : (
                      <span className="badge-standard px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide">
                        Standard
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-warmgray" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State for Appointments */}
      {upcomingAppointments.length === 0 && (
        <section>
          <h3 className="section-title mb-4">PROCHAINES CONSULTATIONS</h3>
          <div className="glass-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 mx-auto mb-4">
              <Calendar className="h-8 w-8 text-teal" />
            </div>
            <h4 className="text-lg font-semibold text-charcoal mb-2">
              Aucun rendez-vous planifie
            </h4>
            <p className="text-sm text-warmgray mb-4">
              Planifiez votre prochaine consultation en quelques clics.
            </p>
            <Button
              variant="primary"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => {
                if (!calendlyUrl) {
                  showToast.warning('Configurez Calendly dans les parametres');
                  return;
                }
                window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              Planifier un RDV
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
