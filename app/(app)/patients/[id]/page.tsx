'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PatientTabs } from '@/components/patients/PatientTabs'
import { Toast } from '@/components/ui/Toast'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { deletePatient, getPatientById } from '@/lib/queries'
import type { PatientWithDetails } from '@/lib/types'

type ToastState = {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

const dangerButton = {
  ...styles.button.primary,
  background: colors.aubergine.main,
}

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<PatientWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const router = useRouter()

  useEffect(() => {
    let active = true

    const load = async () => {
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

    load()

    return () => {
      active = false
    }
  }, [params.id])

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
      <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <div
            style={{
              ...styles.card.base,
              borderColor: 'rgba(255, 154, 61, 0.4)',
              background: 'rgba(255, 154, 61, 0.08)',
              padding: '16px 20px',
            }}
          >
            <p style={{ color: colors.marine, fontSize: '14px' }}>{error ?? 'Patient introuvable.'}</p>
          </div>
          <Link href="/patients" style={{ color: colors.teal.main, textDecoration: 'none', fontSize: '14px' }}>
            Retour à la liste des patients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', padding: '32px' }}>
        <div className="max-w-7xl mx-auto space-y-4">
          <Link
            href="/patients"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: colors.teal.main,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            ← Retour à la liste
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <h1 style={styles.heading.h1}>{patient.name}</h1>
                <span style={patient.is_premium ? styles.badgePremium : styles.badgeStandard}>
                  {patient.is_premium ? 'Premium' : 'Standard'}
                </span>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: colors.gray.warm }}>
                <span>{patient.age ? `${patient.age} ans` : 'Âge non renseigné'}</span>
                <span>{patient.city ?? 'Ville non renseignée'}</span>
                <span>{patient.email ?? 'Email non renseigné'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.email ? (
                <Link
                  href="/patient/login"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...styles.button.secondary,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    justifyContent: 'center',
                  }}
                >
                  Voir côté patient
                </Link>
              ) : null}
              <button
                type="button"
                style={dangerButton}
                onClick={() => {
                  setConfirmText('')
                  setShowDeleteModal(true)
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div style={styles.card.base}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
            <h2 style={styles.heading.h3}>Dossier complet</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <PatientTabs patient={patient} />
          </div>
        </div>
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div style={{ ...styles.card.base, maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h2 style={styles.heading.h3}>Supprimer ce patient</h2>
            <p style={{ marginTop: '8px', fontSize: '13px', color: colors.gray.warm }}>
              Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="SUPPRIMER"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  style={styles.button.secondary}
                  onClick={() => {
                    setConfirmText('')
                    setShowDeleteModal(false)
                  }}
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  style={dangerButton}
                  disabled={deleting || confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
                  onClick={async () => {
                    if (!patient) return
                    setDeleting(true)
                    try {
                      await deletePatient(patient.id)
                      setToast({
                        title: 'Patient supprimé',
                        description: 'Le patient a été retiré du CRM.',
                        variant: 'success',
                      })
                      setShowDeleteModal(false)
                      setTimeout(() => {
                        router.push('/patients')
                        router.refresh()
                      }, 600)
                    } catch (deleteError) {
                      console.error('Failed to delete patient', deleteError)
                      setToast({
                        title: 'Suppression impossible',
                        description:
                          deleteError instanceof Error ? deleteError.message : 'Erreur inconnue.',
                        variant: 'error',
                      })
                    } finally {
                      setDeleting(false)
                    }
                  }}
                >
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
