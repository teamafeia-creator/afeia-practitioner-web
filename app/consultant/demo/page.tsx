'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ConsultantDemoPage() {
  const [consultant, setConsultant] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConsultantData()
  }, [])

  const loadConsultantData = async () => {
    try {
      // Récupérer le premier consultant avec code TEST01
      const { data: consultantData } = await supabase
        .from('consultants')
        .select(`
          *,
          practitioners (*)
        `)
        .eq('activation_code', 'TEST01')
        .single()

      setConsultant(consultantData)

      if (consultantData) {
        // Récupérer le plan actif
        const { data: planData } = await supabase
          .from('plans')
          .select(`
            *,
            supplement_items (*)
          `)
          .eq('consultant_id', consultantData.id)
          .eq('is_active', true)
          .maybeSingle()

        setPlan(planData)

        // Récupérer les recommandations
        const { data: recosData } = await supabase
          .from('recommendations')
          .select('*')
          .eq('consultant_id', consultantData.id)
          .eq('is_active', true)

        console.log('Recommandations:', recosData)
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!consultant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg">
          ❌ Consultant TEST01 introuvable. Vérifiez que le script SQL a bien été exécuté.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                Bonjour {consultant.name?.split(' ')[0] || 'Consultant'} 👋
              </h1>
              <p className="text-blue-100 text-sm mt-1">Mode démo - Consultant TEST01</p>
              {consultant.is_premium && (
                <span className="inline-block bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full mt-2">
                  ✨ Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {/* Informations consultant */}
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="text-xl font-bold mb-4">📋 Mes informations</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nom</p>
              <p className="font-semibold">{consultant.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-semibold">{consultant.email || 'Non renseigné'}</p>
            </div>
            <div>
              <p className="text-gray-500">Pathologie</p>
              <p className="font-semibold">{consultant.pathology || 'Non renseignée'}</p>
            </div>
            <div>
              <p className="text-gray-500">Statut</p>
              <p className="font-semibold">{consultant.is_premium ? 'Premium' : 'Standard'}</p>
            </div>
          </div>
        </div>

        {/* Plan de compléments */}
        {plan ? (
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">💊 Mon plan de compléments</h2>
            <p className="text-gray-600 mb-4">{plan.plan_name}</p>

            {plan.supplement_items && plan.supplement_items.length > 0 ? (
              <div className="space-y-4">
                {plan.supplement_items.map((item: any) => (
                  <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    {item.brand && (
                      <p className="text-sm text-gray-500">{item.brand}</p>
                    )}
                    <p className="text-sm text-gray-700 mt-1">📦 {item.dosage}</p>
                    <p className="text-sm text-gray-700">⏰ {item.frequency}</p>
                    {item.timing && (
                      <p className="text-xs text-gray-500 mt-1">{item.timing}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-600 mt-2 bg-blue-50 p-2 rounded">
                        💡 {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-600">Aucun complément dans ce plan</p>
                <Link
                  href="/consultant/demo/add-supplements"
                  className="inline-block mt-3 text-blue-600 hover:underline"
                >
                  → Ajouter des compléments (pour tester)
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">💊 Mon plan de compléments</h2>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600 mb-3">Aucun plan actif pour le moment</p>
              <Link
                href="/consultant/demo/create-plan"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Créer un plan de test
              </Link>
            </div>
          </div>
        )}

        {/* Mon naturopathe */}
        {consultant.practitioners && (
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">👨‍⚕️ Mon naturopathe</h2>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center text-2xl">
                👤
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{consultant.practitioners.full_name}</p>
                <p className="text-sm text-gray-600">{consultant.practitioners.email}</p>
                {consultant.practitioners.phone && (
                  <p className="text-sm text-gray-600">📞 {consultant.practitioners.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/consultant/demo/daily-log"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow text-center hover:shadow-lg transition"
          >
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-bold">Journal quotidien</h3>
            <p className="text-sm text-white/90 mt-1">Suivre mon état</p>
          </Link>

          <Link
            href="/consultant/demo/messages"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-xl shadow text-center hover:shadow-lg transition"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-bold">Messages</h3>
            <p className="text-sm text-white/90 mt-1">Contacter mon naturo</p>
          </Link>
        </div>

        {/* Infos debug */}
        <div className="bg-gray-100 p-4 rounded-lg text-xs">
          <p className="font-semibold mb-2">🔧 Mode développement</p>
          <p>Consultant ID: {consultant.id}</p>
          <p>Practitioner ID: {consultant.practitioner_id}</p>
          <p>Plan actif: {plan ? 'Oui' : 'Non'}</p>
        </div>
      </div>
    </div>
  )
}
