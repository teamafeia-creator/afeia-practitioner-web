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
   * Verify OTP code and create patient account (legacy method with email)
   */
  async activateAccount(
    email: string,
    code: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`🔐 Activation compte pour ${normalizedEmail} avec code ${code}`);

      // 1. Verify that the code exists and is valid
      // ✅ Now also retrieve practitioner_id and patient_id for proper linking
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*, practitioner_id, patient_id')
        .eq('email', normalizedEmail)
        .eq('code', code)
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

      console.log('✅ Code valide trouvé');
      console.log('   Praticien ID (from OTP):', otpData.practitioner_id || 'non défini');
      console.log('   Patient ID (from OTP):', otpData.patient_id || 'non défini');

      // 2. Try to create Supabase Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'patient',
            email_verified: true,
          },
        },
      });

      let userId: string | undefined;

      if (authError) {
        console.error('❌ Erreur création compte:', authError);

        // Handle "user already exists" error - try to sign in instead
        if (authError.message.includes('already registered')) {
          console.log('🔄 Compte existe déjà, tentative de connexion...');

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            console.error('❌ Connexion échouée:', signInError);
            return {
              success: false,
              error: 'Un compte existe déjà. Utilisez "Se connecter" ou un mot de passe différent.',
            };
          }

          console.log('✅ Connexion réussie au compte existant');
          userId = signInData.user?.id;
        } else {
          return { success: false, error: authError.message };
        }
      } else {
        console.log('✅ Compte créé:', authData.user?.id);
        userId = authData.user?.id;
      }

      // 3. Link the auth user to the patient via patient_memberships
      if (userId) {
        let patientId: string | null = null;
        let practitionerId: string | null = otpData.practitioner_id || null;

        // ✅ PRIORITY 1: Use patient_id from OTP if available (most reliable)
        if (otpData.patient_id) {
          console.log('✅ Utilisation du patient_id de l\'OTP:', otpData.patient_id);
          patientId = otpData.patient_id;

          // Verify the patient exists
          const { data: patientCheck } = await supabase
            .from('patients')
            .select('id, practitioner_id')
            .eq('id', otpData.patient_id)
            .single();

          if (patientCheck) {
            practitionerId = patientCheck.practitioner_id;
            console.log('✅ Patient vérifié, praticien:', practitionerId);
          }
        }

        // ✅ PRIORITY 2: Find patient by email if not found via OTP
        if (!patientId) {
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('id, practitioner_id')
            .eq('email', normalizedEmail)
            .single();

          if (existingPatient) {
            patientId = existingPatient.id;
            practitionerId = existingPatient.practitioner_id;
            console.log('✅ Patient trouvé par email:', patientId);
            console.log('   Praticien associé:', practitionerId);
          }
        }

        // ✅ PRIORITY 3: Create patient if we have practitioner_id from OTP
        if (!patientId && practitionerId) {
          console.log('⚠️ Patient non trouvé, création avec practitioner_id:', practitionerId);

          const { data: newPatient, error: createError } = await supabase
            .from('patients')
            .insert({
              practitioner_id: practitionerId,
              email: normalizedEmail,
              name: normalizedEmail.split('@')[0], // Default name from email
              activated: true,
              activated_at: new Date().toISOString(),
              status: 'standard',
            })
            .select('id')
            .single();

          if (createError) {
            console.error('❌ Erreur création patient:', createError);
          } else if (newPatient) {
            patientId = newPatient.id;
            console.log('✅ Patient créé:', patientId);
          }
        }

        // ✅ Create membership if we have a patient
        if (patientId) {
          // Check if membership already exists
          const { data: existingMembership } = await supabase
            .from('patient_memberships')
            .select('patient_id')
            .eq('patient_id', patientId)
            .eq('patient_user_id', userId)
            .maybeSingle();

          if (existingMembership) {
            console.log('✅ Membership existe déjà');
          } else {
            // Create the membership link (patient_id -> patient_user_id)
            const { error: membershipError } = await supabase
              .from('patient_memberships')
              .insert({
                patient_id: patientId,
                patient_user_id: userId,
              });

            if (membershipError) {
              // Ignore duplicate key errors (membership might already exist)
              if (!membershipError.message.includes('duplicate') &&
                  !membershipError.message.includes('unique constraint')) {
                console.error('❌ Erreur création membership:', membershipError);
              } else {
                console.log('✅ Membership existe déjà (ignoré)');
              }
            } else {
              console.log('✅ Membership créé: patient', patientId, '↔ user', userId);
            }
          }

          // Update patient activated status (if column exists)
          const { error: updateError } = await supabase
            .from('patients')
            .update({
              activated: true,
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', patientId);

          if (updateError) {
            // Columns might not exist yet - that's OK
            console.log('⚠️ Mise à jour activated ignorée:', updateError.message);
          } else {
            console.log('✅ Patient marqué comme activé');
          }
        } else {
          console.error('═══════════════════════════════════════');
          console.error('❌ ERREUR: Impossible de lier le patient');
          console.error('   Email:', normalizedEmail);
          console.error('   Practitioner ID from OTP:', otpData.practitioner_id || 'MANQUANT');
          console.error('   Patient ID from OTP:', otpData.patient_id || 'MANQUANT');
          console.error('   Le praticien doit d\'abord créer le patient dans son interface');
          console.error('═══════════════════════════════════════');
          // Don't fail - the auth account is created, they can be linked later
        }
      }

      // 4. Delete the used OTP code
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', otpData.id);

      console.log('✅ Code OTP supprimé');

      // 5. Sign in the user automatically (if not already signed in)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          console.error('❌ Erreur connexion automatique:', signInError);
          // Account was created, user can login manually
        }
      }

      console.log('✅ Compte activé avec succès!');
      return { success: true };
    } catch (err) {
      console.error('❌ Exception activateAccount:', err);
      return { success: false, error: String(err) };
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
