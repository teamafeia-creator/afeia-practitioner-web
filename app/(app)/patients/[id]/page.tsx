'use client'

import { useEffect, useMemo, useState } from 'react'
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

export default function PatientOverviewPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<PatientWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadPatient = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPatientById(params.id)
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
      <div className="space-y-4" style={{ padding: '24px' }}>
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: colors.gold }}>
          {error ?? 'Patient introuvable.'}
        </div>
        <Link href="/patients" className="text-sm hover:underline" style={{ color: colors.teal.main }}>
          Retour à la liste des patients
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
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
            ← Retour à la liste
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={styles.heading.h1}>{patient.name}</h1>
                {(patient.is_premium || patient.status === 'premium') && (
                  <span style={styles.badgePremium}>Premium</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: colors.gray.warm }}>
                {patient.age && <span>{patient.age} ans</span>}
                {patient.city && <span>• {patient.city}</span>}
                {patient.consultation_reason && <span>• {patient.consultation_reason}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Résumé patient</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ padding: '24px' }}>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Email</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.email || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Ville</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.city || 'Non renseignée'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Âge</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.age ? `${patient.age} ans` : 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Téléphone</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>Non renseigné</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Date de naissance</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>Non renseignée</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Statut</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.is_premium || patient.status === 'premium' ? 'Premium' : 'Standard'}
              </p>
            </div>
          </div>
        </div>

        {nextConsultation ? (
          <div style={{ ...styles.card.base, position: 'relative' }}>
            <div style={styles.signatureBar} />
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Prochain rendez-vous</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '8px' }}>
                {new Date(nextConsultation.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                à{' '}
                {new Date(nextConsultation.date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
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
            <div style={{ padding: '24px', color: colors.gray.warm }}>Aucun rendez-vous programmé</div>
          </div>
        )}

        <div style={styles.card.base}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Activité récente</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {recentJournalEntries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentJournalEntries.map((entry) => (
                  <div key={entry.id} style={{ background: '#FAFAFA', padding: '16px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: colors.gray.charcoal }}>
                        {new Date(entry.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span style={{ fontSize: '12px', color: colors.gray.warm }}>
                        Humeur: {entry.mood || 'Non renseignée'}
                      </span>
                      <span style={{ fontSize: '12px', color: colors.gray.warm }}>
                        Énergie: {entry.energy || 'Non renseignée'}
                      </span>
                    </div>
                    {entry.text && (
                      <p style={{ fontSize: '13px', color: colors.gray.warm }}>{entry.text}</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', marginTop: '12px' }}>
                      <span style={{ color: entry.adherence_hydratation ? colors.sage : colors.gray.warm }}>
                        Hydratation {entry.adherence_hydratation ? 'OK' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_respiration ? colors.sage : colors.gray.warm }}>
                        Respiration {entry.adherence_respiration ? 'OK' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_mouvement ? colors.sage : colors.gray.warm }}>
                        Mouvement {entry.adherence_mouvement ? 'OK' : 'Non'}
                      </span>
                      <span style={{ color: entry.adherence_plantes ? colors.sage : colors.gray.warm }}>
                        Plantes {entry.adherence_plantes ? 'OK' : 'Non'}
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

        {patient.plan ? (
          <div style={{ ...styles.card.base, position: 'relative' }}>
            <div style={styles.signatureBar} />
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Plan de compléments</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '4px' }}>
                {latestPlanVersion?.title || 'Plan personnalisé'}
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
            <div style={{ padding: '24px', color: colors.gray.warm }}>Aucun plan actif</div>
          </div>
        )}

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
