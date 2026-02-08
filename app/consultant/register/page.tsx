'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, CheckCircle } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Donnees passees via URL params depuis la page d'activation
  const consultantEmail = searchParams.get('email') || ''
  const consultantName = searchParams.get('name') || ''
  const consultantFirstName = searchParams.get('first_name') || ''
  const consultantLastName = searchParams.get('last_name') || ''
  const practitionerId = searchParams.get('practitioner_id') || ''
  const otpId = searchParams.get('otp_id') || ''
  const invitationId = searchParams.get('invitation_id') || ''
  const existingConsultantId = searchParams.get('consultant_id') || ''
  const consultantCity = searchParams.get('city') || ''
  const consultantPhone = searchParams.get('phone') || ''
  const consultantAge = searchParams.get('age') || ''
  const consultantDateOfBirth = searchParams.get('date_of_birth') || ''

  const [email, setEmail] = useState(consultantEmail)
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
      console.log('ACTIVATION COMPTE CONSULTANT')
      console.log('Email:', normalizedEmail)
      console.log('Praticien ID:', practitionerId)
      console.log('Invitation ID:', invitationId)

      // 1. Vérifier que le consultant n'existe pas déjà
      const { data: existingConsultant } = await supabase
        .from('consultants')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .single()

      if (existingConsultant?.activated) {
        setError('Ce compte est déjà activé. Utilisez "Se connecter".')
        return
      }

      // 2. Créer le compte auth Supabase
      console.log('Creation compte auth...')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'consultant',
            practitioner_id: practitionerId,
            name: consultantName
          }
        }
      })

      let userId: string | undefined

      if (authError) {
        console.error('Erreur auth:', authError)
        if (authError.message.includes('already registered')) {
          // Tenter la connexion si le compte existe déjà
          console.log('Compte auth existe deja, tentative de connexion...')
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          })
          if (signInError) {
            setError('Un compte existe déjà avec un mot de passe différent. Utilisez "Se connecter".')
            return
          }
          userId = signInData.user?.id
          console.log('Connexion au compte existant:', userId)
        } else {
          throw authError
        }
      } else {
        userId = authData.user?.id
        console.log('Compte auth cree:', userId)
      }

      if (!userId) {
        throw new Error('Erreur lors de la création du compte')
      }

      // 3. Construire les données du consultant
      const finalFirstName = consultantFirstName || consultantName.split(' ')[0] || ''
      const finalLastName = consultantLastName || consultantName.split(' ').slice(1).join(' ') || ''
      const fullName = consultantName || `${finalFirstName} ${finalLastName}`.trim()

      // 4. Creer ou mettre a jour le consultant dans la table consultants
      console.log('Creation/MAJ consultant dans la table consultants...')

      const consultantPayload: Record<string, unknown> = {
        practitioner_id: practitionerId,
        email: normalizedEmail,
        name: fullName || 'Consultant',
        full_name: fullName || null,
        first_name: finalFirstName || null,
        last_name: finalLastName || null,
        phone: consultantPhone || null,
        city: consultantCity || null,
        age: consultantAge ? parseInt(consultantAge, 10) : null,
        date_of_birth: consultantDateOfBirth || null,
        activated: true,
        activated_at: new Date().toISOString()
      }

      let finalConsultantId: string | null = null

      // Si on a un consultant_id existant (nouveau flux), mettre a jour
      if (existingConsultantId) {
        console.log('Consultant existant trouve, mise a jour:', existingConsultantId)
        const { error: updateError } = await supabase
          .from('consultants')
          .update(consultantPayload)
          .eq('id', existingConsultantId)

        if (updateError) {
          console.error('Erreur MAJ consultant:', updateError)
          throw updateError
        }
        finalConsultantId = existingConsultantId
        console.log('Consultant mis a jour:', finalConsultantId)
      } else if (existingConsultant && !existingConsultant.activated) {
        // Ancien flux: consultant pending existe
        console.log('Consultant pending existant, mise a jour:', existingConsultant.id)
        const { error: updateError } = await supabase
          .from('consultants')
          .update(consultantPayload)
          .eq('id', existingConsultant.id)

        if (updateError) {
          console.error('Erreur MAJ consultant pending:', updateError)
          throw updateError
        }
        finalConsultantId = existingConsultant.id
        console.log('Consultant pending mis a jour:', finalConsultantId)
      } else {
        // Creer un nouveau consultant
        console.log('Creation nouveau consultant...')
        const insertPayload = {
          id: userId, // Utiliser ID auth comme ID consultant
          ...consultantPayload
        }

        const { data: newConsultant, error: consultantError } = await supabase
          .from('consultants')
          .insert(insertPayload)
          .select('id')
          .single()

        if (consultantError) {
          console.error('Erreur creation consultant:', consultantError)
          // Si erreur de duplicate, essayer sans specifier l'ID
          if (consultantError.message.includes('duplicate') || consultantError.message.includes('unique')) {
            console.log('Tentative sans ID specifique...')
            const { data: newConsultant2, error: consultantError2 } = await supabase
              .from('consultants')
              .insert(consultantPayload)
              .select('id')
              .single()
            if (consultantError2) {
              throw consultantError2
            }
            finalConsultantId = newConsultant2?.id || null
          } else {
            throw consultantError
          }
        } else {
          finalConsultantId = newConsultant?.id || userId
        }
        console.log('Consultant cree avec ID:', finalConsultantId)
      }

      console.log('Consultant active avec ID:', finalConsultantId || userId)

      // 5. Marquer l'invitation comme acceptée
      console.log('Mise a jour invitation:', invitationId)

      const { error: invitError } = await supabase
        .from('consultant_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (invitError) {
        console.warn('Erreur mise a jour invitation:', invitError)
        // Ne pas bloquer, le consultant est créé
      } else {
        console.log('Invitation marquee comme acceptee')
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
          console.warn('Erreur mise a jour OTP:', otpError)
        } else {
          console.log('Code OTP marque comme utilise')
        }
      }

      // 7. Connecter automatiquement l'utilisateur
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        console.log('Connexion automatique...')
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        })
        if (signInError) {
          console.warn('Auto-login echoue:', signInError)
        } else {
          console.log('Connecte automatiquement')
        }
      }

      console.log('═══════════════════════════════════════')
      console.log('ACTIVATION REUSSIE')
      console.log('Email:', normalizedEmail)
      console.log('Consultant ID:', userId)
      console.log('Praticien ID:', practitionerId)
      console.log('═══════════════════════════════════════')

      setSuccess(true)

      // Rediriger vers la home consultant après un court délai
      setTimeout(() => {
        router.push('/consultant/home')
      }, 1500)

    } catch (err: unknown) {
      console.error('Erreur inscription:', err)
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
            <CheckCircle className="w-10 h-10 text-green-600" />
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
            <span className="text-xl font-bold text-white">Bienvenue</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3748]">
            Bonjour {consultantName.split(' ')[0] || 'vous'}
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
            <Lock className="w-4 h-4 text-[#718096] flex-shrink-0" />
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
