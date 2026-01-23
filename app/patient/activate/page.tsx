'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ActivatePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Le code doit contenir 6 caractères')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: dbError } = await supabase
        .from('patients')
        .select('id, full_name, email, is_activated')
        .eq('activation_code', code.toUpperCase())
        .single()

      if (dbError || !data) {
        setError('Code invalide')
        return
      }

      if (data.is_activated) {
        setError('Code déjà utilisé')
        return
      }

      router.push(
        `/patient/register?id=${data.id}&name=${encodeURIComponent(
          data.full_name
        )}&email=${encodeURIComponent(data.email || '')}`
      )
    } catch (err) {
      setError('Erreur de vérification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          Bienvenue sur AFEIA 👋
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Entrez votre code d&apos;activation
        </p>

        <input
          type="text"
          className="w-full px-4 py-3 text-2xl tracking-widest text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none uppercase mb-4"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
        />

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleVerifyCode}
          disabled={loading || code.length !== 6}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition"
        >
          {loading ? 'Vérification...' : 'Continuer'}
        </button>

        <div className="text-center mt-4">
          <a href="/patient/login" className="text-blue-600 text-sm hover:underline">
            J&apos;ai déjà un compte
          </a>
        </div>
      </div>
    </div>
  )
}
