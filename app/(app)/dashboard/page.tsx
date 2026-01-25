'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, premium: 0, appointments: 0, messages: 0 });
  const [upcomingAppointments, setUpcomingAppointments] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);

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

        const { data: patients } = await supabase
          .from('patients')
          .select('id, is_premium, status')
          .eq('practitioner_id', userId)
          .is('deleted_at', null);

        const premiumCount = patients?.filter((p) => p.is_premium || p.status === 'premium').length || 0;

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
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const todayLabel = useMemo(() => dateFormatter.format(new Date()), []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du tableau de bord…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Tableau de bord</h1>
        <p className="text-sm text-warmgray capitalize">{todayLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Patients actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-teal">{stats.total}</div>
            <p className="mt-2 text-xs text-warmgray">Dossiers actifs suivis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-aubergine">{stats.premium}</div>
            <p className="mt-2 text-xs text-warmgray">Accès Circular + suivi avancé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RDV cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-teal">{stats.appointments}</div>
            <p className="mt-2 text-xs text-warmgray">Consultations à venir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nouveaux messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gold">{stats.messages}</div>
            <p className="mt-2 text-xs text-warmgray">À traiter aujourd’hui</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Prochaines consultations</CardTitle>
            <Badge variant="info">{upcomingAppointments.length} à venir</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
              Aucun rendez-vous planifié.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-charcoal">
                      {appointment.patients?.name ?? 'Patient'}
                    </div>
                    <div className="text-xs text-warmgray">
                      {dateTimeFormatter.format(new Date(appointment.date))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appointment.patients?.is_premium || appointment.patients?.status === 'premium' ? (
                      <Badge variant="premium">Premium</Badge>
                    ) : (
                      <Badge variant="info">Standard</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
