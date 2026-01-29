import { supabase } from '../lib/supabase';

/**
 * Service pour les opérations du naturopathe
 * IMPORTANT: Ne crée PAS d'entrée dans `patients` - stocke les infos dans otp_codes
 * Le patient sera créé lors de l'activation par le patient
 */

type CreatePatientInput = {
  email: string;
  name: string;
  age?: number;
  city?: string;
};

type CreatePatientResult = {
  success: boolean;
  code?: string;
  error?: string;
};

// Détection mode dev - safe pour browser et Node
const isDev = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : false;

/**
 * Crée un code d'activation pour un nouveau patient.
 *
 * IMPORTANT: Cette fonction NE crée PAS d'entrée dans la table `patients`.
 * Elle stocke les informations du patient dans la table `otp_codes`.
 * L'entrée `patients` sera créée lors de l'activation par le patient.
 *
 * Cela évite le conflit de duplication lors de l'activation.
 */
export async function createPatientActivationCode(
  patientData: CreatePatientInput
): Promise<CreatePatientResult> {
  try {
    console.log('═══════════════════════════════════════');
    console.log('👤 CRÉATION CODE D\'ACTIVATION PATIENT');
    console.log('Email:', patientData.email);

    // 1. Vérifier que le naturopathe est connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Non authentifié');
      return { success: false, error: 'Vous devez être connecté' };
    }

    const practitionerId = user.id;
    console.log('✅ Naturopathe ID:', practitionerId);

    const normalizedEmail = patientData.email.toLowerCase().trim();

    // 2. Vérifier que ce patient n'a pas déjà un code actif
    const { data: existingCode } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingCode) {
      console.log('⚠️ Code existant trouvé:', existingCode.code);
      return {
        success: true,
        code: isDev ? existingCode.code : undefined,
        error: `Un code actif existe déjà pour ${normalizedEmail}`
      };
    }

    // 3. Vérifier si un patient existe déjà avec cet email
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, activated')
      .eq('email', normalizedEmail)
      .single();

    if (existingPatient) {
      if (existingPatient.activated) {
        return {
          success: false,
          error: 'Ce patient a déjà un compte activé.'
        };
      }
      // Si le patient existe mais pas activé, on peut continuer
      // Il sera mis à jour lors de l'activation
      console.log('⚠️ Patient non-activé existant trouvé, sera mis à jour lors activation');
    }

    // 4. Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Code généré:', code);

    // 5. Stocker le code OTP avec les infos du patient (schéma simplifié)
    const otpPayload = {
      email: normalizedEmail,
      code: code,
      practitioner_id: practitionerId,
      patient_name: patientData.name,
      patient_city: patientData.city || null,
      patient_age: patientData.age || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      used: false
    };

    console.log('═══════════════════════════════════════');
    console.log('📝 INSERTION OTP_CODES');
    console.log('Payload:', JSON.stringify(otpPayload, null, 2));
    console.log('practitioner_id:', practitionerId);
    console.log('Type practitioner_id:', typeof practitionerId);
    console.log('═══════════════════════════════════════');

    const { data: insertedOtp, error: otpError } = await supabase
      .from('otp_codes')
      .insert(otpPayload)
      .select('id, email, code, practitioner_id')
      .single();

    if (otpError) {
      console.error('❌ Erreur stockage code:', otpError);
      console.error('Payload était:', JSON.stringify(otpPayload, null, 2));
      return { success: false, error: otpError.message };
    }

    console.log('✅ Code stocké avec infos patient');
    console.log('📋 OTP inséré - vérification:', JSON.stringify(insertedOtp, null, 2));
    if (insertedOtp?.practitioner_id !== practitionerId) {
      console.error('⚠️ ALERTE: practitioner_id ne correspond pas!');
      console.error('   Envoyé:', practitionerId);
      console.error('   Reçu:', insertedOtp?.practitioner_id);
    }

    // 6. Envoyer l'email d'activation
    try {
      const { error: emailError } = await supabase.functions.invoke('send-otp', {
        body: {
          email: normalizedEmail,
          code: code,
          type: 'patient-activation',
          practitionerEmail: user.email,
          patientName: patientData.name
        }
      });

      if (emailError) {
        console.error('⚠️ Erreur email (edge function):', emailError);

        if (isDev) {
          console.log(`
═══════════════════════════════════════
📧 CODE D'ACTIVATION (DEV)
Email: ${normalizedEmail}
Code: ${code}
═══════════════════════════════════════
          `);
        }
      } else {
        console.log('✅ Email envoyé via edge function');
      }
    } catch (emailErr) {
      console.error('⚠️ Exception envoi email:', emailErr);
      // Ne pas bloquer si l'email échoue
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ CODE CRÉÉ AVEC SUCCÈS');
    console.log('Code:', code);
    console.log('Email:', normalizedEmail);
    console.log('Nom:', patientData.name);
    console.log('═══════════════════════════════════════');

    return {
      success: true,
      code: isDev ? code : undefined
    };

  } catch (err) {
    console.error('❌ Exception createPatientActivationCode:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Renvoie un code d'activation existant ou en crée un nouveau
 */
export async function resendActivationCode(email: string): Promise<CreatePatientResult> {
  try {
    console.log('🔄 Renvoi code activation pour:', email);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Vous devez être connecté' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Chercher un code existant valide
    const { data: existingCode } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', user.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingCode) {
      // Renvoyer le même code
      try {
        await supabase.functions.invoke('send-otp', {
          body: {
            email: normalizedEmail,
            code: existingCode.code,
            type: 'patient-activation',
            practitionerEmail: user.email,
            patientName: existingCode.patient_name
          }
        });
        console.log('✅ Email renvoyé');
      } catch (emailErr) {
        console.error('⚠️ Exception envoi email:', emailErr);
      }

      return {
        success: true,
        code: isDev ? existingCode.code : undefined
      };
    }

    // Pas de code existant, retourner une erreur
    return {
      success: false,
      error: 'Aucun code actif trouvé pour cet email. Créez d\'abord le patient.'
    };

  } catch (err) {
    console.error('❌ Exception resendActivationCode:', err);
    return { success: false, error: String(err) };
  }
}
