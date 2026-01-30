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

    // Récupérer la clé API Resend depuis les secrets Supabase
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'AFEIA <contact@afeia.fr>'

    if (RESEND_API_KEY) {
      console.log('📤 Envoi email via Resend...')

      const greeting = patientName ? `Bonjour ${patientName},` : 'Bonjour,'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [email],
          subject: 'Bienvenue chez AFEIA - Votre code d\'accès',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                <div style="background-color: #2A8080; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">Bienvenue chez AFEIA</h1>
                </div>
                <div style="background-color: #F5EFE7; padding: 30px; border-radius: 0 0 8px 8px;">
                  <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;">${greeting}</p>
                  <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;">
                    Votre naturopathe vous a créé un compte AFEIA pour suivre votre accompagnement naturopathique.
                  </p>
                  <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
                    <strong>Votre code d'accès à 6 chiffres :</strong>
                  </p>
                  <div style="background-color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; margin: 16px 0; border: 2px dashed #2A8080; border-radius: 8px; color: #2A8080; font-family: 'Courier New', monospace;">
                    ${code}
                  </div>
                  <p style="color: #6B7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
                    <strong>Valable 7 jours</strong> - Utilisable une seule fois
                  </p>
                  <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;"><strong>Prochaines étapes :</strong></p>
                  <ol style="padding-left: 20px; color: #3D3D3D; font-size: 16px; line-height: 1.8;">
                    <li>Téléchargez l'application AFEIA sur votre téléphone</li>
                    <li>Entrez ce code à 6 chiffres</li>
                    <li>Créez votre mot de passe sécurisé</li>
                    <li>Commencez votre questionnaire de santé</li>
                  </ol>
                  <p style="text-align: center; margin-top: 24px;">
                    <a href="https://afeia.app/android" style="color: #2A8080; text-decoration: none; margin-right: 16px;">Télécharger pour Android</a>
                    <a href="https://afeia.app/ios" style="color: #2A8080; text-decoration: none;">Télécharger pour iOS</a>
                  </p>
                  <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6; margin-top: 24px;">
                    À très bientôt,<br /><strong>L'équipe AFEIA</strong>
                  </p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <p style="font-size: 12px; color: #6B7280;">
                    AFEIA - Votre accompagnement naturopathique personnalisé<br />
                    Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Bienvenue chez AFEIA

${greeting}

Votre naturopathe vous a créé un compte AFEIA pour suivre votre accompagnement naturopathique.

Votre code d'accès à 6 chiffres :

    ${code}

Valable 7 jours - Utilisable une seule fois.

Prochaines étapes :
1) Téléchargez l'application AFEIA sur votre téléphone
2) Entrez ce code à 6 chiffres
3) Créez votre mot de passe sécurisé
4) Commencez votre questionnaire de santé

Android : https://afeia.app/android
iOS : https://afeia.app/ios

À très bientôt,
L'équipe AFEIA

---
AFEIA - Votre accompagnement naturopathique personnalisé
Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
        }),
      })

      const responseText = await res.text()

      if (!res.ok) {
        console.error('❌ Resend API Error:', res.status, responseText)
        throw new Error(`Erreur Resend (${res.status}): ${responseText}`)
      }

      console.log('✅ Email envoyé avec succès via Resend')
      console.log('Réponse Resend:', responseText)

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

    // Fallback si RESEND_API_KEY pas configuré
    console.warn('⚠️ RESEND_API_KEY non configuré dans Supabase secrets')
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📧 EMAIL NON ENVOYÉ (RESEND_API_KEY manquant)            ║
╠═══════════════════════════════════════════════════════════╣
║  Destinataire: ${email.padEnd(40)}║
║  Code: ${code.padEnd(48)}║
║  Patient: ${(patientName || 'N/A').padEnd(44)}║
╚═══════════════════════════════════════════════════════════╝

Pour activer l'envoi d'emails, ajoutez RESEND_API_KEY aux secrets Supabase:
  supabase secrets set RESEND_API_KEY=re_xxx
    `)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Service email non configuré. Veuillez ajouter RESEND_API_KEY aux secrets Supabase.'
      }),
      {
        status: 500,
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
