import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { email, code, type, patientName } = await req.json()

    console.log('📧 Envoi email')
    console.log('Email:', email)
    console.log('Code:', code)
    console.log('Type:', type)

    // Pour l'instant, juste logger (sans vraiment envoyer)
    console.log(`
═══════════════════════════════════════
✅ EMAIL (SIMULÉ)
Destinataire: team.afeia@gmail.com
Email patient: ${email}
Code: ${code}
Patient: ${patientName}
═══════════════════════════════════════
    `)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email simulé',
        code: code
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})
