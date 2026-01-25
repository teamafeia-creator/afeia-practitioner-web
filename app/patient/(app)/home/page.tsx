'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type PatientPlan = {
  id: string
  version: number
  status: string
  content: Record<string, string> | null
  shared_at?: string | null
  created_at?: string | null
}

const PLAN_SECTIONS: Array<{ title: string; keys: Array<{ label: string; key: string }> }> = [
  { title: 'Objectifs', keys: [{ label: 'Objectifs', key: 'objectifs' }] },
  {
    title: 'Alimentation',
    keys: [
      { label: 'Recommandations', key: 'alimentation_recommandations' },
      { label: 'À éviter', key: 'alimentation_eviter' },
      { label: 'Hydratation', key: 'alimentation_hydratation' }
    ]
  },
  {
    title: 'Plantes / phytothérapie',
    keys: [
      { label: 'Plantes', key: 'phytotherapie_plantes' },
      { label: 'Posologie', key: 'phytotherapie_posologie' },
      { label: 'Précautions', key: 'phytotherapie_precautions' }
    ]
  },
  { title: 'Compléments', keys: [{ label: 'Compléments', key: 'complements' }] },
  { title: 'Sommeil', keys: [{ label: 'Sommeil', key: 'sommeil' }] },
  { title: 'Activité / exercices', keys: [{ label: 'Activité', key: 'activite' }] },
  {
    title: 'Gestion du stress',
    keys: [{ label: 'Gestion du stress / respiration / méditation', key: 'gestion_stress' }]
  },
  { title: 'Suivi', keys: [{ label: 'Suivi', key: 'suivi' }] },
  { title: 'Notes libres', keys: [{ label: 'Notes', key: 'notes_libres' }] }
]

export default function PatientHomePage() {
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [sharedPlans, setSharedPlans] = useState<PatientPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      const { data: membership } = await supabase
        .from('patient_memberships')
        .select('patient_id')
        .eq('patient_user_id', user!.id)
        .maybeSingle()

      let patientData = null
      if (membership?.patient_id) {
        const { data } = await supabase
          .from('patients')
          .select('*, practitioners(*)')
          .eq('id', membership.patient_id)
          .single()
        patientData = data
      } else {
        const { data } = await supabase
          .from('patients')
          .select('*, practitioners(*)')
          .eq('auth_user_id', user!.id)
          .single()
        patientData = data
      }

      setPatient(patientData)

      const { data: planData } = await supabase
        .from('supplement_plans')
        .select('*, supplement_items(*)')
        .eq('patient_id', patientData.id)
        .eq('is_active', true)
        .maybeSingle()

      setPlan(planData)

      if (patientData) {
        const { data: sharedPlanData } = await supabase
          .from('patient_plans')
          .select('*')
          .eq('patient_id', patientData.id)
          .eq('status', 'shared')
          .order('version', { ascending: false })
        setSharedPlans((sharedPlanData ?? []) as PatientPlan[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/patient/login')
  }

  if (loading) return <div className="p-8">Chargement...</div>

  const latestSharedPlan = sharedPlans[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Bonjour {patient?.full_name?.split(' ')[0]} 👋
            </h1>
            {patient?.is_premium && (
              <span className="inline-block bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full mt-2">
                ✨ Premium
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="text-sm underline">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {plan && (
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-xl font-bold mb-2">💊 Mon plan de compléments</h2>
            <p className="text-gray-600 mb-4">{plan.plan_name}</p>
            <div className="space-y-3">
              {plan.supplement_items?.map((item: any) => (
                <div key={item.id} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    {item.dosage} • {item.frequency}
                  </p>
                  {item.timing && (
                    <p className="text-xs text-gray-500">{item.timing}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {latestSharedPlan && (
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">🌿 Plan de naturopathie</h2>
                <p className="text-sm text-gray-600">
                  Version v{latestSharedPlan.version}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 text-xs px-2 py-1">
                Partagé
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {PLAN_SECTIONS.map((section) => {
                const values = section.keys
                  .map((field) => {
                    const value = latestSharedPlan.content?.[field.key]?.trim()
                    if (!value) return null
                    return (
                      <div key={field.key}>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{field.label}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>
                      </div>
                    )
                  })
                  .filter(Boolean)

                if (values.length === 0) return null

                return (
                  <div key={section.title} className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                    <div className="space-y-3">{values}</div>
                  </div>
                )
              })}
            </div>
            {sharedPlans.length > 1 && (
              <p className="mt-4 text-xs text-gray-500">
                {sharedPlans.length} versions partagées disponibles.
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="text-xl font-bold mb-4">👨‍⚕️ Mon naturopathe</h2>
          <p className="font-semibold">{patient?.practitioners?.full_name}</p>
          {patient?.practitioners?.phone && (
            <p className="text-sm text-gray-600">{patient.practitioners.phone}</p>
          )}
          <button
            onClick={() => router.push('/patient/messages')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Envoyer un message
          </button>
        </div>

        <button
          onClick={() => router.push('/patient/daily-log')}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow text-left"
        >
          <h2 className="text-xl font-bold mb-2">📝 Mon journal quotidien</h2>
          <p className="text-white/90">
            Partagez vos ressentis avec votre naturopathe
          </p>
        </button>
      </div>
    </div>
  )
}
