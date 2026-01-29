'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Données de otp_codes passées via URL params
  const patientEmail = searchParams.get('email') || ''
  const patientName = searchParams.get('name') || ''
  const patientFirstName = searchParams.get('first_name') || ''
  const patientLastName = searchParams.get('last_name') || ''
  const practitionerId = searchParams.get('practitioner_id') || ''
  const otpId = searchParams.get('otp_id') || ''
  const patientCity = searchParams.get('city') || ''
  const patientPhone = searchParams.get('phone') || ''

  const [email, setEmail] = useState(patientEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validatePassword = (pwd: string) => pwd.length >= 8

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs')
      return
    }

    if (!validatePassword(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!practitionerId) {
      setError('Données de praticien manquantes. Veuillez réessayer avec un nouveau code.')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔐 Création du compte patient...')
      console.log('Email:', email)
      console.log('Practitioner ID:', practitionerId)

      // 1. Créer le compte auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            role: 'patient',
            practitioner_id: practitionerId,
            name: patientName
          }
        }
      })

      if (authError) {
        console.error('Erreur auth:', authError)
        if (authError.message.includes('already registered')) {
          setError('Cet email est déjà utilisé. Essayez de vous connecter.')
        } else {
          throw authError
        }
        return
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte')
      }

      console.log('✅ Compte auth créé:', authData.user.id)

      // 2. Créer l'entrée patient
      const patientPayload: Record<string, unknown> = {
        id: authData.user.id,
        practitioner_id: practitionerId,
        email: email.toLowerCase().trim(),
        name: patientName || `${patientFirstName} ${patientLastName}`.trim(),
        status: 'active'
      }

      // Ajouter les champs optionnels s'ils existent
      if (patientCity) patientPayload.city = patientCity
      if (patientPhone) patientPayload.phone = patientPhone

      console.log('📝 Création patient:', patientPayload)

      const { error: patientError } = await supabase
        .from('patients')
        .insert(patientPayload)

      if (patientError) {
        console.error('Erreur création patient:', patientError)
        // Ne pas bloquer si le patient existe déjà (peut arriver si l'utilisateur réessaie)
        if (!patientError.message.includes('duplicate')) {
          throw patientError
        }
      }

      console.log('✅ Patient créé')

      // 3. Marquer le code OTP comme utilisé
      if (otpId) {
        const { error: otpError } = await supabase
          .from('otp_codes')
          .update({
            used: true,
            used_at: new Date().toISOString()
          })
          .eq('id', otpId)

        if (otpError) {
          console.warn('⚠️ Erreur mise à jour OTP:', otpError)
        } else {
          console.log('✅ Code OTP marqué comme utilisé')
        }
      }

      // 4. Connecter automatiquement l'utilisateur
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      if (signInError) {
        console.warn('⚠️ Auto-login échoué:', signInError)
        // Pas bloquant, on redirige quand même
      }

      setSuccess(true)
      console.log('✅ Inscription terminée avec succès!')

      // Rediriger vers la home patient après un court délai
      setTimeout(() => {
        router.push('/patient/home')
      }, 1500)

    } catch (err: unknown) {
      console.error('❌ Erreur inscription:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B8DC9] via-[#7B9DD9] to-[#9B8DC9] p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3748] mb-2">
            Compte créé !
          </h1>
          <p className="text-[#718096]">
            Redirection vers votre espace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B8DC9] via-[#7B9DD9] to-[#9B8DC9] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#7BA591] to-[#6B8DC9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3748]">
            Bonjour {patientName.split(' ')[0] || 'vous'}
          </h1>
          <p className="text-[#718096] mt-1">
            Créez votre mot de passe pour accéder à votre espace
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4A5568] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4A5568] mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4A5568] mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              placeholder="Retapez votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#718096] bg-[#F7FAFC] p-3 rounded-xl">
            <span>🔒</span>
            <span>Vos données sont sécurisées et confidentielles</span>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#6B8DC9] to-[#9B8DC9] text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg mt-2"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B8DC9] to-[#9B8DC9]">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
