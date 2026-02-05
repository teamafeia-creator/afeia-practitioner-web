import { supabase } from '../lib/supabase';

/**
 * Service pour les opérations du naturopathe
 *
 * NOUVEAU FLUX (correction visibilité patient):
 * 1. Crée IMMÉDIATEMENT une entrée dans `patients` avec activated=false
 * 2. Stocke aussi les infos dans otp_codes pour l'activation
 * 3. Le patient apparaît dans la liste du naturo avec statut "En attente"
 * 4. Lors de l'activation, le patient sera mis à jour avec l'ID auth
 */

type CreatePatientInput = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
};

type CreatePatientResult = {
  success: boolean;
  code?: string;
  patientId?: string;
  error?: string;
};

/**
 * Envoie un code d'activation via l'API route
 */
async function sendActivationCodeViaAPI(params: {
  email: string;
  name: string;
  patientId?: string;
  token: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    const response = await fetch('/api/patients/send-activation-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.token}`
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name,
        patientId: params.patientId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || 'Erreur lors de l\'envoi du code' };
    }

    return { ok: true, code: data.code };
  } catch (err) {
    console.error('❌ Erreur appel API send-activation-code:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Crée un code d'activation pour un nouveau patient.
 *
 * NOUVEAU FLUX:
 * 1. Crée IMMÉDIATEMENT le patient dans la table `patients` avec activated=false
 * 2. Stocke les informations dans `otp_codes` pour l'activation
 * 3. Le naturopathe voit le patient dans sa liste avec statut "En attente"
 * 4. Lors de l'activation, l'ancien patient sera supprimé et recréé avec l'ID auth
 */
export async function createPatientActivationCode(
  patientData: CreatePatientInput
): Promise<CreatePatientResult> {
  let tempPatientId: string | null = null;

  try {
    console.log('═══════════════════════════════════════');
    console.log('👤 CRÉATION PATIENT + CODE D\'ACTIVATION');
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

    // 2. Vérifier si un patient existe déjà avec cet email pour ce praticien
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, activated, practitioner_id')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .single();

    if (existingPatient) {
      if (existingPatient.activated) {
        return {
          success: false,
          error: 'Ce patient a déjà un compte activé.'
        };
      }
      // Si le patient existe mais pas activé, on retourne son ID et on peut régénérer un code
      console.log('⚠️ Patient non-activé existant trouvé:', existingPatient.id);
      tempPatientId = existingPatient.id;
    }

    // 3. Vérifier si un code actif existe déjà
    const { data: existingCode } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingCode && tempPatientId) {
      console.log('⚠️ Code existant trouvé:', existingCode.code);
      return {
        success: true,
        code: existingCode.code,
        patientId: tempPatientId || undefined,
        error: `Un code actif existe déjà pour ${normalizedEmail}`
      };
    }

    // 4. Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Code généré:', code);

    // Préparer les données du patient
    const firstName = patientData.firstName || patientData.name?.split(' ')[0] || '';
    const lastName = patientData.lastName || patientData.name?.split(' ').slice(1).join(' ') || '';
    const fullName = patientData.name || `${firstName} ${lastName}`.trim();

    // 5. CRÉER LE PATIENT IMMÉDIATEMENT (si n'existe pas déjà)
    if (!tempPatientId) {
      console.log('📝 Création du patient dans la table patients...');

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          practitioner_id: practitionerId,
          email: normalizedEmail,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: patientData.phone || null,
          city: patientData.city || null,
          activated: false
        })
        .select('id')
        .single();

      if (patientError) {
        console.error('❌ Erreur création patient:', patientError);
        return { success: false, error: patientError.message };
      }

      tempPatientId = newPatient.id;
      console.log('✅ Patient créé (pending):', tempPatientId);
    } else {
      // Mettre à jour les infos si le patient existe déjà
      console.log('📝 Mise à jour du patient existant:', tempPatientId);

      await supabase
        .from('patients')
        .update({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: patientData.phone || null,
          city: patientData.city || null
        })
        .eq('id', tempPatientId);
    }

    // 6. Stocker le code OTP avec les infos du patient
    const otpPayload = {
      email: normalizedEmail,
      code: code,
      practitioner_id: practitionerId,
      patient_id: tempPatientId,
      patient_first_name: firstName,
      patient_last_name: lastName,
      patient_phone: patientData.phone || null,
      patient_city: patientData.city || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      used: false
    };

    console.log('═══════════════════════════════════════');
    console.log('📝 INSERTION OTP_CODES');
    console.log('Payload:', JSON.stringify(otpPayload, null, 2));
    console.log('═══════════════════════════════════════');

    const { data: insertedOtp, error: otpError } = await supabase
      .from('otp_codes')
      .insert(otpPayload)
      .select('id, email, code, practitioner_id')
      .single();

    if (otpError) {
      console.error('❌ Erreur stockage code:', otpError);
      // Rollback: supprimer le patient créé
      if (tempPatientId && !existingPatient) {
        console.log('🔄 Rollback: suppression du patient créé');
        await supabase.from('patients').delete().eq('id', tempPatientId);
      }
      return { success: false, error: otpError.message };
    }

    console.log('✅ Code OTP créé:', insertedOtp?.id);

    // 7. Envoyer l'email d'activation via API route
    // Récupérer le token de session pour l'API
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    let emailCode: string | undefined = code;

    if (accessToken) {
      const emailResult = await sendActivationCodeViaAPI({
        email: normalizedEmail,
        name: fullName,
        patientId: tempPatientId || undefined,
        token: accessToken
      });

      if (emailResult.ok) {
        console.log('✅ Email envoyé via API route');
        emailCode = emailResult.code || code;
      } else {
        console.error('⚠️ Erreur email (API route):', emailResult.error);
      }
    } else {
      console.error('⚠️ Pas de token de session pour envoyer l\'email');
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ PATIENT CRÉÉ + CODE GÉNÉRÉ');
    console.log('Email:', normalizedEmail);
    console.log('Code:', emailCode);
    console.log('Patient ID:', tempPatientId);
    console.log('Praticien ID:', practitionerId);
    console.log('Statut: En attente d\'activation');
    console.log('═══════════════════════════════════════');

    return {
      success: true,
      code: emailCode,
      patientId: tempPatientId || undefined
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
      // Construire le nom complet à partir des colonnes correctes
      const patientName = [existingCode.patient_first_name, existingCode.patient_last_name]
        .filter(Boolean)
        .join(' ') || 'Patient';

      // Renvoyer le même code via API route
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        const emailResult = await sendActivationCodeViaAPI({
          email: normalizedEmail,
          name: patientName,
          patientId: existingCode.patient_id || undefined,
          token: accessToken
        });

        if (emailResult.ok) {
          console.log('✅ Email renvoyé via API route');
          return {
            success: true,
            code: emailResult.code || existingCode.code
          };
        } else {
          console.error('⚠️ Erreur email (API route):', emailResult.error);
        }
      }

      // Retourner le code même si l'email échoue
      return {
        success: true,
        code: existingCode.code
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

/**
 * Récupérer patients + invitations du praticien connecté
 *
 * Retourne:
 * - patients: Patients activés (ont complété leur inscription)
 * - invitations: Invitations en attente (pas encore activées)
 */
export async function getMyPatientsAndInvitations(): Promise<{
  success: boolean;
  patients?: Array<{
    id: string;
    practitioner_id: string;
    email: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    city?: string | null;
    age?: number | null;
    activated: boolean;
    activated_at?: string | null;
    created_at: string;
  }>;
  invitations?: Array<{
    id: string;
    patient_id?: string | null;
    practitioner_id: string;
    email: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    city?: string | null;
    invitation_code: string;
    status: 'pending' | 'accepted' | 'cancelled';
    invited_at: string;
  }>;
  error?: string;
}> {
  try {
    console.log('═══════════════════════════════════════');
    console.log('📋 RÉCUPÉRATION PATIENTS + INVITATIONS');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Non authentifié');
      throw new Error('Non authentifié');
    }

    console.log('✅ Praticien ID:', user.id);

    // Récupérer les patients activés
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .eq('practitioner_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (patientsError) {
      console.error('❌ Erreur récupération patients:', patientsError);
      throw patientsError;
    }

    // Récupérer les invitations en attente
    const { data: invitations, error: invitationsError } = await supabase
      .from('patient_invitations')
      .select('*')
      .eq('practitioner_id', user.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (invitationsError) {
      console.error('❌ Erreur récupération invitations:', invitationsError);
      throw invitationsError;
    }

    console.log('═══════════════════════════════════════');
    console.log(`✅ ${patients?.length || 0} patients actifs`);
    console.log(`✅ ${invitations?.length || 0} invitations en attente`);
    console.log('═══════════════════════════════════════');

    return {
      success: true,
      patients: patients || [],
      invitations: invitations || []
    };

  } catch (err) {
    console.error('❌ Exception getMyPatientsAndInvitations:', err);
    return {
      success: false,
      error: String(err)
    };
  }
}
