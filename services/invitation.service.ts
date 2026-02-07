import { supabase } from '../lib/supabase';

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
    console.error('❌ Erreur appel API send-activation-code:', err);
    return { ok: false, error: String(err) };
  }
}

type CreateInvitationInput = {
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Alias pour fullName
  phone?: string;
  city?: string;
  age?: number;
  dateOfBirth?: string;
};

type CreateInvitationResult = {
  success: boolean;
  code?: string;
  consultantId?: string;
  invitationId?: string;
  error?: string;
};

type InvitationRow = {
  id: string;
  practitioner_id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  invitation_code: string;
  code_expires_at: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invited_at: string;
  accepted_at?: string | null;
};

export const invitationService = {
  /**
   * Créer une invitation consultant
   * Crée aussi un consultant avec activated=false pour permettre la redirection vers sa fiche
   */
  async createInvitation(data: CreateInvitationInput): Promise<CreateInvitationResult> {
    try {
      console.log('═══════════════════════════════════════');
      console.log('📨 CRÉATION INVITATION CONSULTANT');
      console.log('Email:', data.email);

      // 1. Récupérer le praticien connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Non authentifié');
        throw new Error('Non authentifié');
      }

      const practitionerId = user.id;
      const normalizedEmail = data.email.toLowerCase().trim();
      console.log('✅ Praticien ID:', practitionerId);

      // 2. Vérifier si invitation existe déjà
      const { data: existing } = await supabase
        .from('consultant_invitations')
        .select('id, email, status, consultant_id')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        console.log('⚠️ Invitation déjà existante, renvoi du code');
        // Renvoyer le code existant plutôt qu'échouer
        const resendResult = await this.resendInvitationCode(normalizedEmail);
        if (resendResult.success) {
          return {
            success: true,
            code: resendResult.code,
            consultantId: existing.consultant_id || undefined,
            invitationId: existing.id
          };
        }
        throw new Error('Une invitation existe déjà pour cet email');
      }

      // 3. Vérifier si le consultant n'est pas déjà activé
      const { data: existingConsultant } = await supabase
        .from('consultants')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .single();

      if (existingConsultant?.activated) {
        console.error('❌ Consultant déjà activé');
        throw new Error('Ce consultant a déjà un compte activé');
      }

      // 4. Générer code unique
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔐 Code généré:', code);

      // Préparer les données
      const firstName = data.firstName || data.name?.split(' ')[0] || '';
      const lastName = data.lastName || data.name?.split(' ').slice(1).join(' ') || '';
      const fullName = data.fullName || data.name || `${firstName} ${lastName}`.trim();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours

      // 5. Créer le consultant avec activated=false (s'il n'existe pas déjà)
      let consultantId: string;

      if (existingConsultant) {
        consultantId = existingConsultant.id;
        console.log('✅ Consultant existant non activé trouvé:', consultantId);
      } else {
        console.log('📝 Création consultant avec activated=false...');
        const { data: newConsultant, error: consultantError } = await supabase
          .from('consultants')
          .insert({
            practitioner_id: practitionerId,
            email: normalizedEmail,
            name: fullName || 'Consultant',
            full_name: fullName || null,
            first_name: firstName || null,
            last_name: lastName || null,
            phone: data.phone || null,
            city: data.city || null,
            age: data.age || null,
            date_of_birth: data.dateOfBirth || null,
            activated: false,
            is_premium: false
          })
          .select('id')
          .single();

        if (consultantError) {
          console.error('❌ Erreur création consultant:', consultantError);
          throw consultantError;
        }

        consultantId = newConsultant.id;
        console.log('✅ Consultant créé avec ID:', consultantId);
      }

      // 6. Créer invitation avec lien vers le consultant
      console.log('📝 Création invitation dans consultant_invitations...');

      const { data: invitation, error: invitError } = await supabase
        .from('consultant_invitations')
        .insert({
          practitioner_id: practitionerId,
          consultant_id: consultantId,
          email: normalizedEmail,
          full_name: fullName || null,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: data.phone || null,
          city: data.city || null,
          age: data.age || null,
          date_of_birth: data.dateOfBirth || null,
          invitation_code: code,
          code_expires_at: expiresAt,
          status: 'pending'
        })
        .select('id')
        .single();

      if (invitError) {
        console.error('❌ Erreur création invitation:', invitError);
        // Rollback consultant si nouvellement créé
        if (!existingConsultant) {
          await supabase.from('consultants').delete().eq('id', consultantId);
        }
        throw invitError;
      }

      const invitationId = invitation.id;
      console.log('✅ Invitation créée avec ID:', invitationId);

      // 7. Créer OTP code avec liens
      console.log('📝 Création code OTP...');

      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          email: normalizedEmail,
          code: code,
          type: 'activation',
          practitioner_id: practitionerId,
          consultant_id: consultantId,
          expires_at: expiresAt,
          used: false
        })
        .select('id')
        .single();

      if (otpError) {
        console.error('❌ Erreur création OTP:', otpError);
        // Rollback invitation et consultant
        await supabase.from('consultant_invitations').delete().eq('id', invitationId);
        if (!existingConsultant) {
          await supabase.from('consultants').delete().eq('id', consultantId);
        }
        throw otpError;
      }

      console.log('✅ Code OTP créé avec ID:', otpData.id);

      // 8. Envoyer email via API route (utilise le MEME code, pas de nouveau code)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        // Envoyer l'email directement sans créer un nouveau code
        try {
          const response = await fetch('/api/consultants/send-activation-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              email: normalizedEmail,
              name: fullName,
              code: code, // Utiliser le code déjà généré
              consultantId: consultantId
            })
          });

          if (response.ok) {
            console.log('✅ Email envoyé via API route');
          } else {
            // Fallback: utiliser l'ancienne API qui crée un nouveau code
            const emailResult = await sendActivationCodeViaAPI({
              email: normalizedEmail,
              name: fullName,
              consultantId: consultantId,
              token: accessToken
            });

            if (emailResult.ok) {
              console.log('✅ Email envoyé via API fallback');
              // Mettre à jour l'OTP avec le nouveau code si différent
              if (emailResult.code && emailResult.code !== code) {
                await supabase
                  .from('otp_codes')
                  .update({ code: emailResult.code })
                  .eq('id', otpData.id);
                await supabase
                  .from('consultant_invitations')
                  .update({ invitation_code: emailResult.code })
                  .eq('id', invitationId);
                console.log('✅ Code mis à jour:', emailResult.code);
              }
            } else {
              console.warn('⚠️ Erreur email (API fallback):', emailResult.error);
            }
          }
        } catch (emailErr) {
          console.warn('⚠️ Erreur envoi email:', emailErr);
          // Continuer sans bloquer - le code est créé
        }
      } else {
        console.warn('⚠️ Pas de token de session pour envoyer l\'email');
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ INVITATION CRÉÉE AVEC SUCCÈS');
      console.log('Email:', normalizedEmail);
      console.log('Code:', code);
      console.log('Consultant ID:', consultantId);
      console.log('Invitation ID:', invitationId);
      console.log('Praticien ID:', practitionerId);
      console.log('Statut: En attente d\'activation');
      console.log('═══════════════════════════════════════');

      return {
        success: true,
        code: code,
        consultantId: consultantId,
        invitationId: invitationId
      };

    } catch (err: unknown) {
      console.error('❌ Erreur createInvitation:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  },

  /**
   * Lister les invitations en attente du praticien connecté
   */
  async getMyInvitations(): Promise<{
    success: boolean;
    invitations?: InvitationRow[];
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('consultant_invitations')
        .select('*')
        .eq('practitioner_id', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} invitations en attente trouvées`);

      return { success: true, invitations: (data || []) as InvitationRow[] };

    } catch (err: unknown) {
      console.error('❌ Erreur getMyInvitations:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  /**
   * Annuler une invitation
   */
  async cancelInvitation(invitationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🚫 Annulation invitation:', invitationId);

      const { error } = await supabase
        .from('consultant_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      console.log('✅ Invitation annulée');
      return { success: true };

    } catch (err: unknown) {
      console.error('❌ Erreur cancelInvitation:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  /**
   * Renvoyer le code d'une invitation existante
   */
  async resendInvitationCode(email: string): Promise<CreateInvitationResult> {
    try {
      console.log('🔄 Renvoi code invitation pour:', email);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const normalizedEmail = email.toLowerCase().trim();

      // Chercher l'invitation existante
      const { data: invitation, error: invitError } = await supabase
        .from('consultant_invitations')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', user.id)
        .eq('status', 'pending')
        .single();

      if (invitError || !invitation) {
        throw new Error('Aucune invitation en attente trouvée pour cet email');
      }

      console.log('✅ Invitation trouvée:', invitation.id);

      // Générer un nouveau code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Mettre à jour l'invitation
      const { error: updateError } = await supabase
        .from('consultant_invitations')
        .update({
          invitation_code: newCode,
          code_expires_at: newExpiresAt
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Mettre à jour ou créer le code OTP
      // D'abord, marquer les anciens codes comme expirés
      await supabase
        .from('otp_codes')
        .update({ used: true })
        .eq('email', normalizedEmail)
        .eq('type', 'activation')
        .eq('used', false);

      // Créer le nouveau code avec practitioner_id et consultant_id pour l'app mobile
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          email: normalizedEmail,
          code: newCode,
          type: 'activation',
          expires_at: newExpiresAt,
          used: false,
          practitioner_id: user.id,
          consultant_id: invitation.consultant_id || null
        });

      if (otpError) throw otpError;

      // Envoyer l'email via API route
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      let emailCode: string | undefined = newCode;

      if (accessToken) {
        const consultantName = invitation.full_name || invitation.first_name || 'Consultant';
        const emailResult = await sendActivationCodeViaAPI({
          email: normalizedEmail,
          name: consultantName,
          token: accessToken
        });

        if (emailResult.ok) {
          console.log('✅ Email renvoyé via API route');
          emailCode = emailResult.code || newCode;
        } else {
          console.warn('⚠️ Erreur envoi email (API route):', emailResult.error);
        }
      } else {
        console.warn('⚠️ Pas de token de session pour envoyer l\'email');
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ CODE RENVOYÉ');
      console.log('Email:', normalizedEmail);
      console.log('Nouveau code:', emailCode);
      console.log('═══════════════════════════════════════');

      return {
        success: true,
        code: emailCode
      };

    } catch (err: unknown) {
      console.error('❌ Erreur resendInvitationCode:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
};

export default invitationService;
