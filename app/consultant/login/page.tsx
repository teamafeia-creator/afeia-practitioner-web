'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })
      if (authError) throw authError
      router.push('/consultant/home')
    } catch {
      setError('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B8DC9] via-[#7B9DD9] to-[#9B8DC9] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#6B8DC9] to-[#9B8DC9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3748]">
            Content de vous revoir
          </h1>
          <p className="text-[#718096] mt-1">
            Connectez-vous à votre espace santé
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4A5568] mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4A5568] mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#6B8DC9] to-[#9B8DC9] text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="text-center pt-4 border-t border-[#E2E8F0] mt-6">
            <p className="text-sm text-[#718096] mb-2">
              Vous avez reçu un code d&apos;activation ?
            </p>
            <a
              href="/consultant/activate"
              className="text-[#6B8DC9] font-medium hover:underline"
            >
              Activer mon compte
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
