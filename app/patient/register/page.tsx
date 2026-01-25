'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const patientId = searchParams.get('id') || ''
  const patientName = searchParams.get('name') || ''
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validatePassword = (pwd: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd)

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs')
      return
    }

    if (!validatePassword(password)) {
      setError('Mot de passe faible (8+ car., maj, min, chiffre)')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { patient_id: patientId, role: 'patient' } }
      })

      if (authError) throw authError

      await supabase
        .from('patients')
        .update({
          email,
          auth_user_id: authData.user!.id,
          is_activated: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', patientId)

      const { error: membershipError } = await supabase.from('patient_memberships').upsert({
        patient_id: patientId,
        patient_user_id: authData.user!.id
      })
      if (membershipError) {
        console.error('Erreur création membership patient:', membershipError)
      }

      router.push('/patient/home')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          Bonjour {patientName.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Créez votre mot de passe
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 outline-none"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 outline-none"
          />

          <input
            type="password"
            placeholder="Confirmer"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 outline-none"
          />

          <p className="text-xs text-gray-500">
            • 8+ caractères • Maj + min • 1 chiffre
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
