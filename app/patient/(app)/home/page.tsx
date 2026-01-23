'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PatientHomePage() {
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      const { data: patientData } = await supabase
        .from('patients')
        .select('*, practitioners(*)')
        .eq('auth_user_id', user!.id)
        .single()

      setPatient(patientData)

      const { data: planData } = await supabase
        .from('supplement_plans')
        .select('*, supplement_items(*)')
        .eq('patient_id', patientData.id)
        .eq('is_active', true)
        .maybeSingle()

      setPlan(planData)
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
