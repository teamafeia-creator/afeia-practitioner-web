import { supabase } from '../lib/supabase';

// Détection mode dev - safe pour browser et Node
const isDev = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : false;

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
   * Créer une invitation patient
   */
  async createInvitation(data: CreateInvitationInput): Promise<CreateInvitationResult> {
    try {
      console.log('═══════════════════════════════════════');
      console.log('📨 CRÉATION INVITATION PATIENT');
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
        .from('patient_invitations')
        .select('email, status')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        console.error('❌ Invitation déjà existante');
        throw new Error('Une invitation existe déjà pour cet email');
      }

      // 3. Vérifier si le patient n'est pas déjà activé
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .single();

      if (existingPatient?.activated) {
        console.error('❌ Patient déjà activé');
        throw new Error('Ce patient a déjà un compte activé');
      }

      // 4. Générer code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔐 Code généré:', code);

      // Préparer les données
      const firstName = data.firstName || data.name?.split(' ')[0] || '';
      const lastName = data.lastName || data.name?.split(' ').slice(1).join(' ') || '';
      const fullName = data.fullName || data.name || `${firstName} ${lastName}`.trim();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours

      // 5. Créer invitation
      console.log('📝 Création invitation dans patient_invitations...');

      const { error: invitError } = await supabase
        .from('patient_invitations')
        .insert({
          practitioner_id: practitionerId,
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
        });

      if (invitError) {
        console.error('❌ Erreur création invitation:', invitError);
        throw invitError;
      }

      console.log('✅ Invitation créée');

      // 6. Créer OTP code (simple)
      console.log('📝 Création code OTP...');

      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          email: normalizedEmail,
          code: code,
          type: 'activation',
          expires_at: expiresAt,
          used: false
        });

      if (otpError) {
        console.error('❌ Erreur création OTP:', otpError);
        // Rollback invitation
        await supabase
          .from('patient_invitations')
          .delete()
          .eq('email', normalizedEmail)
          .eq('practitioner_id', practitionerId);
        throw otpError;
      }

      console.log('✅ Code OTP créé');

      // 7. Envoyer email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-otp', {
          body: {
            email: normalizedEmail,
            code: code,
            type: 'patient-activation',
            practitionerEmail: user.email,
            patientName: fullName
          }
        });

        if (emailError) {
          console.warn('⚠️ Erreur email (edge function):', emailError);

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
        console.warn('⚠️ Exception envoi email:', emailErr);
        // Ne pas bloquer si l'email échoue
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ INVITATION CRÉÉE');
      console.log('Email:', normalizedEmail);
      console.log('Code:', code);
      console.log('Praticien ID:', practitionerId);
      console.log('Statut: En attente d\'activation');
      console.log('═══════════════════════════════════════');

      return {
        success: true,
        code: isDev ? code : undefined
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
        .from('patient_invitations')
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
        .from('patient_invitations')
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
        .from('patient_invitations')
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
        .from('patient_invitations')
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

      // Créer le nouveau code
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          email: normalizedEmail,
          code: newCode,
          type: 'activation',
          expires_at: newExpiresAt,
          used: false
        });

      if (otpError) throw otpError;

      // Envoyer l'email
      try {
        await supabase.functions.invoke('send-otp', {
          body: {
            email: normalizedEmail,
            code: newCode,
            type: 'patient-activation',
            practitionerEmail: user.email,
            patientName: invitation.full_name || invitation.first_name || 'Patient'
          }
        });
        console.log('✅ Email renvoyé');
      } catch (emailErr) {
        console.warn('⚠️ Erreur envoi email:', emailErr);
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ CODE RENVOYÉ');
      console.log('Email:', normalizedEmail);
      console.log('Nouveau code:', newCode);
      console.log('═══════════════════════════════════════');

      return {
        success: true,
        code: isDev ? newCode : undefined
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
