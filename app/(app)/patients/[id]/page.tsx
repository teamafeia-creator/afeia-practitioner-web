'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { supabase } from '@/lib/supabase'

const tabs = [
  { id: 'overview', label: 'Vue d\'ensemble', href: '' },
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
        .select(`
          *,
          supplement_items(*)
        `)
        .eq('patient_id', params.id)
        .eq('is_active', true)
        .maybeSingle()

      setActivePlan(plan)

      // Activité récente
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: colors.teal.main }}
        />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <p>Patient introuvable</p>
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
            ← Retour à la liste
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
                <span>{patient.pathology || 'Non renseigné'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', overflowX: 'auto' }}>
        <div className="max-w-7xl mx-auto flex" style={{ gap: '32px', padding: '0 32px' }}>
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/patients/${params.id}${tab.href}`}
              style={{
                padding: '16px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: tab.id === 'overview' ? colors.teal.main : colors.gray.warm,
                textDecoration: 'none',
                borderBottom: tab.id === 'overview' ? `2px solid ${colors.teal.main}` : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
              }}
            >
              {tab.label}
            </Link>
          ))}
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
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Téléphone</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.phone || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Date de naissance</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.date_of_birth
                  ? new Date(patient.date_of_birth).toLocaleDateString('fr-FR')
                  : 'Non renseignée'
                }
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: colors.gray.warm, marginBottom: '4px' }}>Statut</p>
              <p style={{ fontWeight: 600, color: colors.gray.charcoal }}>
                {patient.is_premium || patient.status === 'premium' ? 'Premium' : 'Standard'}
              </p>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F5F5F5' }}>
            <Link
              href={`/patients/${params.id}/profile`}
              style={{ fontSize: '14px', fontWeight: 600, color: colors.teal.main, textDecoration: 'none' }}
            >
              Voir le profil complet →
            </Link>
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
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={styles.button.secondary}>
                  Modifier
                </button>
                <Link
                  href={`/patients/${params.id}/appointments`}
                  style={{ fontSize: '14px', fontWeight: 600, color: colors.teal.main, textDecoration: 'none', alignSelf: 'center' }}
                >
                  Voir tous les rendez-vous →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.card.base}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Rendez-vous</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: colors.gray.warm, marginBottom: '16px' }}>Aucun rendez-vous programmé</p>
              <button style={styles.button.primary}>
                Programmer un rendez-vous
              </button>
            </div>
          </div>
        )}

        {/* Activité récente */}
        {recentActivity.length > 0 && (
          <div style={styles.card.base}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Activité récente</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentActivity.map((log: any) => (
                  <div key={log.id} style={{
                    padding: '16px',
                    background: '#FAFAFA',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '8px' }}>
                      {new Date(log.log_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <span style={{ color: log.good_nutrition ? colors.sage : colors.gray.warm }}>
                        Nutrition {log.good_nutrition ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: log.good_sleep ? colors.sage : colors.gray.warm }}>
                        Sommeil {log.good_sleep ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: log.good_mood ? colors.sage : colors.gray.warm }}>
                        Humeur {log.good_mood ? 'Oui' : 'Non'}
                      </span>
                      <span style={{ color: log.supplements_taken ? colors.sage : colors.gray.warm }}>
                        Compléments {log.supplements_taken ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    {log.note_for_practitioner && (
                      <p style={{ fontSize: '13px', color: colors.gray.warm, fontStyle: 'italic', marginTop: '8px' }}>
                        "{log.note_for_practitioner}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F5F5F5' }}>
              <Link
                href={`/patients/${params.id}/journal`}
                style={{ fontSize: '14px', fontWeight: 600, color: colors.teal.main, textDecoration: 'none' }}
              >
                Voir le journal complet →
              </Link>
            </div>
          </div>
        )}

        {/* Plan actif */}
        {activePlan ? (
          <div style={{ ...styles.card.base, position: 'relative' }}>
            <div style={styles.signatureBar} />
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Plan de compléments actif</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.gray.charcoal, marginBottom: '8px' }}>
                {activePlan.plan_name || 'Non renseigné'}
              </p>
              {activePlan.start_date && (
                <p style={{ fontSize: '13px', color: colors.gray.warm, marginBottom: '16px' }}>
                  Du {new Date(activePlan.start_date).toLocaleDateString('fr-FR')}
                  {activePlan.end_date && ` au ${new Date(activePlan.end_date).toLocaleDateString('fr-FR')}`}
                </p>
              )}

              {activePlan.supplement_items && activePlan.supplement_items.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  {activePlan.supplement_items.slice(0, 3).map((item: any) => (
                    <div key={item.id} style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                      <span style={{ opacity: 0.6 }}>•</span>
                      <span style={{ color: colors.gray.charcoal }}>
                        <strong>{item.name}</strong> - {item.frequency}
                      </span>
                    </div>
                  ))}
                  {activePlan.supplement_items.length > 3 && (
                    <p style={{ fontSize: '13px', fontStyle: 'italic', color: colors.gray.warm }}>
                      + {activePlan.supplement_items.length - 3} autres compléments
                    </p>
                  )}
                </div>
              )}

              <Link
                href={`/patients/${params.id}/plans`}
                style={{ fontSize: '14px', fontWeight: 600, color: colors.teal.main, textDecoration: 'none' }}
              >
                Voir le plan complet →
              </Link>
            </div>
          </div>
        ) : (
          <div style={styles.card.base}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F5F5F5' }}>
              <h2 style={styles.heading.h3}>Plan de compléments</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: colors.gray.warm, marginBottom: '16px' }}>Aucun plan actif</p>
              <button style={styles.button.primary}>
                Créer un plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
