'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { colors } from '@/lib/colors'
import { styles } from '@/lib/styles'

export default function PatientsPage() {
  const supabase = createClientComponentClient()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('practitioner_id', user!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      setPatients(data || [])
    } catch (err) {
      console.error('Erreur chargement patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
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
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E5E5', padding: '32px' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 style={styles.heading.h1}>Patients</h1>
            <p style={{ color: colors.gray.warm, marginTop: '8px' }}>
              {patients.length} patient(s) au total
            </p>
          </div>
          <Link
            href="/patients/new"
            style={{
              ...styles.button.primary,
              textDecoration: 'none',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF8A2D'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 154, 61, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.gold
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Nouveau patient
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: search ? `2px solid ${colors.teal.main}` : '2px solid #E5E5E5',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '24px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />

        {/* Grille de cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((patient: any) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="relative transition-all"
                style={{
                  ...styles.card.base,
                  padding: 0,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, styles.card.hover)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E5E5'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Barre signature */}
                <div style={styles.signatureBar} />

                {/* Header */}
                <div style={{
                  padding: '24px 24px 20px',
                  borderBottom: '1px solid #F5F5F5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{
                      ...styles.avatar.base,
                      position: 'relative',
                    }}>
                      {patient.name?.charAt(0) || 'P'}
                      <div style={styles.statusIndicator} />
                    </div>

                    {/* Info */}
                    <div>
                      <h3 style={styles.heading.h3}>
                        {patient.name || 'Non renseigné'}
                      </h3>
                      <div style={{
                        fontSize: '13px',
                        color: colors.gray.warm,
                        marginTop: '3px',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center'
                      }}>
                        <span>{patient.age ? `${patient.age} ans` : 'Non renseigné'}</span>
                        <span>•</span>
                        <span>{patient.city || 'Non renseigné'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  {(patient.is_premium || patient.status === 'premium') && (
                    <div style={styles.badgePremium}>
                      Premium
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    fontSize: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ opacity: 0.6 }}>@</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.email || 'Non renseigné'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ opacity: 0.6 }}>•</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.pathology || 'Non renseigné'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ opacity: 0.6 }}>Tel</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.phone || 'Non renseigné'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #F5F5F5',
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: colors.teal.main
                  }}>
                    Voir le dossier →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: colors.gray.warm }}>
            Aucun patient trouvé
          </div>
        )}
      </div>
    </div>
  )
}
