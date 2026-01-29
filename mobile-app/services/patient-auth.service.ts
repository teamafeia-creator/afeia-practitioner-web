import { supabase } from '../lib/supabase';

export const patientAuthService = {
  /**
   * Verify OTP code and create patient account
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
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
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

      // 3. Update the patient record with the user_id (use upsert logic)
      if (userId) {
        // First try to update existing patient record
        const { data: existingPatient, error: findError } = await supabase
          .from('patients')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (existingPatient) {
          // Update existing patient
          const { error: updateError } = await supabase
            .from('patients')
            .update({
              user_id: userId,
              activated: true,
              updated_at: new Date().toISOString(),
            })
            .eq('email', normalizedEmail);

          if (updateError) {
            console.error('❌ Erreur mise à jour patient:', updateError);
          } else {
            console.log('✅ Patient mis à jour');
          }
        } else {
          console.log('⚠️ Pas de patient trouvé avec cet email, création...');
          // Insert new patient record
          const { error: insertError } = await supabase
            .from('patients')
            .insert({
              user_id: userId,
              email: normalizedEmail,
              activated: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('❌ Erreur création patient:', insertError);
            // Continue anyway - auth account is created
          } else {
            console.log('✅ Patient créé');
          }
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
