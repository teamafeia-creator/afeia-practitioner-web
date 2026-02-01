import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

type FinalizeAuthResponse = {
  ok: boolean;
  userId?: string | null;
  patientId?: string | null;
  email?: string | null;
  otpId?: string | null;
  message?: string;
};

const getApiBaseUrl = () => {
  const apiBaseUrl =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    '';
  return apiBaseUrl.replace(/\/$/, '');
};

const finalizeAuth = async ({
  email,
  password,
  otpCodeOrOtpId,
}: {
  email?: string | null;
  password: string;
  otpCodeOrOtpId: string;
}): Promise<FinalizeAuthResponse> => {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return {
      ok: false,
      message: 'API non configurée. Contactez votre support.',
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/patient/finalize-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      newPassword: password,
      otpCodeOrOtpId,
    }),
  });

  const payload = (await response.json()) as FinalizeAuthResponse;

  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      message: payload.message || 'Impossible de finaliser le compte',
    };
  }

  return payload;
};

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

      const finalizeResult = await finalizeAuth({
        email: null,
        password,
        otpCodeOrOtpId: code,
      });

      if (!finalizeResult.ok) {
        console.error('❌ Finalize auth error:', finalizeResult.message);
        return {
          success: false,
          error: finalizeResult.message || 'Erreur lors de la finalisation',
        };
      }

      console.log('✅ Finalize auth OK');
      console.log('   Email:', finalizeResult.email);
      console.log('   OTP ID:', finalizeResult.otpId);
      console.log('   Patient ID:', finalizeResult.patientId);
      console.log('   User ID:', finalizeResult.userId);

      const email = finalizeResult.email;
      if (!email) {
        return { success: false, error: 'Email introuvable pour finaliser la connexion.' };
      }

      console.log('🔐 Tentative de connexion après finalize...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        return {
          success: false,
          error: 'Connexion impossible après activation. Réessayez.',
        };
      }

      console.log('✅ Sign in success:', data.user?.id);
      return { success: true, email };
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
   * 2. Récupère l'invitation via plusieurs stratégies
   * 3. Crée le compte auth Supabase
   * 4. Crée/met à jour le patient dans la table patients
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
      console.log('ACTIVATION COMPTE PATIENT');
      console.log('Email:', normalizedEmail);
      console.log('Code:', code);

      const finalizeResult = await finalizeAuth({
        email: normalizedEmail,
        password,
        otpCodeOrOtpId: code,
      });

      if (!finalizeResult.ok) {
        console.error('❌ Finalize auth error:', finalizeResult.message);
        return {
          success: false,
          error: finalizeResult.message || 'Erreur lors de la finalisation',
        };
      }

      console.log('✅ Finalize auth OK');
      console.log('   Email:', finalizeResult.email);
      console.log('   OTP ID:', finalizeResult.otpId);
      console.log('   Patient ID:', finalizeResult.patientId);
      console.log('   User ID:', finalizeResult.userId);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        return {
          success: false,
          error: 'Connexion impossible après activation. Réessayez.',
        };
      }

      console.log('✅ Sign in success');
      console.log('═══════════════════════════════════════');
      return { success: true };
    } catch (err) {
      console.error('Exception activateAccount:', err);
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
