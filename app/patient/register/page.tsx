'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Données passées via URL params depuis la page d'activation
  const patientEmail = searchParams.get('email') || ''
  const patientName = searchParams.get('name') || ''
  const patientFirstName = searchParams.get('first_name') || ''
  const patientLastName = searchParams.get('last_name') || ''
  const practitionerId = searchParams.get('practitioner_id') || ''
  const otpId = searchParams.get('otp_id') || ''
  const invitationId = searchParams.get('invitation_id') || ''
  const patientCity = searchParams.get('city') || ''
  const patientPhone = searchParams.get('phone') || ''
  const patientAge = searchParams.get('age') || ''
  const patientDateOfBirth = searchParams.get('date_of_birth') || ''

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

    if (!invitationId) {
      setError('Données d\'invitation manquantes. Veuillez réessayer avec un nouveau code.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.toLowerCase().trim()
      console.log('═══════════════════════════════════════')
      console.log('🔐 ACTIVATION COMPTE PATIENT')
      console.log('Email:', normalizedEmail)
      console.log('Praticien ID:', practitionerId)
      console.log('Invitation ID:', invitationId)

      // 1. Vérifier que le patient n'existe pas déjà
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .single()

      if (existingPatient?.activated) {
        setError('Ce compte est déjà activé. Utilisez "Se connecter".')
        return
      }

      // 2. Créer le compte auth Supabase
      console.log('📝 Création compte auth...')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'patient',
            practitioner_id: practitionerId,
            name: patientName
          }
        }
      })

      let userId: string | undefined

      if (authError) {
        console.error('❌ Erreur auth:', authError)
        if (authError.message.includes('already registered')) {
          // Tenter la connexion si le compte existe déjà
          console.log('🔄 Compte auth existe déjà, tentative de connexion...')
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          })
          if (signInError) {
            setError('Un compte existe déjà avec un mot de passe différent. Utilisez "Se connecter".')
            return
          }
          userId = signInData.user?.id
          console.log('✅ Connexion au compte existant:', userId)
        } else {
          throw authError
        }
      } else {
        userId = authData.user?.id
        console.log('✅ Compte auth créé:', userId)
      }

      if (!userId) {
        throw new Error('Erreur lors de la création du compte')
      }

      // 3. Construire les données du patient
      const finalFirstName = patientFirstName || patientName.split(' ')[0] || ''
      const finalLastName = patientLastName || patientName.split(' ').slice(1).join(' ') || ''
      const fullName = patientName || `${finalFirstName} ${finalLastName}`.trim()

      // 4. Créer le patient dans la table patients
      console.log('📝 Création patient dans la table patients...')

      // Si un patient pending existe (ancien système), le supprimer d'abord
      if (existingPatient && !existingPatient.activated) {
        console.log('🗑️ Suppression patient pending existant:', existingPatient.id)
        await supabase
          .from('patients')
          .delete()
          .eq('id', existingPatient.id)
      }

      const patientPayload: Record<string, unknown> = {
        id: userId, // ✅ ID auth comme ID patient
        practitioner_id: practitionerId,
        email: normalizedEmail,
        full_name: fullName || null,
        first_name: finalFirstName || null,
        last_name: finalLastName || null,
        phone: patientPhone || null,
        city: patientCity || null,
        age: patientAge ? parseInt(patientAge, 10) : null,
        date_of_birth: patientDateOfBirth || null,
        activated: true,
        activated_at: new Date().toISOString()
      }

      const { error: patientError } = await supabase
        .from('patients')
        .insert(patientPayload)

      if (patientError) {
        console.error('❌ Erreur création patient:', patientError)
        // Si erreur de duplicate, essayer sans spécifier l'ID
        if (patientError.message.includes('duplicate') || patientError.message.includes('unique')) {
          console.log('⚠️ Tentative sans ID spécifique...')
          const { id: _, ...payloadWithoutId } = patientPayload
          const { error: patientError2 } = await supabase
            .from('patients')
            .insert(payloadWithoutId)
          if (patientError2) {
            throw patientError2
          }
        } else {
          throw patientError
        }
      }

      console.log('✅ Patient créé avec ID auth:', userId)

      // 5. Marquer l'invitation comme acceptée
      console.log('📝 Mise à jour invitation:', invitationId)

      const { error: invitError } = await supabase
        .from('patient_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (invitError) {
        console.warn('⚠️ Erreur mise à jour invitation:', invitError)
        // Ne pas bloquer, le patient est créé
      } else {
        console.log('✅ Invitation marquée comme acceptée')
      }

      // 6. Marquer le code OTP comme utilisé
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

      // 7. Connecter automatiquement l'utilisateur
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        console.log('🔐 Connexion automatique...')
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        })
        if (signInError) {
          console.warn('⚠️ Auto-login échoué:', signInError)
        } else {
          console.log('✅ Connecté automatiquement')
        }
      }

      console.log('═══════════════════════════════════════')
      console.log('✅ ACTIVATION RÉUSSIE')
      console.log('Email:', normalizedEmail)
      console.log('Patient ID:', userId)
      console.log('Praticien ID:', practitionerId)
      console.log('═══════════════════════════════════════')

      setSuccess(true)

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
