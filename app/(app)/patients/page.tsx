'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { colors } from '@/lib/colors'

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
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.teal.main }}
          ></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.teal.deep }}>
            👥 Mes patients
          </h1>
          <p className="text-gray-600">{patients.length} patient(s) au total</p>
        </div>
        <Link
          href="/patients/new"
          className="px-6 py-3 rounded-lg font-semibold text-white hover:shadow-lg transition-all"
          style={{ backgroundColor: colors.gold }}
        >
          + Nouveau patient
        </Link>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 mb-6 focus:outline-none transition-colors"
          style={{
            borderColor: search ? colors.teal.main : '#E5E7EB',
          }}
        />

        {/* Grille de cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient: any) => (
            <Link key={patient.id} href={`/patients/${patient.id}`} className="block">
              <div
                className="rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-t-4"
                style={{
                  backgroundColor: colors.sand,
                  borderColor:
                    patient.is_premium || patient.status === 'premium'
                      ? colors.aubergine.main
                      : colors.teal.main,
                }}
              >
                {/* En-tête */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: 'white' }}
                    >
                      👤
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: colors.gray.charcoal }}>
                        {patient.name}
                      </h3>
                      {patient.age && (
                        <p className="text-sm" style={{ color: colors.gray.warm }}>
                          {patient.age} ans
                        </p>
                      )}
                    </div>
                  </div>
                  {(patient.is_premium || patient.status === 'premium') && (
                    <span
                      className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{
                        backgroundColor: colors.aubergine.light,
                        color: colors.aubergine.main,
                      }}
                    >
                      ✨ Premium
                    </span>
                  )}
                </div>

                {/* Informations */}
                <div className="space-y-2 text-sm">
                  {patient.city && (
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.city}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <span>📧</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.email}</span>
                    </div>
                  )}
                  {patient.pathology && (
                    <div className="flex items-center gap-2">
                      <span>🎯</span>
                      <span style={{ color: colors.gray.charcoal }}>{patient.pathology}</span>
                    </div>
                  )}
                </div>

                {/* Bouton */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'white' }}>
                  <span
                    className="text-sm font-semibold hover:underline"
                    style={{ color: colors.teal.main }}
                  >
                    Voir le dossier →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: colors.gray.warm }}>
              Aucun patient trouvé
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
