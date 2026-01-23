'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { supabase } from '@/lib/supabase'

const tabs = [
  { id: 'overview', label: "📋 Vue d'ensemble", href: '' },
  { id: 'profile', label: 'Profil', href: '/profile' },
  { id: 'appointments', label: 'Rendez-vous', href: '/appointments' },
  { id: 'anamnesis', label: 'Anamnèse', href: '/anamnesis' },
  { id: 'circular', label: 'Circular', href: '/circular' },
  { id: 'journal', label: 'Journal', href: '/journal' },
  { id: 'notes', label: 'Notes', href: '/notes' },
  { id: 'messages', label: 'Messages', href: '/messages' },
]

export default function PatientOverviewPage() {
  const params = useParams()

  const [patient, setPatient] = useState<any>(null)
  const [nextConsultation, setNextConsultation] = useState<any>(null)
  const [activePlan, setActivePlan] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPatientData()
  }, [params.id])

  const loadPatientData = async () => {
    try {
      // Patient
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', params.id)
        .single()

      setPatient(patientData)

      // Prochaine consultation
      const { data: nextAppt } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', params.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()

      setNextConsultation(nextAppt)

      // Plan actif
      const { data: plan } = await supabase
        .from('plans')
        .select(
          `
          *,
          supplement_items(*)
        `
        )
        .eq('patient_id', params.id)
        .eq('is_active', true)
        .maybeSingle()

      setActivePlan(plan)

      // Activité récente (Daily logs)
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', params.id)
        .order('log_date', { ascending: false })
        .limit(3)

      setRecentActivity(logs || [])
    } catch (err) {
      console.error('Erreur chargement patient:', err)
    } finally {
      setLoading(false)
    }
  }

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

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Patient introuvable</p>
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
            <div className="flex gap-4 text-sm" style={{ color: colors.gray.warm }}>
              {patient.age && <span>{patient.age} ans</span>}
              {patient.city && <span>• {patient.city}</span>}
              {patient.pathology && <span>• {patient.pathology}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation à onglets */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-6 px-6">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/patients/${params.id}${tab.href}`}
              className={`py-4 px-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab.id === 'overview'
                  ? 'border-current'
                  : 'border-transparent hover:border-current'
              }`}
              style={{
                color: tab.id === 'overview' ? colors.teal.main : colors.gray.warm,
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Contenu - Vue d'ensemble */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Résumé patient */}
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
            📋 Résumé patient
          </h2>
          <div className="grid grid-cols-2 gap-4">
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
                Téléphone
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.phone || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.gray.warm }}>
                Date de naissance
              </p>
              <p className="font-semibold" style={{ color: colors.gray.charcoal }}>
                {patient.date_of_birth
                  ? new Date(patient.date_of_birth).toLocaleDateString('fr-FR')
                  : 'Non renseignée'}
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
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'white' }}>
            <Link
              href={`/patients/${params.id}/profile`}
              className="text-sm font-semibold hover:underline"
              style={{ color: colors.teal.main }}
            >
              → Voir le profil complet
            </Link>
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
            <div className="flex gap-3 mt-4">
              <Link
                href={`/patients/${params.id}/appointments`}
                className="px-4 py-2 rounded-lg border-2 font-semibold hover:shadow-md transition-all"
                style={{
                  borderColor: colors.teal.main,
                  color: colors.teal.main,
                }}
              >
                Modifier
              </Link>
              <Link
                href={`/patients/${params.id}/appointments`}
                className="text-sm font-semibold hover:underline self-center"
                style={{ color: colors.teal.main }}
              >
                → Voir tous les rendez-vous
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              📅 Rendez-vous
            </h2>
            <p style={{ color: colors.gray.warm }}>Aucun rendez-vous programmé</p>
            <Link
              href={`/patients/${params.id}/appointments`}
              className="inline-block mt-4 px-4 py-2 rounded-lg font-semibold text-white hover:shadow-md transition-all"
              style={{ backgroundColor: colors.gold }}
            >
              + Programmer un rendez-vous
            </Link>
          </div>
        )}

        {/* Activité récente */}
        {recentActivity.length > 0 && (
          <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              🔔 Activité récente
            </h2>
            <div className="space-y-3">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold" style={{ color: colors.gray.charcoal }}>
                      {new Date(log.log_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span style={{ color: log.good_nutrition ? colors.sage : colors.gray.warm }}>
                      Nutrition {log.good_nutrition ? '✅' : '⚠️'}
                    </span>
                    <span style={{ color: log.good_sleep ? colors.sage : colors.gray.warm }}>
                      Sommeil {log.good_sleep ? '✅' : '⚠️'}
                    </span>
                    <span style={{ color: log.good_mood ? colors.sage : colors.gray.warm }}>
                      Humeur {log.good_mood ? '✅' : '⚠️'}
                    </span>
                    <span
                      style={{ color: log.supplements_taken ? colors.sage : colors.gray.warm }}
                    >
                      Compléments {log.supplements_taken ? '✅' : '⚠️'}
                    </span>
                  </div>
                  {log.note_for_practitioner && (
                    <p className="text-sm mt-2 italic" style={{ color: colors.gray.warm }}>
                      "{log.note_for_practitioner}"
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'white' }}>
              <Link
                href={`/patients/${params.id}/journal`}
                className="text-sm font-semibold hover:underline"
                style={{ color: colors.teal.main }}
              >
                → Voir le journal complet
              </Link>
            </div>
          </div>
        )}

        {/* Plan actif */}
        {activePlan ? (
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
              💊 Plan de compléments actif
            </h2>
            <p className="text-lg font-semibold mb-4" style={{ color: colors.gray.charcoal }}>
              {activePlan.plan_name || 'Plan personnalisé'}
            </p>
            {activePlan.start_date && (
              <p className="text-sm mb-4" style={{ color: colors.gray.warm }}>
                Du {new Date(activePlan.start_date).toLocaleDateString('fr-FR')}
                {activePlan.end_date &&
                  ` au ${new Date(activePlan.end_date).toLocaleDateString('fr-FR')}`}
              </p>
            )}

            {activePlan.supplement_items && activePlan.supplement_items.length > 0 && (
              <div className="space-y-2 mb-4">
                {activePlan.supplement_items.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="text-sm flex items-center gap-2">
                    <span>•</span>
                    <span style={{ color: colors.gray.charcoal }}>
                      <strong>{item.name}</strong> - {item.frequency}
                    </span>
                  </div>
                ))}
                {activePlan.supplement_items.length > 3 && (
                  <p className="text-sm italic" style={{ color: colors.gray.warm }}>
                    + {activePlan.supplement_items.length - 3} autres compléments
                  </p>
                )}
              </div>
            )}

            <Link
              href={`/patients/${params.id}/plans`}
              className="inline-block text-sm font-semibold hover:underline"
              style={{ color: colors.teal.main }}
            >
              → Voir le plan complet
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: colors.sand }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.teal.deep }}>
              💊 Plan de compléments
            </h2>
            <p style={{ color: colors.gray.warm }}>Aucun plan actif</p>
            <Link
              href={`/patients/${params.id}/plans`}
              className="inline-block mt-4 px-4 py-2 rounded-lg font-semibold text-white hover:shadow-md transition-all"
              style={{ backgroundColor: colors.gold }}
            >
              + Créer un plan
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
