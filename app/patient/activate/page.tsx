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
      console.log('🔍 Recherche du code:', codeString)

      // Chercher dans otp_codes (nouveau système)
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', codeString)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otpError) {
        console.error('Erreur recherche OTP:', otpError)
        setError('Erreur lors de la vérification')
        return
      }

      if (!otpData) {
        setError('Code invalide ou expiré')
        return
      }

      console.log('✅ Code trouvé:', otpData.email)

      // Construire le nom complet à partir de first_name et last_name
      const fullName = [otpData.patient_first_name, otpData.patient_last_name]
        .filter(Boolean)
        .join(' ')

      // Rediriger vers la page de création de mot de passe
      const params = new URLSearchParams({
        email: otpData.email,
        name: fullName,
        first_name: otpData.patient_first_name || '',
        last_name: otpData.patient_last_name || '',
        practitioner_id: otpData.practitioner_id || '',
        otp_id: otpData.id,
        city: otpData.patient_city || '',
        phone: otpData.patient_phone || ''
      })

      router.push(`/patient/register?${params.toString()}`)
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur de vérification')
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
