'use client'

import { useEffect, useState } from 'react'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, premium: 0, appointments: 0, messages: 0 })
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Stats
      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_premium, status')
        .eq('practitioner_id', user!.id)
        .is('deleted_at', null)

      const premiumCount = patients?.filter(p => p.is_premium || p.status === 'premium').length || 0

      // Consultations
      const { data: consultations } = await supabase
        .from('consultations')
        .select('*, patients(name, is_premium, status)')
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
        messages: messages?.length || 0
      })

      setUpcomingAppointments(consultations || [])
    } catch (err) {
      console.error('Erreur chargement dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.teal.main }}
          />
          <p style={{ color: colors.gray.warm }}>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', padding: '32px' }}>
        <div className="max-w-7xl mx-auto">
          <h1 style={styles.heading.h1}>Tableau de bord</h1>
          <p style={{ color: colors.gray.warm, marginTop: '8px' }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Patients */}
          <div
            className="relative p-6 transition-all"
            style={{
              ...styles.card.base,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, styles.card.hover)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, styles.card.base)
            }}
          >
            <div style={styles.signatureBar} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: colors.teal.main, marginBottom: '8px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '14px', color: colors.gray.warm, fontWeight: 500 }}>
              Patients actifs
            </div>
          </div>

          {/* Premium */}
          <div
            className="relative p-6 transition-all"
            style={{
              ...styles.card.base,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, styles.card.hover)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, styles.card.base)
            }}
          >
            <div style={styles.signatureBar} />
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${colors.teal.main} 0%, ${colors.aubergine.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              {stats.premium}
            </div>
            <div style={{ fontSize: '14px', color: colors.gray.warm, fontWeight: 500 }}>
              Patients Premium
            </div>
          </div>

          {/* RDV */}
          <div
            className="relative p-6 transition-all"
            style={{
              ...styles.card.base,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, styles.card.hover)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, styles.card.base)
            }}
          >
            <div style={styles.signatureBar} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: colors.teal.main, marginBottom: '8px' }}>
              {stats.appointments}
            </div>
            <div style={{ fontSize: '14px', color: colors.gray.warm, fontWeight: 500 }}>
              RDV cette semaine
            </div>
          </div>

          {/* Messages */}
          <div
            className="relative p-6 transition-all"
            style={{
              ...styles.card.base,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, styles.card.hover)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, styles.card.base)
            }}
          >
            <div style={styles.signatureBar} />
            <div style={{ fontSize: '36px', fontWeight: 700, color: colors.gold, marginBottom: '8px' }}>
              {stats.messages}
            </div>
            <div style={{ fontSize: '14px', color: colors.gray.warm, fontWeight: 500 }}>
              Nouveaux messages
            </div>
          </div>
        </div>

        {/* Consultations à venir */}
        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E5E5E5' }}>
            <h2 style={styles.heading.h3}>Prochaines consultations</h2>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div>
              {upcomingAppointments.map((appt: any, index: number) => (
                <div
                  key={appt.id}
                  className="grid gap-4 sm:grid-cols-[2fr_1fr_140px] sm:items-center"
                  style={{
                    padding: '20px 24px',
                    borderBottom: index < upcomingAppointments.length - 1 ? '1px solid #F5F5F5' : 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FAFAFA'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      ...styles.avatar.small,
                      background: `linear-gradient(135deg, ${colors.teal.light} 0%, ${colors.teal.main} 100%)`,
                    }}>
                      {appt.patients?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: colors.gray.charcoal, fontSize: '14px' }}>
                        {appt.patients?.name || 'Non renseigné'}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.gray.warm }}>
                        {appt.notes || 'Non renseigné'}
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="sm:text-center">
                    {(appt.patients?.is_premium || appt.patients?.status === 'premium') ? (
                      <span style={styles.badgePremium}>Premium</span>
                    ) : (
                      <span style={styles.badgeStandard}>Standard</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="sm:text-right" style={{ fontSize: '13px', color: colors.gray.warm }}>
                    {new Date(appt.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long'
                    })} • {new Date(appt.date).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: colors.gray.warm }}>
              Aucune consultation programmée
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
