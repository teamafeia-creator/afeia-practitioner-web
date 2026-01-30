'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ActivatePage() {
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    // Auto-focus next input
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      setCode(pastedData.split(''))
      inputs.current[5]?.focus()
    }
  }

  const handleVerifyCode = async () => {
    const codeString = code.join('')
    if (codeString.length !== 6) {
      setError('Le code doit contenir 6 chiffres')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('═══════════════════════════════════════')
      console.log('VERIFICATION CODE ACTIVATION')
      console.log('Code:', codeString)

      // 1. Chercher dans otp_codes
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', codeString)
        .eq('used', false)
        .eq('type', 'activation')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otpError) {
        console.error('Erreur recherche OTP:', otpError)
        setError('Erreur lors de la verification')
        return
      }

      if (!otpData) {
        console.error('Code non trouve ou expire')
        setError('Code invalide ou expire')
        return
      }

      console.log('Code OTP trouve')
      console.log('   Email:', otpData.email)
      console.log('   OTP ID:', otpData.id)
      console.log('   Patient ID:', otpData.patient_id)
      console.log('   Practitioner ID:', otpData.practitioner_id)

      const email = otpData.email?.toLowerCase()?.trim()

      // 2. Chercher l'invitation - plusieurs strategies
      let invitation = null

      // Strategie 1: Par patient_id si disponible
      if (otpData.patient_id) {
        console.log('Recherche invitation par patient_id:', otpData.patient_id)
        const { data: invByPatient } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('patient_id', otpData.patient_id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invByPatient) {
          invitation = invByPatient
          console.log('Invitation trouvee par patient_id')
        }
      }

      // Strategie 2: Par email et practitioner_id
      if (!invitation && email && otpData.practitioner_id) {
        console.log('Recherche invitation par email + practitioner_id')
        const { data: invByEmailPractitioner } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('email', email)
          .eq('practitioner_id', otpData.practitioner_id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invByEmailPractitioner) {
          invitation = invByEmailPractitioner
          console.log('Invitation trouvee par email + practitioner_id')
        }
      }

      // Strategie 3: Par email seul (fallback)
      if (!invitation && email) {
        console.log('Recherche invitation par email seul')
        const { data: invByEmail } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('email', email)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invByEmail) {
          invitation = invByEmail
          console.log('Invitation trouvee par email')
        }
      }

      // Strategie 4: Par code d'invitation (match direct)
      if (!invitation) {
        console.log('Recherche invitation par invitation_code')
        const { data: invByCode } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('invitation_code', codeString)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invByCode) {
          invitation = invByCode
          console.log('Invitation trouvee par invitation_code')
        }
      }

      if (!invitation) {
        console.error('Invitation non trouvee avec toutes les strategies')
        console.log('Debug info:')
        console.log('   OTP email:', email)
        console.log('   OTP patient_id:', otpData.patient_id)
        console.log('   OTP practitioner_id:', otpData.practitioner_id)
        console.log('   Code:', codeString)

        // Essayer de recuperer les infos du patient directement si patient_id existe
        if (otpData.patient_id) {
          console.log('Tentative recuperation patient directement...')
          const { data: patientData } = await supabase
            .from('patients')
            .select('*')
            .eq('id', otpData.patient_id)
            .single()

          if (patientData) {
            console.log('Patient trouve directement, creation invitation virtuelle')
            // Creer une invitation virtuelle basee sur le patient
            invitation = {
              id: 'virtual-' + otpData.id,
              practitioner_id: patientData.practitioner_id,
              patient_id: patientData.id,
              email: patientData.email || email,
              full_name: patientData.name || patientData.full_name,
              first_name: patientData.first_name,
              last_name: patientData.last_name,
              phone: patientData.phone,
              city: patientData.city,
              age: patientData.age,
              date_of_birth: patientData.date_of_birth,
              status: 'pending'
            }
          }
        }
      }

      if (!invitation) {
        setError('Invitation non trouvee. Contactez votre naturopathe.')
        return
      }

      console.log('Invitation trouvee')
      console.log('   ID:', invitation.id)
      console.log('   Praticien ID:', invitation.practitioner_id)
      console.log('   Nom:', invitation.full_name)

      // 3. Rediriger vers la page de creation de mot de passe
      const params = new URLSearchParams({
        email: email || invitation.email || '',
        name: invitation.full_name || '',
        first_name: invitation.first_name || '',
        last_name: invitation.last_name || '',
        practitioner_id: invitation.practitioner_id,
        otp_id: otpData.id,
        invitation_id: invitation.id,
        patient_id: invitation.patient_id || otpData.patient_id || '',
        city: invitation.city || '',
        phone: invitation.phone || '',
        age: invitation.age?.toString() || '',
        date_of_birth: invitation.date_of_birth || ''
      })

      console.log('═══════════════════════════════════════')
      console.log('CODE VALIDE - REDIRECTION')
      console.log('═══════════════════════════════════════')

      router.push(`/patient/register?${params.toString()}`)
    } catch (err) {
      console.error('Exception:', err)
      setError('Erreur de verification')
    } finally {
      setLoading(false)
    }
  }

  const codeComplete = code.every(d => d !== '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6B8DC9] via-[#7B9DD9] to-[#9B8DC9] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#6B8DC9] to-[#9B8DC9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3748] mb-2">
            Bienvenue sur AFEIA
          </h1>
          <p className="text-[#718096]">
            Entrez le code à 6 chiffres reçu par email
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputs.current[index] = el }}
              type="text"
              inputMode="numeric"
              className="w-12 h-14 text-2xl font-bold text-center border-2 border-[#E2E8F0] rounded-xl focus:border-[#6B8DC9] focus:ring-2 focus:ring-[#6B8DC9]/20 outline-none transition-all"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={1}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleVerifyCode}
          disabled={loading || !codeComplete}
          className="w-full bg-gradient-to-r from-[#6B8DC9] to-[#9B8DC9] text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
        >
          {loading ? 'Vérification...' : 'Continuer'}
        </button>

        <div className="text-center mt-6">
          <a href="/patient/login" className="text-[#6B8DC9] text-sm hover:underline">
            J&apos;ai déjà un compte
          </a>
        </div>

        <p className="text-xs text-[#A0AEC0] text-center mt-4">
          Le code est valide pendant 7 jours
        </p>
      </div>
    </div>
  )
}
