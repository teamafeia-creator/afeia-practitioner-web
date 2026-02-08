import { supabase } from '../lib/supabase';

/**
 * Service pour les opérations du naturopathe
 *
 * NOUVEAU FLUX (correction visibilité consultant):
 * 1. Crée IMMÉDIATEMENT une entrée dans `consultants` avec activated=false
 * 2. Stocke aussi les infos dans otp_codes pour l'activation
 * 3. Le consultant apparaît dans la liste du naturo avec statut "En attente"
 * 4. Lors de l'activation, le consultant sera mis à jour avec l'ID auth
 */

type CreateConsultantInput = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
};

type CreateConsultantResult = {
  success: boolean;
  code?: string;
  consultantId?: string;
  error?: string;
};

/**
 * Envoie un code d'activation via l'API route
 */
async function sendActivationCodeViaAPI(params: {
  email: string;
  name: string;
  consultantId?: string;
  token: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    const response = await fetch('/api/consultants/send-activation-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.token}`
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name,
        consultantId: params.consultantId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || 'Erreur lors de l\'envoi du code' };
    }

    return { ok: true, code: data.code };
  } catch (err) {
    console.error('[practitioner] Erreur appel API send-activation-code:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Crée un code d'activation pour un nouveau consultant.
 *
 * NOUVEAU FLUX:
 * 1. Crée IMMÉDIATEMENT le consultant dans la table `consultants` avec activated=false
 * 2. Stocke les informations dans `otp_codes` pour l'activation
 * 3. Le naturopathe voit le consultant dans sa liste avec statut "En attente"
 * 4. Lors de l'activation, l'ancien consultant sera supprimé et recréé avec l'ID auth
 */
export async function createConsultantActivationCode(
  consultantData: CreateConsultantInput
): Promise<CreateConsultantResult> {
  let tempConsultantId: string | null = null;

  try {
    console.log('[practitioner] CREATION CONSULTANT + CODE D\'ACTIVATION');
    console.log('Email:', consultantData.email);

    // 1. Vérifier que le naturopathe est connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[practitioner] Non authentifie');
      return { success: false, error: 'Vous devez être connecté' };
    }

    const practitionerId = user.id;
    console.log('[practitioner] Naturopathe ID:', practitionerId);

    const normalizedEmail = consultantData.email.toLowerCase().trim();

    // 2. Vérifier si un consultant existe déjà avec cet email pour ce praticien
    const { data: existingConsultant } = await supabase
      .from('consultants')
      .select('id, activated, practitioner_id')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .single();

    if (existingConsultant) {
      if (existingConsultant.activated) {
        return {
          success: false,
          error: 'Ce consultant a déjà un compte activé.'
        };
      }
      // Si le consultant existe mais pas activé, on retourne son ID et on peut régénérer un code
      console.log('[practitioner] Consultant non-active existant trouve:', existingConsultant.id);
      tempConsultantId = existingConsultant.id;
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

    if (existingCode && tempConsultantId) {
      console.log('[practitioner] Code existant trouve:', existingCode.code);
      return {
        success: true,
        code: existingCode.code,
        consultantId: tempConsultantId || undefined,
        error: `Un code actif existe déjà pour ${normalizedEmail}`
      };
    }

    // 4. Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('[practitioner] Code genere:', code);

    // Préparer les données du consultant
    const firstName = consultantData.firstName || consultantData.name?.split(' ')[0] || '';
    const lastName = consultantData.lastName || consultantData.name?.split(' ').slice(1).join(' ') || '';
    const fullName = consultantData.name || `${firstName} ${lastName}`.trim();

    // 5. CRÉER LE CONSULTANT IMMÉDIATEMENT (si n'existe pas déjà)
    if (!tempConsultantId) {
      console.log('[practitioner] Creation du consultant dans la table consultants...');

      const { data: newConsultant, error: consultantError } = await supabase
        .from('consultants')
        .insert({
          practitioner_id: practitionerId,
          email: normalizedEmail,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: consultantData.phone || null,
          city: consultantData.city || null,
          activated: false
        })
        .select('id')
        .single();

      if (consultantError) {
        console.error('[practitioner] Erreur creation consultant:', consultantError);
        return { success: false, error: consultantError.message };
      }

      tempConsultantId = newConsultant.id;
      console.log('[practitioner] Consultant cree (pending):', tempConsultantId);
    } else {
      // Mettre à jour les infos si le consultant existe déjà
      console.log('[practitioner] Mise a jour du consultant existant:', tempConsultantId);

      await supabase
        .from('consultants')
        .update({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: consultantData.phone || null,
          city: consultantData.city || null
        })
        .eq('id', tempConsultantId);
    }

    // 6. Stocker le code OTP avec les infos du consultant
    const otpPayload = {
      email: normalizedEmail,
      code: code,
      practitioner_id: practitionerId,
      consultant_id: tempConsultantId,
      consultant_first_name: firstName,
      consultant_last_name: lastName,
      consultant_phone: consultantData.phone || null,
      consultant_city: consultantData.city || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      used: false
    };

    console.log('[practitioner] INSERTION OTP_CODES');
    console.log('Payload:', JSON.stringify(otpPayload, null, 2));

    const { data: insertedOtp, error: otpError } = await supabase
      .from('otp_codes')
      .insert(otpPayload)
      .select('id, email, code, practitioner_id')
      .single();

    if (otpError) {
      console.error('[practitioner] Erreur stockage code:', otpError);
      // Rollback: supprimer le consultant créé
      if (tempConsultantId && !existingConsultant) {
        console.log('[practitioner] Rollback: suppression du consultant cree');
        await supabase.from('consultants').delete().eq('id', tempConsultantId);
      }
      return { success: false, error: otpError.message };
    }

    console.log('[practitioner] Code OTP cree:', insertedOtp?.id);

    // 7. Envoyer l'email d'activation via API route
    // Récupérer le token de session pour l'API
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    let emailCode: string | undefined = code;

    if (accessToken) {
      const emailResult = await sendActivationCodeViaAPI({
        email: normalizedEmail,
        name: fullName,
        consultantId: tempConsultantId || undefined,
        token: accessToken
      });

      if (emailResult.ok) {
        console.log('[practitioner] Email envoye via API route');
        emailCode = emailResult.code || code;
      } else {
        console.error('[practitioner] Erreur email (API route):', emailResult.error);
      }
    } else {
      console.error('[practitioner] Pas de token de session pour envoyer l\'email');
    }

    console.log('[practitioner] CONSULTANT CREE + CODE GENERE');
    console.log('Email:', normalizedEmail);
    console.log('Code:', emailCode);
    console.log('Consultant ID:', tempConsultantId);
    console.log('Praticien ID:', practitionerId);
    console.log('Statut: En attente d\'activation');

    return {
      success: true,
      code: emailCode,
      consultantId: tempConsultantId || undefined
    };

  } catch (err) {
    console.error('[practitioner] Exception createConsultantActivationCode:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Renvoie un code d'activation existant ou en crée un nouveau
 */
export async function resendActivationCode(email: string): Promise<CreateConsultantResult> {
  try {
    console.log('[practitioner] Renvoi code activation pour:', email);

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
      const consultantName = [existingCode.consultant_first_name, existingCode.consultant_last_name]
        .filter(Boolean)
        .join(' ') || 'Consultant';

      // Renvoyer le même code via API route
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        const emailResult = await sendActivationCodeViaAPI({
          email: normalizedEmail,
          name: consultantName,
          consultantId: existingCode.consultant_id || undefined,
          token: accessToken
        });

        if (emailResult.ok) {
          console.log('[practitioner] Email renvoye via API route');
          return {
            success: true,
            code: emailResult.code || existingCode.code
          };
        } else {
          console.error('[practitioner] Erreur email (API route):', emailResult.error);
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
      error: 'Aucun code actif trouvé pour cet email. Créez d\'abord le consultant.'
    };

  } catch (err) {
    console.error('[practitioner] Exception resendActivationCode:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Récupérer consultants + invitations du praticien connecté
 *
 * Retourne:
 * - consultants: Consultants activés (ont complété leur inscription)
 * - invitations: Invitations en attente (pas encore activées)
 */
export async function getMyConsultantsAndInvitations(): Promise<{
  success: boolean;
  consultants?: Array<{
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
    consultant_id?: string | null;
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
    console.log('[practitioner] RECUPERATION CONSULTANTS + INVITATIONS');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[practitioner] Non authentifie');
      throw new Error('Non authentifié');
    }

    console.log('[practitioner] Praticien ID:', user.id);

    // Récupérer les consultants activés
    const { data: consultants, error: consultantsError } = await supabase
      .from('consultants')
      .select('*')
      .eq('practitioner_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (consultantsError) {
      console.error('[practitioner] Erreur recuperation consultants:', consultantsError);
      throw consultantsError;
    }

    // Récupérer les invitations en attente
    const { data: invitations, error: invitationsError } = await supabase
      .from('consultant_invitations')
      .select('*')
      .eq('practitioner_id', user.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (invitationsError) {
      console.error('[practitioner] Erreur recuperation invitations:', invitationsError);
      throw invitationsError;
    }

    console.log(`[practitioner] ${consultants?.length || 0} consultants actifs`);
    console.log(`[practitioner] ${invitations?.length || 0} invitations en attente`);

    return {
      success: true,
      consultants: consultants || [],
      invitations: invitations || []
    };

  } catch (err) {
    console.error('[practitioner] Exception getMyConsultantsAndInvitations:', err);
    return {
      success: false,
      error: String(err)
    };
  }
}
