'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'
import { deletePatient, getPatientsWithUnreadCountsPaged } from '@/lib/queries'
import { Toast } from '@/components/ui/Toast'
import type { PatientWithUnreadCounts } from '@/lib/types'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dangerButton = {
  ...styles.button.primary,
  background: colors.aubergine.main,
}

const attentionBadge = {
  ...styles.badgeStandard,
  background: 'rgba(255, 154, 61, 0.16)',
  color: colors.marine,
}

const infoBadge = {
  ...styles.badgeStandard,
  background: 'rgba(42, 128, 128, 0.08)',
  color: colors.teal.main,
}

function formatDate(value: string | null) {
  if (!value) return 'Non renseigné'
  return DATE_FORMATTER.format(new Date(value))
}

type ToastState = {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'info'
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithUnreadCounts[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialSearch = searchParams.get('search') ?? ''
  const initialPage = Number(searchParams.get('page') ?? '1')
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(Number.isNaN(initialPage) ? 1 : Math.max(1, initialPage))
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientWithUnreadCounts | null>(null)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { patients: data, total } = await getPatientsWithUnreadCountsPaged({
          page,
          pageSize,
          search,
        })
        if (!isMounted) return
        setPatients(data)
        setTotalCount(total)
      } catch (err) {
        if (!isMounted) return
        console.error('[patients] failed to load list', err)
        setError(err instanceof Error ? err.message : 'Impossible de charger les patients.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [page, pageSize, search])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) {
      params.set('search', search.trim())
    }
    if (page > 1) {
      params.set('page', String(page))
    }
    const next = params.toString()
    router.replace(`${pathname}${next ? `?${next}` : ''}`)
  }, [page, pathname, router, search])

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
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 style={styles.heading.h1}>Patients</h1>
            <p style={{ color: colors.gray.warm, marginTop: '8px' }}>{totalCount} patient(s) au total</p>
          </div>
          <Link
            href="/patients/new"
            style={{
              ...styles.button.primary,
              textDecoration: 'none',
              display: 'inline-flex',
              justifyContent: 'center',
            }}
          >
            Nouveau patient
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-5">
        <input
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: search ? `2px solid ${colors.teal.main}` : '2px solid #E5E5E5',
            borderRadius: '4px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />

        {error ? (
          <div
            style={{
              ...styles.card.base,
              borderColor: 'rgba(255, 154, 61, 0.4)',
              background: 'rgba(255, 154, 61, 0.08)',
              padding: '16px 20px',
            }}
          >
            <p style={{ color: colors.marine, fontSize: '14px' }}>{error}</p>
          </div>
        ) : null}

        <div style={styles.card.base}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5F5F5' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 style={styles.heading.h3}>CRM patients</h2>
                <p style={{ marginTop: '6px', fontSize: '12px', color: colors.gray.warm }}>
                  {totalCount} patients
                </p>
              </div>
              <div style={{ fontSize: '12px', color: colors.gray.warm }}>
                Page {page} / {pageCount}
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {patients.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  border: '1px dashed #E5E5E5',
                  borderRadius: '4px',
                  background: '#FAFAFA',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: 600, color: colors.gray.charcoal }}>
                  Aucun patient trouvé
                </p>
                <p style={{ marginTop: '8px', fontSize: '12px', color: colors.gray.warm }}>
                  Commencez par créer un premier patient pour alimenter votre CRM.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <Link
                    href="/patients/new"
                    style={{
                      ...styles.button.primary,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      justifyContent: 'center',
                    }}
                  >
                    Créer un patient
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '2.2fr 0.9fr 1fr 1fr 1.2fr 120px',
                    gap: '16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.gray.warm,
                  }}
                >
                  <div>Patient</div>
                  <div>Statut</div>
                  <div>Messages non lus</div>
                  <div>Notifications</div>
                  <div>Dernière consultation</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    style={{
                      border: '1px solid #E5E5E5',
                      borderRadius: '4px',
                      padding: '16px',
                      background: '#FFFFFF',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer',
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        router.push(`/patients/${patient.id}`)
                      }
                    }}
                    onMouseEnter={(event) => {
                      Object.assign(event.currentTarget.style, styles.card.hover)
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.borderColor = '#E5E5E5'
                      event.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div className="grid gap-4 md:grid-cols-[2.2fr_0.9fr_1fr_1fr_1.2fr_120px] md:items-center">
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/patients/${patient.id}`}
                          style={{
                            fontWeight: 600,
                            color: colors.gray.charcoal,
                            textDecoration: 'none',
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {patient.name}
                        </Link>
                        <p style={{ fontSize: '13px', color: colors.gray.warm, marginTop: '4px' }}>
                          {[patient.age ? `${patient.age} ans` : null, patient.city]
                            .filter(Boolean)
                            .join(' • ') || 'Non renseigné'}
                        </p>
                      </div>
                      <div>
                        <span style={patient.is_premium ? styles.badgePremium : styles.badgeStandard}>
                          {patient.is_premium ? 'Premium' : 'Standard'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: colors.marine }}>
                        {patient.unreadMessages > 0 ? (
                          <span style={infoBadge}>{patient.unreadMessages} non lus</span>
                        ) : (
                          <span style={{ color: colors.gray.warm }}>0</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: colors.marine }}>
                        {patient.unreadNotifications > 0 ? (
                          <span style={attentionBadge}>{patient.unreadNotifications} non vues</span>
                        ) : (
                          <span style={{ color: colors.gray.warm }}>0</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: colors.marine }}>
                        {formatDate(patient.lastConsultationAt)}
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                        <div className="flex flex-wrap items-center gap-2 md:hidden">
                          <Link
                            href={`/patients/${patient.id}`}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                              ...styles.button.secondary,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              justifyContent: 'center',
                            }}
                          >
                            Voir
                          </Link>
                          <button
                            type="button"
                            aria-label="Ouvrir les actions"
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenActionMenuId((prev) => (prev === patient.id ? null : patient.id))
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '4px',
                              border: '1px solid #E5E5E5',
                              color: colors.gray.warm,
                              background: 'white',
                            }}
                          >
                            ⋯
                          </button>
                          {openActionMenuId === patient.id ? (
                            <div
                              style={{
                                width: '100%',
                                border: '1px solid #E5E5E5',
                                background: 'white',
                                padding: '12px',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(42, 128, 128, 0.08)',
                              }}
                            >
                              <button
                                type="button"
                                style={{ ...dangerButton, width: '100%' }}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedPatient(patient)
                                  setConfirmText('')
                                  setShowDeleteModal(true)
                                  setOpenActionMenuId(null)
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="relative hidden items-center justify-end gap-2 md:flex">
                          <Link
                            href={`/patients/${patient.id}`}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                              ...styles.button.secondary,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              justifyContent: 'center',
                            }}
                          >
                            Voir
                          </Link>
                          <button
                            type="button"
                            aria-label="Ouvrir les actions"
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenActionMenuId((prev) => (prev === patient.id ? null : patient.id))
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '4px',
                              border: '1px solid #E5E5E5',
                              color: colors.gray.warm,
                              background: 'white',
                            }}
                          >
                            ⋯
                          </button>
                          {openActionMenuId === patient.id ? (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '44px',
                                width: '176px',
                                border: '1px solid #E5E5E5',
                                background: 'white',
                                padding: '12px',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(42, 128, 128, 0.08)',
                                zIndex: 10,
                              }}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #E5E5E5',
                                  background: 'white',
                                  fontSize: '13px',
                                  color: colors.gray.charcoal,
                                }}
                                onClick={() => {
                                  setSelectedPatient(patient)
                                  setConfirmText('')
                                  setShowDeleteModal(true)
                                  setOpenActionMenuId(null)
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            ...styles.card.base,
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', color: colors.gray.warm }}>{totalCount} patients</div>
          <div className="flex flex-wrap items-center gap-3">
            <span style={{ fontSize: '13px', color: colors.gray.warm }}>
              Page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                style={styles.button.secondary}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                Précédent
              </button>
              <button
                type="button"
                style={styles.button.secondary}
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={page >= pageCount}
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && selectedPatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div style={{ ...styles.card.base, maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h2 style={styles.heading.h3}>Supprimer ce patient</h2>
            <p style={{ marginTop: '8px', fontSize: '13px', color: colors.gray.warm }}>
              Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression de{' '}
              <strong>{selectedPatient.name}</strong>.
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
                    setSelectedPatient(null)
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
                    if (!selectedPatient) return
                    setDeleting(true)
                    try {
                      await deletePatient(selectedPatient.id)
                      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id))
                      setTotalCount((prev) => Math.max(0, prev - 1))
                      setToast({
                        title: 'Patient supprimé',
                        description: `${selectedPatient.name} a été retiré du CRM.`,
                        variant: 'success',
                      })
                      setShowDeleteModal(false)
                      setSelectedPatient(null)
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
