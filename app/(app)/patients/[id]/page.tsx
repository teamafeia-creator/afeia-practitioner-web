'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/colors'
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
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: colors.teal.main }}
        ></div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b p-6">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 mb-4 hover:underline"
          style={{ color: colors.teal.main }}
        >
          ← Retour à la liste
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" style={{ color: colors.teal.deep }}>
                {patient.name}
              </h1>
              {(patient.is_premium || patient.status === 'premium') && (
                <span
                  className="text-sm px-3 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: colors.aubergine.light,
                    color: colors.aubergine.main,
                  }}
                >
                  ✨ Premium
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: colors.gray.warm }}>
              {patient.age && <span>{patient.age} ans</span>}
              {patient.city && <span>• {patient.city}</span>}
              {patient.consultation_reason && <span>• {patient.consultation_reason}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Résumé patient */}
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            📋 Résumé patient
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Email
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.email || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Ville
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.city || 'Non renseignée'}
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Âge
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.age ? `${patient.age} ans` : 'Non renseigné'}
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Téléphone
              </p>
              {/* NOTE: le champ téléphone n'existe pas dans la table patients. */}
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                Non renseigné
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Date de naissance
              </p>
              {/* NOTE: le champ date de naissance n'existe pas dans la table patients. */}
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                Non renseignée
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Statut
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.is_premium || patient.status === 'premium' ? 'Premium' : 'Standard'}
              </p>
            </div>
          </div>
        </div>

        {/* Prochaine consultation */}
        {nextConsultation ? (
          <div
            className="rounded-2xl p-6 shadow-sm border-t-4"
            style={{
              backgroundColor: colors.sand,
              borderColor: colors.teal.main,
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              📅 Prochain rendez-vous
            </h2>
            <p className="text-lg font-semibold mb-2" style={{ color: colors.gray.charcoal }}>
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
              <p className="text-sm" style={{ color: colors.gray.warm }}>
                {nextConsultation.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              📅 Rendez-vous
            </h2>
            <p style={{ color: colors.gray.warm }}>Aucun rendez-vous programmé</p>
          </div>
        )}

        {/* Activité récente */}
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            🔔 Activité récente
          </h2>
          {recentJournalEntries.length > 0 ? (
            <div className="space-y-3">
              {recentJournalEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold" style={{ color: colors.gray.charcoal }}>
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <span className="text-xs" style={{ color: colors.gray.warm }}>
                      Humeur: {entry.mood || 'Non renseignée'}
                    </span>
                    <span className="text-xs" style={{ color: colors.gray.warm }}>
                      Énergie: {entry.energy || 'Non renseignée'}
                    </span>
                  </div>
                  {entry.text && (
                    <p className="text-sm" style={{ color: colors.gray.warm }}>
                      {entry.text}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm mt-3">
                    <span
                      style={{
                        color: entry.adherence_hydratation ? colors.sage : colors.gray.warm,
                      }}
                    >
                      Hydratation {entry.adherence_hydratation ? '✅' : '⚠️'}
                    </span>
                    <span
                      style={{
                        color: entry.adherence_respiration ? colors.sage : colors.gray.warm,
                      }}
                    >
                      Respiration {entry.adherence_respiration ? '✅' : '⚠️'}
                    </span>
                    <span
                      style={{
                        color: entry.adherence_mouvement ? colors.sage : colors.gray.warm,
                      }}
                    >
                      Mouvement {entry.adherence_mouvement ? '✅' : '⚠️'}
                    </span>
                    <span
                      style={{
                        color: entry.adherence_plantes ? colors.sage : colors.gray.warm,
                      }}
                    >
                      Plantes {entry.adherence_plantes ? '✅' : '⚠️'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.gray.warm }}>Aucune entrée récente</p>
          )}
        </div>

        {/* Plan actif */}
        {patient.plan ? (
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
              💊 Plan de compléments
            </h2>
            <p className="text-lg font-semibold mb-1" style={{ color: colors.gray.charcoal }}>
              {latestPlanVersion?.title || 'Plan personnalisé'}
            </p>
            <p className="text-sm" style={{ color: colors.gray.warm }}>
              {latestPlanVersion?.sections
                ? `${latestPlanVersion.sections.length} section(s) au total`
                : 'Sections à configurer'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              💊 Plan de compléments
            </h2>
            <p style={{ color: colors.gray.warm }}>Aucun plan actif</p>
          </div>
        )}

        {/* Détails patient */}
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            🧾 Dossier complet
          </h2>
          <PatientTabs patient={patient} />
        </div>
      </div>
    </div>
  )
}
