'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CreatePlanPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const createDemoPlan = async () => {
    setCreating(true)

    try {
      // Récupérer le patient TEST01
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('activation_code', 'TEST01')
        .single()

      if (!patient) throw new Error('Patient introuvable')

      // Créer un plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({
          patient_id: patient.id,
          plan_name: 'Plan Endométriose - Phase 1',
          is_active: true,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (planError) throw planError

      // Ajouter des compléments
      const supplements = [
        {
          plan_id: plan.id,
          name: 'Oméga-3 EPA/DHA',
          brand: 'Nutri&Co',
          dosage: '2 gélules de 500mg',
          frequency: '2 fois par jour',
          timing: 'Matin et soir pendant les repas',
          notes: "Aide à réduire l'inflammation",
          order_index: 1
        },
        {
          plan_id: plan.id,
          name: 'Magnésium bisglycinate',
          brand: 'Nutrimuscle',
          dosage: '1 gélule de 200mg',
          frequency: '1 fois par jour',
          timing: 'Le soir avant le coucher',
          notes: 'Améliore le sommeil et détend les muscles',
          order_index: 2
        },
        {
          plan_id: plan.id,
          name: 'Curcuma + Pipérine',
          brand: 'Naturactive',
          dosage: '1 gélule de 500mg',
          frequency: '2 fois par jour',
          timing: 'Matin et midi pendant les repas',
          notes: 'Propriétés anti-inflammatoires puissantes',
          order_index: 3
        }
      ]

      const { error: itemsError } = await supabase
        .from('supplement_items')
        .insert(supplements)

      if (itemsError) throw itemsError

      alert('✅ Plan créé avec succès !')
      router.push('/patient/demo')
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de la création du plan')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl p-8 shadow text-center">
          <h1 className="text-2xl font-bold mb-4">Créer un plan de test</h1>
          <p className="text-gray-600 mb-6">
            Cela va créer un plan avec 3 compléments alimentaires pour le patient TEST01
          </p>

          <button
            onClick={createDemoPlan}
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {creating ? 'Création...' : 'Créer le plan'}
          </button>

          <div className="mt-6">
            <a href="/patient/demo" className="text-blue-600 hover:underline">
              ← Retour au dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
