import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, type, patientName, practitionerEmail } = await req.json()

    console.log('═══════════════════════════════════════')
    console.log('📧 SEND-OTP EDGE FUNCTION')
    console.log('Email:', email)
    console.log('Code:', code)
    console.log('Type:', type)
    console.log('Patient:', patientName)
    console.log('Praticien:', practitionerEmail)
    console.log('═══════════════════════════════════════')

    // En mode développement, on simule l'envoi
    // En production, intégrer avec un service email (Resend, SendGrid, etc.)
    const isDev = Deno.env.get('ENVIRONMENT') !== 'production'

    if (isDev) {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📧 EMAIL SIMULÉ (DEV MODE)                               ║
╠═══════════════════════════════════════════════════════════╣
║  Destinataire: ${email.padEnd(40)}║
║  Code: ${code.padEnd(48)}║
║  Patient: ${(patientName || 'N/A').padEnd(44)}║
║  Type: ${(type || 'patient-activation').padEnd(47)}║
╚═══════════════════════════════════════════════════════════╝
      `)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email simulé (mode développement)',
          code: code,
          recipient: email
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Production: Intégrer avec service email
    // Exemple avec Resend (à activer quand API key configurée):
    /*
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'AFEIA <noreply@afeia.fr>',
          to: [email],
          subject: 'Votre code d\'activation AFEIA',
          html: `
            <h1>Bienvenue sur AFEIA !</h1>
            <p>Bonjour${patientName ? ` ${patientName}` : ''},</p>
            <p>Votre code d'activation est :</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p>Ce code est valable pendant 7 jours.</p>
            <p>À bientôt,<br>L'équipe AFEIA</p>
          `,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Erreur Resend: ${error}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email envoyé avec succès'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    */

    // Fallback si pas de service email configuré
    console.log('⚠️ Aucun service email configuré - email non envoyé')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email simulé (service non configuré)',
        code: code
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erreur send-otp:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur interne'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
