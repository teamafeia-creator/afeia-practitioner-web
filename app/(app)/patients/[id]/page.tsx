'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { getPatientById } from '@/lib/queries'
import { PatientTabs } from '@/components/patients/PatientTabs'
import type { Consultation, JournalEntry, PatientWithDetails } from '@/lib/types'

type RecentJournalEntry = Pick<JournalEntry, 'id' | 'date' | 'mood' | 'energy' | 'text'> &
  Pick<JournalEntry, 'adherence_hydratation' | 'adherence_respiration' | 'adherence_mouvement' | 'adherence_plantes'>

const getNextConsultation = (consultations: Consultation[]) => {
  const now = new Date()
  return consultations
    .filter((consultation) => new Date(consultation.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

export default function PatientOverviewPage() {
  const params = useParams()

  const [patient, setPatient] = useState<PatientWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadPatient = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPatientById(params.id as string)
        if (!active) return
        if (!data) {
          setError('Patient introuvable.')
          setPatient(null)
        } else {
          setPatient(data)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Impossible de charger le dossier patient.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPatient()

    return () => {
      active = false
    }
  }, [params.id])

  const nextConsultation = useMemo(() => {
    if (!patient?.consultations) return null
    return getNextConsultation(patient.consultations)
  }, [patient?.consultations])

  const recentJournalEntries: RecentJournalEntry[] = useMemo(() => {
    return (patient?.journal_entries ?? []).slice(0, 3)
  }, [patient?.journal_entries])

  const latestPlanVersion = useMemo(() => {
    return patient?.plan?.versions?.[0]
  }, [patient?.plan?.versions])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: colors.teal.main }}
        />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="text-center space-y-3">
          <p style={{ color: colors.gray.warm }}>{error ?? 'Patient introuvable.'}</p>
          <Link
            href="/patients"
            style={{ color: colors.teal.main, textDecoration: 'none', fontWeight: 600 }}
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', padding: '32px' }}>
        <div className="max-w-7xl mx-auto">
          <Link
            href="/patients"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              color: colors.teal.main,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Retour à la liste
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={styles.heading.h1}>{patient.name || 'Non renseigné'}</h1>
                {(patient.is_premium || patient.status === 'premium') && (
                  <span style={styles.badgePremium}>Premium</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: colors.gray.warm }}>
                <span>{patient.age ? `${patient.age} ans` : 'Non renseigné'}</span>
                <span>•</span>
                <span>{patient.city || 'Non renseigné'}</span>
                <span>•</span>
                <span>{patient.consultation_reason || 'Non renseigné'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        {/* Résumé */}
        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Résumé patient</h2>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Email</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.email || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Ville</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.city || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Âge</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.age ? `${patient.age} ans` : 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Statut</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.is_premium || patient.status === 'premium' ? 'Premium' : 'Standard'}
              </p>
            </div>
          </div>
        </div>

        {/* Prochaine consultation */}
        {nextConsultation ? (
          <div style={{ ...styles.card.base, position: 'relative' }}>
            <div style={styles.signatureBar} />
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Prochain rendez-vous</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '16px' }}>
                {new Date(nextConsultation.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })} à {new Date(nextConsultation.date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {nextConsultation.notes && (
                <p style={{ fontSize: '13px', color: colors.gray.warm }}>{nextConsultation.notes}</p>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.card.base}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Rendez-vous</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: colors.gray.warm }}>Aucun rendez-vous programmé</p>
            </div>
          </div>
        )}

        {/* Activité récente */}
        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Activité récente</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {recentJournalEntries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentJournalEntries.map((entry) => (
                  <div key={entry.id} style={{
                    padding: '16px',
                    background: '#FAFAFA',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '8px' }}>
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                      <span style={{ color: colors.gray.warm }}>
                        Humeur {entry.mood || 'Non renseigné'}
                      </span>
                      <span style={{ color: colors.gray.warm }}>
                        Énergie {entry.energy || 'Non renseigné'}
                      </span>
                    </div>
                    {entry.text && (
                      <p style={{ fontSize: '13px', color: colors.gray.warm, marginTop: '8px' }}>
                        {entry.text}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <span style={{ color: entry.adherence_hydratation ? colors.sage : colors.gray.warm }}>
                        Hydratation {entry.adherence_hydratation ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_respiration ? colors.sage : colors.gray.warm }}>
                        Respiration {entry.adherence_respiration ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_mouvement ? colors.sage : colors.gray.warm }}>
                        Mouvement {entry.adherence_mouvement ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_plantes ? colors.sage : colors.gray.warm }}>
                        Plantes {entry.adherence_plantes ? 'Oui' : 'Non'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.gray.warm }}>Aucune entrée récente</p>
            )}
          </div>
        </div>

        {/* Plan actif */}
        {patient.plan ? (
          <div style={{ ...styles.card.base, position: 'relative' }}>
            <div style={styles.signatureBar} />
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Plan de compléments</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '8px' }}>
                {latestPlanVersion?.title || 'Non renseigné'}
              </p>
              <p style={{ fontSize: '13px', color: colors.gray.warm }}>
                {latestPlanVersion?.sections
                  ? `${latestPlanVersion.sections.length} section(s) au total`
                  : 'Sections à configurer'}
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.card.base}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Plan de compléments</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: colors.gray.warm }}>Aucun plan actif</p>
            </div>
          </div>
        )}

        {/* Dossier complet */}
        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Dossier complet</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <PatientTabs patient={patient} />
          </div>
        </div>
      </div>
    </div>
  )
}
