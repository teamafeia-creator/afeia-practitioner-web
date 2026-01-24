'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { supabase } from '@/lib/supabase'
import type { Consultation, Patient } from '@/lib/types'

type ConsultationWithPatient = Consultation & {
  patients?: Pick<Patient, 'id' | 'name' | 'is_premium' | 'status'> | null
}

type RecentActivityItem = {
  type: 'journal' | 'message' | 'circular'
  patient: string
  time: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, premium: 0, appointments: 0, messages: 0 })
  const [upcomingAppointments, setUpcomingAppointments] = useState<ConsultationWithPatient[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_premium, status')
        .eq('practitioner_id', user!.id)
        .is('deleted_at', null)

      const premiumCount = patients?.filter((p) => p.is_premium || p.status === 'premium').length || 0
      const patientIds = patients?.map((patient) => patient.id) ?? []

      if (patientIds.length === 0) {
        setStats({
          total: 0,
          premium: 0,
          appointments: 0,
          messages: 0,
        })
        setUpcomingAppointments([])
        setRecentActivity([])
        setLoading(false)
        return
      }

      const now = new Date()
      const weekEnd = new Date()
      weekEnd.setDate(now.getDate() + 7)

      const { data: consultations } = await supabase
        .from('consultations')
        .select('*, patients(name, is_premium, status)')
        .in('patient_id', patientIds)
        .gte('date', now.toISOString())
        .order('date', { ascending: true })
        .limit(5)

      const { data: weekConsultations } = await supabase
        .from('consultations')
        .select('id')
        .in('patient_id', patientIds)
        .gte('date', now.toISOString())
        .lte('date', weekEnd.toISOString())

      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_role', 'patient')
        .is('read_by_practitioner', false)
        .in('patient_id', patientIds)

      setStats({
        total: patients?.length || 0,
        premium: premiumCount,
        appointments: weekConsultations?.length || 0,
        messages: messages?.length || 0,
      })

      setUpcomingAppointments(consultations || [])

      setRecentActivity([
        { type: 'journal', patient: 'Marie Dupont', time: '2h' },
        { type: 'message', patient: 'Julie Bernard', time: '5h' },
        { type: 'circular', patient: 'Laura Petit', time: '1j' },
      ])
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
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', padding: '32px' }}>
        <div className="max-w-7xl mx-auto">
          <h1 style={styles.heading.h1}>Tableau de bord</h1>
          <p style={{ color: colors.gray.warm, marginTop: '8px' }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            — aperçu rapide
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${colors.teal.main} 0%, ${colors.aubergine.main} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '8px',
              }}
            >
              {stats.premium}
            </div>
            <div style={{ fontSize: '14px', color: colors.gray.warm, fontWeight: 500 }}>
              Patients Premium
            </div>
          </div>

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

        <div style={{ ...styles.card.base, position: 'relative' }}>
          <div style={styles.signatureBar} />
          <div style={{ padding: '24px', borderBottom: '1px solid #E5E5E5' }}>
            <h2 style={styles.heading.h3}>Prochaines consultations</h2>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div>
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #F5F5F5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div style={{ fontSize: '13px', color: colors.gray.warm, marginBottom: '6px' }}>
                        {new Date(appt.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}{' '}
                        •{' '}
                        {new Date(appt.date).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div style={{ fontWeight: 600, color: colors.gray.charcoal, fontSize: '15px' }}>
                        {appt.patients?.name || 'Non renseigné'}
                      </div>
                      <div style={{ fontSize: '13px', color: colors.gray.warm, marginTop: '4px' }}>
                        {appt.notes || 'Consultation de suivi'}
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div>
                        {appt.patients?.is_premium || appt.patients?.status === 'premium' ? (
                          <span style={styles.badgePremium}>Premium</span>
                        ) : (
                          <span style={styles.badgeStandard}>Standard</span>
                        )}
                      </div>
                      <Link
                        href={`/consultations/${appt.id}`}
                        style={{
                          ...styles.button.primary,
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Démarrer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', color: colors.gray.warm }}>Aucune consultation programmée</div>
          )}
        </div>

        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E5E5E5' }}>
            <h2 style={styles.heading.h3}>Activité récente</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((activity, index) => (
              <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: colors.gray.charcoal }}>{activity.patient}</span>
                <span style={{ color: colors.gray.warm }}>
                  {activity.type === 'journal' && 'a rempli son journal'}
                  {activity.type === 'message' && 'a envoyé un message'}
                  {activity.type === 'circular' && 'a complété son circular'}
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
