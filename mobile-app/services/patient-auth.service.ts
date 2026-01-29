import { supabase } from '../lib/supabase';

export const patientAuthService = {
  /**
   * Activer le compte avec UNIQUEMENT le code (pas d'email demandé)
   * Le système trouve automatiquement l'email associé au code dans otp_codes
   */
  async activateAccountWithCode(
    code: string,
    password: string
  ): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔐 Activation avec code uniquement');
      console.log('Code:', code);

      // 1. Chercher le code dans otp_codes pour trouver l'email
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*, practitioner_id, patient_id')
        .eq('code', code)
        .eq('used', false)
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

      console.log('✅ Code trouvé!');
      console.log('Email:', otpData.email);
      console.log('Praticien ID:', otpData.practitioner_id);
      console.log('Patient ID:', otpData.patient_id);

      const email = otpData.email;

      if (!email) {
        console.error('❌ Pas d\'email associé au code');
        return {
          success: false,
          error: 'Code invalide. Contactez votre praticien.',
        };
      }

      // 2. Use the existing activateAccount method with the found email
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
   * Verify OTP code and create patient account
   *
   * NOUVEAU FLUX (correction duplication):
   * 1. Le naturopathe crée un code OTP avec les infos patient stockées dans otp_codes
   * 2. Aucune entrée n'est créée dans `patients` par le naturopathe
   * 3. Lors de l'activation, on crée l'entrée `patients` avec les infos du code OTP
   *
   * Cela évite le conflit "Patient existe déjà"
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

      // 1. Chercher le code dans otp_codes
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .eq('used', false)
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

      console.log('✅ Code trouvé!');
      console.log('   Praticien ID:', otpData.practitioner_id || 'non défini');
      console.log('   Patient prénom:', otpData.patient_first_name || 'non défini');
      console.log('   Patient nom:', otpData.patient_last_name || 'non défini');

      const practitionerId = otpData.practitioner_id;

      if (!practitionerId) {
        console.error('❌ Pas de practitioner_id dans le code OTP');
        return {
          success: false,
          error: 'Code invalide. Contactez votre praticien.',
        };
      }

      // 2. Vérifier si un patient existe déjà avec cet email
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .single();

      if (existingPatient) {
        if (existingPatient.activated) {
          console.log('⚠️ Patient déjà activé');
          return {
            success: false,
            error: 'Ce compte est déjà activé. Utilisez "Se connecter".',
          };
        } else {
          // Supprimer l'ancien patient non activé pour éviter les conflits
          console.log('⚠️ Suppression du patient non-activé existant:', existingPatient.id);
          await supabase
            .from('patients')
            .delete()
            .eq('id', existingPatient.id);
        }
      }

      // 3. Créer le compte Auth Supabase
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

      // 4. Construire le nom du patient à partir des infos OTP
      let patientName = '';
      if (otpData.patient_first_name && otpData.patient_last_name) {
        patientName = `${otpData.patient_first_name} ${otpData.patient_last_name}`;
      } else if (otpData.patient_first_name) {
        patientName = otpData.patient_first_name;
      } else if (otpData.patient_last_name) {
        patientName = otpData.patient_last_name;
      } else {
        // Fallback: utiliser la partie avant @ de l'email
        patientName = normalizedEmail.split('@')[0];
      }

      // 5. Créer l'entrée patient avec les infos du code OTP
      console.log('📝 Création du patient avec les infos du code OTP...');

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          id: userId, // Utiliser l'ID auth comme ID patient
          practitioner_id: practitionerId,
          email: normalizedEmail,
          name: patientName,
          first_name: otpData.patient_first_name || null,
          last_name: otpData.patient_last_name || null,
          phone: otpData.patient_phone_number || null,
          date_of_birth: otpData.patient_date_of_birth || null,
          city: otpData.patient_city || null,
          status: otpData.patient_is_premium ? 'premium' : 'standard',
          is_premium: otpData.patient_is_premium || false,
          circular_enabled: otpData.patient_circular_enabled || false,
          activated: true,
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
              name: patientName,
              first_name: otpData.patient_first_name || null,
              last_name: otpData.patient_last_name || null,
              phone: otpData.patient_phone_number || null,
              date_of_birth: otpData.patient_date_of_birth || null,
              city: otpData.patient_city || null,
              status: otpData.patient_is_premium ? 'premium' : 'standard',
              is_premium: otpData.patient_is_premium || false,
              circular_enabled: otpData.patient_circular_enabled || false,
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
        console.log('✅ Patient créé:', newPatient.id);

        // Créer le membership si l'ID patient est différent de l'ID auth
        if (newPatient.id !== userId) {
          await this.createPatientMembership(newPatient.id, userId);
        }
      }

      // 6. Marquer le code comme utilisé
      await supabase
        .from('otp_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', otpData.id);

      console.log('✅ Code OTP marqué comme utilisé');

      // 7. Connecter automatiquement l'utilisateur
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          console.error('⚠️ Erreur connexion automatique:', signInError);
          // Le compte est créé, l'utilisateur peut se connecter manuellement
        }
      }

      console.log('═══════════════════════════════════════');
      console.log('✅ ACTIVATION RÉUSSIE');
      console.log('Patient créé et lié au praticien:', practitionerId);
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
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string; devCode?: string }> {
    try {
      console.log(`🔐 Demande reset password pour ${email}`);

      // Check if user exists
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (patientError || !patient) {
        console.error('❌ Patient non trouvé');
        return {
          success: false,
          error: 'Aucun compte trouvé avec cet email',
        };
      }

      // Generate a new 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔐 Code généré: ${code}`);

      // Store the code
      const { error: dbError } = await supabase.from('otp_codes').insert({
        email: email.toLowerCase().trim(),
        code,
        type: 'password-reset',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

      if (dbError) {
        console.error('❌ Erreur DB:', dbError);
        return { success: false, error: dbError.message };
      }

      // Try to send email via Edge Function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-otp', {
          body: { email: email.toLowerCase().trim(), code, type: 'password-reset' },
        });

        if (emailError) {
          console.error('❌ Erreur envoi email:', emailError);
          // In DEV mode, return the code
          if (__DEV__) {
            console.log('🔐 CODE RESET (DEV):', code);
            return { success: true, devCode: code };
          }
        }
      } catch (emailErr) {
        console.error('❌ Exception envoi email:', emailErr);
        if (__DEV__) {
          console.log('🔐 CODE RESET (DEV):', code);
          return { success: true, devCode: code };
        }
      }

      console.log('✅ Code de reset créé');
      return { success: true };
    } catch (err) {
      console.error('❌ Exception requestPasswordReset:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Reset password with code
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔐 Reset password pour ${email}`);

      // Verify the code
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        console.error('❌ Code invalide:', otpError);
        return { success: false, error: 'Code invalide ou expiré' };
      }

      console.log('✅ Code valide');

      // Use Supabase admin password reset
      // Since we can't update password without being logged in,
      // we'll use a workaround: sign in with OTP then update

      // First, try to use Supabase's built-in reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: undefined, // No redirect for mobile
        }
      );

      if (resetError) {
        console.error('❌ Erreur reset Supabase:', resetError);
        // Continue with alternative approach
      }

      // Delete the used code
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', otpData.id);

      // For now, we'll need the user to sign in first
      // This is a limitation - in production, you'd use an Edge Function
      // with admin privileges to update the password

      console.log('✅ Code vérifié - utilisez le lien email pour finaliser');
      return {
        success: true,
        error: 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.',
      };
    } catch (err) {
      console.error('❌ Exception resetPassword:', err);
      return { success: false, error: String(err) };
    }
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
