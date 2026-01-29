'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Crown,
  Calendar,
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressCircle } from '@/components/ui/Progress';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { getCalendlyUrlForCurrentPractitioner } from '@/lib/calendly';
import { supabase } from '@/lib/supabase';

type ConsultationRow = {
  id: string;
  date: string;
  patients?: {
    name?: string | null;
    is_premium?: boolean | null;
    status?: string | null;
  } | null;
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

// Sample data for charts (will be replaced with real data)
const weeklyData = [
  { name: 'Lun', consultations: 4, nouveaux: 1 },
  { name: 'Mar', consultations: 6, nouveaux: 2 },
  { name: 'Mer', consultations: 5, nouveaux: 0 },
  { name: 'Jeu', consultations: 8, nouveaux: 3 },
  { name: 'Ven', consultations: 7, nouveaux: 1 },
  { name: 'Sam', consultations: 3, nouveaux: 0 },
  { name: 'Dim', consultations: 0, nouveaux: 0 }
];

const COLORS = ['#2A8080', '#10B981', '#F59E0B', '#EC4899'];

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'teal' | 'emerald' | 'orange' | 'pink';
  delay?: number;
}

function StatCard({ title, value, subtitle, icon, trend, color, delay = 0 }: StatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-teal/10',
      text: 'text-teal',
      gradient: 'from-teal to-teal-deep'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      gradient: 'from-emerald-400 to-emerald-600'
    },
    orange: {
      bg: 'bg-accent-orange/10',
      text: 'text-accent-orange',
      gradient: 'from-accent-orange to-orange-500'
    },
    pink: {
      bg: 'bg-accent-pink/10',
      text: 'text-accent-pink',
      gradient: 'from-accent-pink to-pink-600'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="relative overflow-hidden" interactive>
        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8">
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${colorStyles[color].gradient} opacity-10`}
          />
        </div>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-warmgray font-medium">{title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-bold ${colorStyles[color].text}`}>
                  {value}
                </span>
                {trend !== undefined && (
                  <span
                    className={`text-xs font-medium flex items-center gap-0.5 ${
                      trend >= 0 ? 'text-emerald-600' : 'text-accent-danger'
                    }`}
                  >
                    <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(trend)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-warmgray mt-1">{subtitle}</p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl ${colorStyles[color].bg} flex items-center justify-center`}
            >
              <div className={colorStyles[color].text}>{icon}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, premium: 0, appointments: 0, messages: 0 });
  const [upcomingAppointments, setUpcomingAppointments] = useState<ConsultationRow[]>([]);
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

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (!userId) {
          setStats({ total: 0, premium: 0, appointments: 0, messages: 0 });
          setUpcomingAppointments([]);
          return;
        }

        // Get practitioner name
        const { data: practitioner } = await supabase
          .from('practitioners')
          .select('name')
          .eq('id', userId)
          .single();

        if (practitioner?.name) {
          setPractitionerName(practitioner.name.split(' ')[0]);
        }

        const { data: patients } = await supabase
          .from('patients')
          .select('id, is_premium, status')
          .eq('practitioner_id', userId)
          .is('deleted_at', null);

        const premiumCount =
          patients?.filter((p) => p.is_premium || p.status === 'premium').length || 0;

        const { data: consultations } = await supabase
          .from('consultations')
          .select('id, date, patients(name, is_premium, status)')
          .eq('practitioner_id', userId)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(5);

        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('sender_role', 'patient')
          .is('read_by_practitioner', false);

        setStats({
          total: patients?.length || 0,
          premium: premiumCount,
          appointments: consultations?.length || 0,
          messages: messages?.length || 0
        });

        setUpcomingAppointments((consultations ?? []) as ConsultationRow[]);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        showToast.error('Erreur lors du chargement du tableau de bord');
      } finally {
        setLoading(false);
      }
    }

    async function loadCalendly() {
      try {
        const url = await getCalendlyUrlForCurrentPractitioner();
        setCalendlyUrl(url);
      } catch (err) {
        setCalendlyUrl(null);
      } finally {
        setCalendlyLoading(false);
      }
    }

    loadDashboardData();
    loadCalendly();
  }, []);

  const todayLabel = useMemo(() => dateFormatter.format(new Date()), []);

  const pieData = [
    { name: 'Standard', value: stats.total - stats.premium },
    { name: 'Premium', value: stats.premium }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord" />
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Header with greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            {greeting}
            {practitionerName ? `, ${practitionerName}` : ''} !
          </h1>
          <p className="text-warmgray capitalize">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/patients/new')}
          >
            Nouveau patient
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
            Planifier RDV
          </Button>
        </div>
      </motion.div>

      {/* Calendly warning */}
      {!calendlyLoading && !calendlyUrl && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-accent-warning/10 border border-accent-warning/20 rounded-xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-accent-warning" />
            <span className="text-sm text-charcoal">
              Calendly non configuré. Connectez votre calendrier pour faciliter les prises de RDV.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
            Configurer
          </Button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Patients actifs"
          value={stats.total}
          subtitle="Dossiers suivis"
          icon={<Users className="w-6 h-6" />}
          trend={12}
          color="teal"
          delay={0}
        />
        <StatCard
          title="Patients Premium"
          value={stats.premium}
          subtitle="Suivi avancé + Circular"
          icon={<Crown className="w-6 h-6" />}
          trend={8}
          color="pink"
          delay={0.1}
        />
        <StatCard
          title="RDV cette semaine"
          value={stats.appointments}
          subtitle="Consultations à venir"
          icon={<Calendar className="w-6 h-6" />}
          color="emerald"
          delay={0.2}
        />
        <StatCard
          title="Nouveaux messages"
          value={stats.messages}
          subtitle="À traiter"
          icon={<MessageSquare className="w-6 h-6" />}
          color="orange"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activité de la semaine</CardTitle>
                  <CardDescription>Consultations et nouveaux patients</CardDescription>
                </div>
                <Badge variant="active">Cette semaine</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorConsultations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2A8080" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2A8080" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNouveaux" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#8C8680" fontSize={12} />
                    <YAxis stroke="#8C8680" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="consultations"
                      stroke="#2A8080"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorConsultations)"
                      name="Consultations"
                    />
                    <Area
                      type="monotone"
                      dataKey="nouveaux"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNouveaux)"
                      name="Nouveaux patients"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patient Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Répartition patients</CardTitle>
              <CardDescription>Standard vs Premium</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-warmgray text-sm">
                    Aucun patient pour le moment
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal" />
                  <span className="text-xs text-warmgray">Standard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-warmgray">Premium</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prochaines consultations</CardTitle>
                <CardDescription>Vos rendez-vous à venir</CardDescription>
              </div>
              <Badge variant="active">
                <Clock className="w-3 h-3 mr-1" />
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
                {upcomingAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white to-sable/30 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/consultations/${appointment.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        name={appointment.patients?.name || 'Patient'}
                        size="md"
                      />
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
                        <Badge variant="premium">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge variant="standard">Standard</Badge>
                      )}
                      <ArrowRight className="w-4 h-4 text-warmgray" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal to-emerald-500 flex items-center justify-center shadow-glow">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Besoin d&apos;aide ?</h3>
                  <p className="text-sm text-warmgray">
                    Consultez notre guide ou contactez le support
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost">Guide d&apos;utilisation</Button>
                <Button variant="outline">Contacter le support</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
