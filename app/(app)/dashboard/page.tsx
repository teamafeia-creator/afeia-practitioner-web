'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, premium: 0, appointments: 0, messages: 0 })
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Stats
      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_premium, status')
        .eq('practitioner_id', user!.id)
        .is('deleted_at', null)

      const premiumCount = patients?.filter((p) => p.is_premium || p.status === 'premium').length || 0

      // Consultations à venir
      const { data: consultations } = await supabase
        .from('consultations')
        .select('*, patients(name, is_premium)')
        .eq('practitioner_id', user!.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5)

      // Messages non lus
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_role', 'patient')
        .is('read_by_practitioner', false)

      setStats({
        total: patients?.length || 0,
        premium: premiumCount,
        appointments: consultations?.length || 0,
        messages: messages?.length || 0,
      })

      setUpcomingAppointments(consultations || [])

      // Activité récente simulée (à adapter selon vos besoins)
      setRecentActivity([
        { type: 'journal', patient: 'Marie Dupont', time: '2h', icon: '📝' },
        { type: 'message', patient: 'Julie Bernard', time: '5h', icon: '💬' },
        { type: 'circular', patient: 'Laura Petit', time: '1j', icon: '💍' },
      ])
    } catch (err) {
      console.error('Erreur chargement dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.teal.main }}
          ></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold mb-2" style={{ color: colors.teal.deep }}>
          Tableau de bord
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}{' '}
          — aperçu rapide
        </p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div
            className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.sand }}
          >
            <div className="text-4xl font-bold mb-2" style={{ color: colors.teal.main }}>
              {stats.total}
            </div>
            <div className="text-sm" style={{ color: colors.gray.charcoal }}>
              Patients actifs
            </div>
          </div>

          <div
            className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ backgroundColor: colors.aubergine.light }}
          >
            <div
              className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold rounded-bl-lg"
              style={{ backgroundColor: colors.aubergine.main, color: 'white' }}
            >
              ✨ Premium
            </div>
            <div className="text-4xl font-bold mb-2" style={{ color: colors.aubergine.main }}>
              {stats.premium}
            </div>
            <div className="text-sm" style={{ color: colors.gray.charcoal }}>
              Patients Premium
            </div>
          </div>

          <div
            className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.sand }}
          >
            <div className="text-4xl font-bold mb-2" style={{ color: colors.teal.main }}>
              {stats.appointments}
            </div>
            <div className="text-sm" style={{ color: colors.gray.charcoal }}>
              RDV cette semaine
            </div>
          </div>

          <div
            className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.sand }}
          >
            <div className="text-4xl font-bold mb-2" style={{ color: colors.gold }}>
              {stats.messages}
            </div>
            <div className="text-sm" style={{ color: colors.gray.charcoal }}>
              Nouveaux messages
            </div>
          </div>
        </div>

        {/* Prochaines consultations */}
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{
            backgroundColor: colors.sand,
            borderTop: `4px solid`,
            borderImage: colors.gradientTealAubergine,
            borderImageSlice: 1,
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            📅 Prochaines consultations
          </h2>

          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map((appt: any) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-lg p-4 border-l-4 hover:shadow-md transition-shadow"
                  style={{ borderColor: colors.teal.main }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: colors.gray.charcoal }}>
                          {new Date(appt.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                          })}{' '}
                          •{' '}
                          {new Date(appt.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {appt.patients?.is_premium && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: colors.aubergine.light,
                              color: colors.aubergine.main,
                            }}
                          >
                            ✨ Premium
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mb-1">👤 {appt.patients?.name}</p>
                      <p className="text-sm" style={{ color: colors.gray.warm }}>
                        {appt.notes || 'Consultation de suivi'}
                      </p>
                    </div>
                    <Link
                      href={`/consultations/${appt.id}`}
                      className="px-4 py-2 rounded-lg font-semibold text-white hover:shadow-md transition-all"
                      style={{ backgroundColor: colors.gold }}
                    >
                      ▶ Démarrer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.gray.warm }}>Aucune consultation programmée</p>
          )}
        </div>

        {/* Activité récente */}
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            🔔 Activité récente
          </h2>

          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <span className="text-2xl">{activity.icon}</span>
                <span style={{ color: colors.gray.charcoal }}>
                  <strong>{activity.patient}</strong> a rempli son journal
                </span>
                <span style={{ color: colors.gray.warm }}>(il y a {activity.time})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
