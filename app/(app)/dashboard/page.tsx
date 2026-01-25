'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { Toast } from '@/components/ui/Toast'
import { getNotifications, getPatients, getPractitionerCalendlyUrl } from '@/lib/queries'
import type { Notification, Patient } from '@/lib/types'

type ToastState = {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [notifications, setNotifications] = useState<(Notification & { patient?: Patient })[]>([])
  const [loading, setLoading] = useState(true)
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null)
  const [calendlyLoading, setCalendlyLoading] = useState(true)
  const [calendlyError, setCalendlyError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [patientsData, notificationsData] = await Promise.all([
          getPatients(),
          getNotifications(),
        ])
        setPatients(patientsData)
        setNotifications(notificationsData)
      } catch (error) {
        console.error('[dashboard] failed to load data', error)
        setToast({
          title: 'Erreur de chargement',
          description: error instanceof Error ? error.message : 'Impossible de charger le tableau de bord.',
          variant: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    let active = true

    const loadCalendly = async () => {
      setCalendlyLoading(true)
      setCalendlyError(null)
      try {
        const url = await getPractitionerCalendlyUrl()
        if (!active) return
        setCalendlyUrl(url)
      } catch (error) {
        if (!active) return
        console.error('[dashboard] failed to load calendly url', error)
        setCalendlyError(error instanceof Error ? error.message : 'Erreur inconnue.')
      } finally {
        if (active) {
          setCalendlyLoading(false)
        }
      }
    }

    loadCalendly()

    return () => {
      active = false
    }
  }, [])

  const handleOpenCalendly = () => {
    if (calendlyLoading) {
      setToast({
        title: 'Chargement en cours',
        description: 'Le lien Calendly est en cours de récupération.',
        variant: 'info',
      })
      return
    }

    if (calendlyError) {
      setToast({
        title: 'Lien Calendly indisponible',
        description: calendlyError,
        variant: 'error',
      })
      return
    }

    if (!calendlyUrl) {
      setToast({
        title: 'Lien Calendly manquant',
        description: 'Ajoutez votre lien dans Paramètres pour activer la prise de RDV.',
        variant: 'info',
      })
      return
    }

    window.open(calendlyUrl, '_blank', 'noopener,noreferrer')
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const premiumPatients = patients.filter((patient) => patient.is_premium)
  const recentPatients = [...patients].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

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
        <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 style={styles.heading.h1}>Tableau de bord</h1>
            <p style={{ color: colors.gray.warm, marginTop: '8px' }}>{today} — aperçu rapide</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/patients/new"
              style={{
                ...styles.button.secondary,
                textDecoration: 'none',
                display: 'inline-flex',
                justifyContent: 'center',
              }}
            >
              Nouveau patient
            </Link>
            <button
              type="button"
              style={{
                ...styles.button.primary,
                opacity: calendlyLoading ? 0.7 : 1,
              }}
              onClick={handleOpenCalendly}
              disabled={calendlyLoading}
            >
              {calendlyLoading ? 'Chargement…' : 'Prise de rendez-vous'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {calendlyError ? (
          <div
            style={{
              ...styles.card.base,
              borderColor: 'rgba(255, 154, 61, 0.4)',
              background: 'rgba(255, 154, 61, 0.08)',
              padding: '20px 24px',
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span style={{ color: colors.marine }}>Erreur Calendly : {calendlyError}</span>
              <button
                type="button"
                style={styles.button.secondary}
                onClick={() => {
                  setCalendlyError(null)
                  setCalendlyLoading(true)
                  getPractitionerCalendlyUrl()
                    .then((url) => {
                      setCalendlyUrl(url)
                    })
                    .catch((error) => {
                      console.error('[dashboard] retry calendly failed', error)
                      setCalendlyError(error instanceof Error ? error.message : 'Erreur inconnue.')
                    })
                    .finally(() => setCalendlyLoading(false))
                }}
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        {!calendlyLoading && !calendlyError && !calendlyUrl ? (
          <div
            style={{
              ...styles.card.base,
              borderColor: 'rgba(42, 128, 128, 0.2)',
              background: 'rgba(42, 128, 128, 0.06)',
              padding: '20px 24px',
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span style={{ color: colors.marine }}>
                Ajoutez votre lien Calendly dans Paramètres pour activer la prise de RDV.
              </span>
              <Link
                href="/settings"
                style={{
                  ...styles.button.secondary,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  justifyContent: 'center',
                }}
              >
                Aller aux paramètres
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div style={styles.card.base}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Notifications</h2>
              <p style={{ marginTop: '6px', fontSize: '12px', color: colors.gray.warm }}>
                Questionnaires, Circular, messages
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {notifications.length === 0 ? (
                <p style={{ fontSize: '13px', color: colors.gray.warm }}>Aucune notification</p>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.slice(0, 5).map((notification) => (
                    <li
                      key={notification.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #F0F0F0',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            marginTop: '6px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background:
                              notification.level === 'attention' ? colors.gold : colors.teal.main,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', color: colors.gray.charcoal }}>{notification.title}</p>
                          <p style={{ fontSize: '12px', color: colors.gray.warm, marginTop: '4px' }}>
                            {notification.description}
                          </p>
                          {notification.patient_id && (
                            <Link
                              href={`/patients/${notification.patient_id}`}
                              style={{
                                display: 'inline-block',
                                marginTop: '6px',
                                fontSize: '12px',
                                color: colors.teal.main,
                                textDecoration: 'none',
                              }}
                            >
                              Ouvrir le dossier
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div style={styles.card.base}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Patients</h2>
              <p style={{ marginTop: '6px', fontSize: '12px', color: colors.gray.warm }}>
                {patients.length} patient(s) au total
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {patients.length === 0 ? (
                <p style={{ fontSize: '13px', color: colors.gray.warm }}>Aucun patient</p>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {patients.slice(0, 4).map((patient) => (
                    <li
                      key={patient.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #F0F0F0',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/patients/${patient.id}`}
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: colors.gray.charcoal,
                            textDecoration: 'none',
                          }}
                        >
                          {patient.name}
                        </Link>
                        <p style={{ fontSize: '12px', color: colors.gray.warm, marginTop: '4px' }}>
                          {[patient.city, patient.age ? `${patient.age} ans` : null]
                            .filter(Boolean)
                            .join(' • ') || 'Non renseigné'}
                        </p>
                      </div>
                      <span
                        style={patient.is_premium ? styles.badgePremium : styles.badgeStandard}
                      >
                        {patient.is_premium ? 'Premium' : 'Standard'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div style={styles.card.base}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Patients premium</h2>
              <p style={{ marginTop: '6px', fontSize: '12px', color: colors.gray.warm }}>
                {premiumPatients.length} patient(s) premium
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {premiumPatients.length === 0 ? (
                <p style={{ fontSize: '13px', color: colors.gray.warm }}>Aucun patient premium</p>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {premiumPatients.slice(0, 4).map((patient) => (
                    <li
                      key={patient.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #F0F0F0',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/patients/${patient.id}`}
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: colors.gray.charcoal,
                            textDecoration: 'none',
                          }}
                        >
                          {patient.name}
                        </Link>
                        <p style={{ fontSize: '12px', color: colors.gray.warm, marginTop: '4px' }}>
                          {[patient.city, patient.age ? `${patient.age} ans` : null]
                            .filter(Boolean)
                            .join(' • ') || 'Non renseigné'}
                        </p>
                      </div>
                      <span style={styles.badgePremium}>Premium</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div style={styles.card.base}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Derniers patients ajoutés</h2>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {recentPatients.length === 0 ? (
              <p style={{ fontSize: '13px', color: colors.gray.warm }}>Aucun patient récent</p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentPatients.slice(0, 5).map((patient) => (
                  <li
                    key={patient.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #F0F0F0',
                      borderRadius: '4px',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        href={`/patients/${patient.id}`}
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: colors.gray.charcoal,
                          textDecoration: 'none',
                        }}
                      >
                        {patient.name}
                      </Link>
                      <p style={{ fontSize: '12px', color: colors.gray.warm, marginTop: '4px' }}>
                        Ajouté le {new Date(patient.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span
                      style={patient.is_premium ? styles.badgePremium : styles.badgeStandard}
                    >
                      {patient.is_premium ? 'Premium' : 'Standard'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  )
}
