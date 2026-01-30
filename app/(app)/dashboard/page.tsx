'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  ClipboardList,
  MessageSquareText,
  Plus,
  Send,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getCalendlyUrlForCurrentPractitioner } from '@/lib/calendly';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useAuth';

type PatientRow = {
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
  patients?: {
    name?: string | null;
    is_premium?: boolean | null;
    status?: string | null;
  } | null;
};

type AlertPatient = {
  id: string;
  name: string;
  lastContact?: string | null;
};

type DraftPlan = {
  id: string;
  patient_id: string;
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

function getPatientName(patient: PatientRow): string {
  if (patient.full_name) return patient.full_name;
  const parts = [patient.first_name, patient.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Patient';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [upcomingAppointments, setUpcomingAppointments] = useState<ConsultationRow[]>([]);
  const [recontactPatients, setRecontactPatients] = useState<AlertPatient[]>([]);
  const [pendingPlans, setPendingPlans] = useState<AlertPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [calendlyLoading, setCalendlyLoading] = useState(true);
  const [greeting, setGreeting] = useState('Bonjour');
  const [practitionerName, setPractitionerName] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user) {
      console.log('📊 Dashboard: En attente de l\'authentification...');
      return;
    }

    console.log('📊 Dashboard: Chargement des données pour:', user.email);

    try {
      const userId = user.id;
      console.log('🔑 User ID:', userId);

      const { data: practitioner, error: practitionerError } = await supabase
        .from('practitioners')
        .select('name')
        .eq('id', userId)
        .single();

      if (practitionerError) {
        console.warn('⚠️ Erreur profil praticien:', practitionerError.message);
      } else if (practitioner?.name) {
        setPractitionerName(practitioner.name.split(' ')[0]);
      }

      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, full_name, first_name, last_name, is_premium, status, activated')
        .eq('practitioner_id', userId)
        .is('deleted_at', null);

      if (patientsError) {
        console.error('❌ Erreur patients:', patientsError.message);
        showToast.error('Erreur lors du chargement des patients');
      }

      const patientList = (patients ?? []) as PatientRow[];
      const patientIds = patientList.map((patient) => patient.id);
      const patientNameMap = new Map(patientList.map((patient) => [patient.id, getPatientName(patient)]));

      const { data: consultations, error: consultationsError } = await supabase
        .from('consultations')
        .select('id, date, patients(name, is_premium, status)')
        .eq('practitioner_id', userId)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);

      if (consultationsError) {
        console.warn('⚠️ Erreur consultations:', consultationsError.message);
      }

      setUpcomingAppointments((consultations ?? []) as ConsultationRow[]);

      if (patientIds.length > 0) {
        const { data: consultationsHistory, error: consultationsHistoryError } = await supabase
          .from('consultations')
          .select('patient_id, date')
          .in('patient_id', patientIds);

        if (consultationsHistoryError) {
          console.warn('⚠️ Erreur historique consultations:', consultationsHistoryError.message);
        }

        const lastContactMap = new Map<string, string>();
        (consultationsHistory ?? []).forEach((consultation) => {
          if (!consultation.patient_id || !consultation.date) return;
          const current = lastContactMap.get(consultation.patient_id);
          if (!current || new Date(consultation.date) > new Date(current)) {
            lastContactMap.set(consultation.patient_id, consultation.date);
          }
        });

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - RECONTACT_DAYS);

        const needsContact = patientList
          .filter((patient) => patient.activated !== false)
          .map((patient) => {
            const lastContact = lastContactMap.get(patient.id);
            const needs = !lastContact || new Date(lastContact) < threshold;
            return needs
              ? {
                id: patient.id,
                name: getPatientName(patient),
                lastContact
              }
              : null;
          })
          .filter(Boolean) as AlertPatient[];

        setRecontactPatients(needsContact);

        const { data: draftPlans, error: draftPlansError } = await supabase
          .from('patient_plans')
          .select('id, patient_id, updated_at')
          .eq('practitioner_id', userId)
          .eq('status', 'draft');

        if (draftPlansError) {
          console.warn('⚠️ Erreur plans brouillons:', draftPlansError.message);
        }

        const pending = (draftPlans ?? []).map((plan: DraftPlan) => ({
          id: plan.id,
          name: patientNameMap.get(plan.patient_id) ?? 'Patient',
          lastContact: plan.updated_at ?? null
        }));

        setPendingPlans(pending);
      }

      console.log('✅ Dashboard chargé avec succès');
    } catch (err) {
      console.error('❌ Erreur chargement dashboard:', err);
      if (err instanceof Error && err.message.includes('401')) {
        showToast.error('Session expirée. Veuillez vous reconnecter.');
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
      } catch (err) {
        console.warn('⚠️ Erreur Calendly:', err);
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
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-warmgray">Redirection vers la page de connexion...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-[28px] glass-panel px-6 py-5 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold text-charcoal">
            {greeting}
            {practitionerName ? `, ${practitionerName}` : ''} !
          </h2>
          <p className="text-warmgray capitalize">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/patients/new')}
          >
            Ajouter un patient
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
                showToast.warning('Configurez votre lien Calendly dans les paramètres');
                return;
              }
              window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Créer consultation
          </Button>
        </div>
      </motion.div>

      {!calendlyLoading && !calendlyUrl && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-gold/30 bg-gold/10 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-charcoal">
              <AlertCircle className="h-5 w-5 text-gold" />
              Calendly non configuré. Connectez votre calendrier pour faciliter les prises de RDV.
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
              Configurer
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card" interactive>
          <CardHeader>
            <CardTitle>Patients à recontacter</CardTitle>
            <CardDescription>Dernier contact &gt; {RECONTACT_DAYS} jours</CardDescription>
          </CardHeader>
          <CardContent>
            {recontactPatients.length === 0 ? (
              <div className="text-sm text-warmgray">Aucun patient en retard de suivi.</div>
            ) : (
              <div className="space-y-3">
                {recontactPatients.slice(0, 4).map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={patient.name} size="sm" />
                      <div>
                        <div className="text-sm font-medium text-charcoal">{patient.name}</div>
                        <div className="text-xs text-warmgray">
                          Dernier contact :{' '}
                          {patient.lastContact
                            ? shortDateFormatter.format(new Date(patient.lastContact))
                            : 'Aucun'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/patients/${patient.id}`)}
                    >
                      Relancer
                    </Button>
                  </div>
                ))}
                {recontactPatients.length > 4 ? (
                  <div className="text-xs text-warmgray">
                    +{recontactPatients.length - 4} autres patients à relancer
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card" interactive>
          <CardHeader>
            <CardTitle>Bilans en attente de validation</CardTitle>
            <CardDescription>Plans en brouillon à finaliser</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPlans.length === 0 ? (
              <div className="text-sm text-warmgray">Aucun bilan en attente.</div>
            ) : (
              <div className="space-y-3">
                {pendingPlans.slice(0, 4).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-charcoal">{plan.name}</div>
                      <div className="text-xs text-warmgray">
                        Mise à jour :{' '}
                        {plan.lastContact
                          ? shortDateFormatter.format(new Date(plan.lastContact))
                          : 'Date inconnue'}
                      </div>
                    </div>
                    <Badge variant="attention">À valider</Badge>
                  </div>
                ))}
                {pendingPlans.length > 4 ? (
                  <div className="text-xs text-warmgray">
                    +{pendingPlans.length - 4} bilans supplémentaires
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-charcoal">Actions rapides</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/15 text-teal">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-charcoal">Créer consultation</div>
                <p className="text-xs text-warmgray">Planifier un rendez-vous ou un suivi.</p>
              </div>
              <Button
                variant="primary"
                className="mt-auto w-full"
                icon={<Calendar className="h-4 w-4" />}
                onClick={() => {
                  if (!calendlyUrl) {
                    showToast.warning('Configurez Calendly dans les paramètres');
                    return;
                  }
                  window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                Ouvrir Calendly
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/15 text-teal">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-charcoal">Ajouter note</div>
                <p className="text-xs text-warmgray">Mettre à jour un dossier patient.</p>
              </div>
              <Button
                variant="primary"
                className="mt-auto w-full"
                icon={<ClipboardList className="h-4 w-4" />}
                onClick={() => router.push('/patients')}
              >
                Ouvrir les dossiers
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/15 text-teal">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-charcoal">Envoyer questionnaire</div>
                <p className="text-xs text-warmgray">Préparer un nouveau questionnaire.</p>
              </div>
              <Button
                variant="primary"
                className="mt-auto w-full"
                icon={<MessageSquareText className="h-4 w-4" />}
                onClick={() => router.push('/questionnaires')}
              >
                Créer un envoi
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prochaines consultations</CardTitle>
                <CardDescription>Vos rendez-vous à venir</CardDescription>
              </div>
              <Badge variant="active">
                {upcomingAppointments.length} à venir
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <EmptyState
                icon="appointments"
                title="Aucun rendez-vous planifié"
                description="Planifiez votre prochaine consultation en quelques clics."
                action={
                  <Button
                    variant="secondary"
                    icon={<Calendar className="w-4 h-4" />}
                    onClick={() => {
                      if (!calendlyUrl) {
                        showToast.warning('Configurez Calendly dans les paramètres');
                        return;
                      }
                      window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Planifier un RDV
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3 transition hover:shadow-md"
                    onClick={() => router.push(`/consultations/${appointment.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={appointment.patients?.name || 'Patient'} size="md" />
                      <div>
                        <p className="font-medium text-charcoal">
                          {appointment.patients?.name ?? 'Patient'}
                        </p>
                        <p className="text-sm text-warmgray">
                          {dateTimeFormatter.format(new Date(appointment.date))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {appointment.patients?.is_premium ||
                      appointment.patients?.status === 'premium' ? (
                        <Badge variant="premium">Premium</Badge>
                      ) : (
                        <Badge variant="standard">Standard</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
