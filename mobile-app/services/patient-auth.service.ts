import { supabase } from '../lib/supabase';

export const patientAuthService = {
  /**
   * Activer le compte avec UNIQUEMENT le code (pas d'email demandé)
   * Le système trouve automatiquement l'email et l'invitation associés au code
   */
  async activateAccountWithCode(
    code: string,
    password: string
  ): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔐 ACTIVATION AVEC CODE UNIQUEMENT');
      console.log('Code:', code);

      // 1. Chercher le code dans otp_codes pour trouver l'email
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .eq('type', 'activation')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        console.error('❌ Code invalide ou expiré:', otpError);
        return {
          success: false,
          error: 'Code invalide ou expiré. Vérifiez le code reçu par email.',
        };
      }

      console.log('✅ Code OTP trouvé');
      console.log('   Email:', otpData.email);
      console.log('   OTP ID:', otpData.id);

      const email = otpData.email;

      if (!email) {
        console.error('❌ Pas d\'email associé au code');
        return {
          success: false,
          error: 'Code invalide. Contactez votre praticien.',
        };
      }

      // 2. Utiliser la méthode activateAccount avec l'email trouvé
      const result = await this.activateAccount(email, code, password);

      if (result.success) {
        return { success: true, email };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('❌ Exception activateAccountWithCode:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Vérifier le code OTP et créer le compte patient
   *
   * NOUVEAU FLUX (architecture patient_invitations):
   * 1. Vérifie le code OTP dans otp_codes
   * 2. Récupère l'invitation dans patient_invitations
   * 3. Crée le compte auth Supabase
   * 4. Crée le patient dans la table patients
   * 5. Marque l'invitation comme acceptée
   */
  async activateAccount(
    email: string,
    code: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('═══════════════════════════════════════');
      console.log('🔐 ACTIVATION COMPTE PATIENT');
      console.log('Email:', normalizedEmail);
      console.log('Code:', code);

      // 1. Vérifier le code dans otp_codes
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .eq('used', false)
        .eq('type', 'activation')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        console.error('❌ Code invalide ou expiré:', otpError);
        return {
          success: false,
          error: 'Code invalide ou expiré. Vérifiez le code reçu par email.',
        };
      }

      console.log('✅ Code OTP trouvé');
      console.log('   OTP ID:', otpData.id);

      // 2. Récupérer l'invitation correspondante
      const { data: invitation, error: invitError } = await supabase
        .from('patient_invitations')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })
        .limit(1)
        .single();

      if (invitError || !invitation) {
        console.error('❌ Invitation non trouvée:', invitError);
        return {
          success: false,
          error: 'Invitation non trouvée. Contactez votre naturopathe.',
        };
      }

      console.log('✅ Invitation trouvée');
      console.log('   Praticien ID:', invitation.practitioner_id);
      console.log('   Invitation ID:', invitation.id);
      console.log('   Nom:', invitation.full_name);

      const practitionerId = invitation.practitioner_id;

      // 3. Vérifier si le patient existe déjà
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .single();

      if (existingPatient?.activated) {
        console.log('⚠️ Patient déjà activé');
        return {
          success: false,
          error: 'Ce compte est déjà activé. Utilisez "Se connecter".',
        };
      }

      // 4. Créer le compte Auth Supabase
      console.log('📝 Création compte auth...');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'patient',
            practitioner_id: practitionerId,
            email_verified: true,
          },
        },
      });

      let userId: string | undefined;

      if (authError) {
        console.error('❌ Erreur création compte auth:', authError);

        // Gérer le cas "utilisateur existe déjà"
        if (authError.message.includes('already registered')) {
          console.log('🔄 Compte auth existe déjà, tentative de connexion...');

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            console.error('❌ Connexion échouée:', signInError);
            return {
              success: false,
              error: 'Un compte existe déjà avec un mot de passe différent. Utilisez "Se connecter".',
            };
          }

          console.log('✅ Connexion réussie au compte existant');
          userId = signInData.user?.id;
        } else {
          return { success: false, error: authError.message };
        }
      } else {
        console.log('✅ Compte auth créé:', authData.user?.id);
        userId = authData.user?.id;
      }

      if (!userId) {
        return { success: false, error: 'Erreur lors de la création du compte.' };
      }

      // 5. Construire le nom du patient
      const patientFirstName = invitation.first_name || '';
      const patientLastName = invitation.last_name || '';
      const patientFullName = invitation.full_name || `${patientFirstName} ${patientLastName}`.trim() || normalizedEmail.split('@')[0];
      const patientCity = invitation.city || null;
      const patientPhone = invitation.phone || null;
      const patientAge = invitation.age || null;
      const patientDateOfBirth = invitation.date_of_birth || null;

      // 6. Supprimer l'ancien patient pending s'il existe
      if (existingPatient && !existingPatient.activated) {
        console.log('🗑️ Suppression du patient pending:', existingPatient.id);
        await supabase
          .from('patients')
          .delete()
          .eq('id', existingPatient.id);
        console.log('✅ Patient pending supprimé');
      }

      // 7. Créer le nouveau patient avec l'ID auth
      console.log('📝 Création du patient avec ID auth:', userId);

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          id: userId, // ✅ VRAI ID auth
          practitioner_id: practitionerId,
          email: normalizedEmail,
          full_name: patientFullName,
          first_name: patientFirstName || null,
          last_name: patientLastName || null,
          phone: patientPhone,
          city: patientCity,
          age: patientAge,
          date_of_birth: patientDateOfBirth,
          activated: true, // ✅ ACTIVÉ
          activated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (patientError) {
        console.error('❌ Erreur création patient:', patientError);

        // Si l'erreur est due à un ID dupliqué, essayer sans spécifier l'ID
        if (patientError.message.includes('duplicate') || patientError.message.includes('unique')) {
          console.log('⚠️ Tentative de création sans ID spécifique...');

          const { data: newPatient2, error: patientError2 } = await supabase
            .from('patients')
            .insert({
              practitioner_id: practitionerId,
              email: normalizedEmail,
              full_name: patientFullName,
              first_name: patientFirstName || null,
              last_name: patientLastName || null,
              phone: patientPhone,
              city: patientCity,
              age: patientAge,
              date_of_birth: patientDateOfBirth,
              activated: true,
              activated_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (patientError2) {
            console.error('❌ Erreur création patient (2ème tentative):', patientError2);
            return { success: false, error: patientError2.message };
          }

          if (newPatient2) {
            console.log('✅ Patient créé (sans ID spécifique):', newPatient2.id);

            // Créer le membership
            await this.createPatientMembership(newPatient2.id, userId);
          }
        } else {
          return { success: false, error: patientError.message };
        }
      } else if (newPatient) {
        console.log('✅ Nouveau patient créé avec ID auth:', newPatient.id);

        // Créer le membership si l'ID patient est différent de l'ID auth
        if (newPatient.id !== userId) {
          await this.createPatientMembership(newPatient.id, userId);
        }
      }

      // 8. Marquer l'invitation comme acceptée
      console.log('📝 Mise à jour invitation:', invitation.id);

      const { error: invitUpdateError } = await supabase
        .from('patient_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (invitUpdateError) {
        console.warn('⚠️ Erreur mise à jour invitation:', invitUpdateError);
      } else {
        console.log('✅ Invitation marquée comme acceptée');
      }

      // 9. Marquer le code OTP comme utilisé
      await supabase
        .from('otp_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', otpData.id);

      console.log('✅ Code OTP marqué comme utilisé');

      // 10. Connecter automatiquement l'utilisateur
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          console.error('⚠️ Erreur connexion automatique:', signInError);
          // Le compte est créé, l'utilisateur peut se connecter manuellement
        } else {
          console.log('✅ Connecté automatiquement');
        }
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ ACTIVATION RÉUSSIE');
      console.log('Email:', normalizedEmail);
      console.log('Patient ID:', userId);
      console.log('Praticien ID:', practitionerId);
      console.log('═══════════════════════════════════════');

      return { success: true };
    } catch (err) {
      console.error('❌ Exception activateAccount:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Helper pour créer le membership patient
   */
  async createPatientMembership(patientId: string, userId: string): Promise<void> {
    try {
      // Vérifier si le membership existe déjà
      const { data: existingMembership } = await supabase
        .from('patient_memberships')
        .select('patient_id')
        .eq('patient_id', patientId)
        .eq('patient_user_id', userId)
        .maybeSingle();

      if (existingMembership) {
        console.log('✅ Membership existe déjà');
        return;
      }

      // Créer le membership
      const { error: membershipError } = await supabase
        .from('patient_memberships')
        .insert({
          patient_id: patientId,
          patient_user_id: userId,
        });

      if (membershipError) {
        if (!membershipError.message.includes('duplicate') &&
            !membershipError.message.includes('unique constraint')) {
          console.error('❌ Erreur création membership:', membershipError);
        } else {
          console.log('✅ Membership existe déjà (ignoré)');
        }
      } else {
        console.log('✅ Membership créé: patient', patientId, '↔ user', userId);
      }
    } catch (err) {
      console.error('⚠️ Exception createPatientMembership:', err);
    }
  },

  /**
   * Sign in patient with email and password
   */
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Connexion patient:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('❌ Erreur connexion:', error);
        return {
          success: false,
          error: 'Email ou mot de passe incorrect',
        };
      }

      console.log('✅ Connecté:', data.user?.email);
      return { success: true };
    } catch (err) {
      console.error('❌ Exception signIn:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Request a password reset code
   * Note: Uses Supabase built-in password reset
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      console.log(`🔐 Demande reset password pour ${email}`);

      // Check if user exists
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, email, practitioner_id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (patientError || !patient) {
        console.error('❌ Patient non trouvé');
        return {
          success: false,
          error: 'Aucun compte trouvé avec cet email',
        };
      }

      // Use Supabase built-in password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim()
      );

      if (resetError) {
        console.error('❌ Erreur reset Supabase:', resetError);
        return { success: false, error: resetError.message };
      }

      console.log('✅ Email de reset envoyé');
      return { success: true };
    } catch (err) {
      console.error('❌ Exception requestPasswordReset:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Reset password with code
   * Note: With the simplified schema, we use Supabase's built-in password reset flow
   */
  async resetPassword(
    _email: string,
    _code: string,
    _newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    // With the simplified schema, password reset is handled via Supabase's email link
    // This function now just returns a message to use the email link
    return {
      success: false,
      error: 'Veuillez utiliser le lien reçu par email pour réinitialiser votre mot de passe.',
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚪 Déconnexion...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Erreur logout:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Déconnecté');
      return { success: true };
    } catch (err) {
      console.error('❌ Exception signOut:', err);
      return { success: false, error: String(err) };
    }
  },
};
