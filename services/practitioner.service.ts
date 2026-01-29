import { supabase } from '../lib/supabase';

/**
 * Service pour les opérations du naturopathe
 * IMPORTANT: Ne crée PAS d'entrée dans `patients` - stocke les infos dans otp_codes
 * Le patient sera créé lors de l'activation par le patient
 */

type CreatePatientInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  name?: string; // Fallback si firstName/lastName non fournis
  age?: number;
  city?: string;
  isPremium?: boolean;
  circularEnabled?: boolean;
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

    // 5. Extraire prénom/nom du champ "name" si nécessaire
    let firstName = patientData.firstName;
    let lastName = patientData.lastName;

    if ((!firstName || !lastName) && patientData.name) {
      const nameParts = patientData.name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        firstName = firstName || nameParts[0];
        lastName = lastName || nameParts.slice(1).join(' ');
      } else {
        firstName = firstName || patientData.name;
      }
    }

    // 6. Calculer date de naissance à partir de l'âge si nécessaire
    let dateOfBirth = patientData.dateOfBirth;
    if (!dateOfBirth && patientData.age && patientData.age > 0) {
      const birthYear = new Date().getFullYear() - patientData.age;
      dateOfBirth = `${birthYear}-01-01`; // Approximation
    }

    // 7. Stocker le code OTP avec TOUTES les infos du patient
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code: code,
        type: 'activation',
        practitioner_id: practitionerId,

        // ✅ STOCKER LES INFOS PATIENT DANS OTP_CODES
        patient_first_name: firstName || null,
        patient_last_name: lastName || null,
        patient_phone_number: patientData.phoneNumber || null,
        patient_date_of_birth: dateOfBirth || null,

        // Infos supplémentaires
        patient_city: patientData.city || null,
        patient_is_premium: patientData.isPremium || false,
        patient_circular_enabled: patientData.circularEnabled || false,

        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
        used: false
      });

    if (otpError) {
      console.error('❌ Erreur stockage code:', otpError);
      return { success: false, error: otpError.message };
    }

    console.log('✅ Code stocké avec infos patient');

    // 8. Envoyer l'email d'activation
    try {
      const { error: emailError } = await supabase.functions.invoke('send-otp', {
        body: {
          email: normalizedEmail,
          code: code,
          type: 'patient-activation',
          practitionerEmail: user.email,
          patientName: firstName || patientData.name
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
    console.log('Prénom:', firstName);
    console.log('Nom:', lastName);
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
            patientName: existingCode.patient_first_name
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
