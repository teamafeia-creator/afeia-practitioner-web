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

      // 1. Vérifier le code dans otp_codes
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .eq('type', 'activation')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otpData) {
        console.error('Code invalide ou expire:', otpError);
        return {
          success: false,
          error: 'Code invalide ou expiré. Vérifiez le code reçu par email.',
        };
      }

      console.log('Code OTP trouve');
      console.log('   OTP ID:', otpData.id);
      console.log('   Patient ID:', otpData.patient_id);
      console.log('   Practitioner ID:', otpData.practitioner_id);

      // 2. Récupérer l'invitation - plusieurs stratégies
      let invitation: Record<string, unknown> | null = null;

      // Stratégie 1: Par patient_id si disponible
      if (otpData.patient_id) {
        console.log('Recherche invitation par patient_id:', otpData.patient_id);
        const { data: invByPatient } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('patient_id', otpData.patient_id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invByPatient) {
          invitation = invByPatient;
          console.log('Invitation trouvee par patient_id');
        }
      }

      // Stratégie 2: Par email et practitioner_id
      if (!invitation && normalizedEmail && otpData.practitioner_id) {
        console.log('Recherche invitation par email + practitioner_id');
        const { data: invByEmailPractitioner } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('practitioner_id', otpData.practitioner_id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invByEmailPractitioner) {
          invitation = invByEmailPractitioner;
          console.log('Invitation trouvee par email + practitioner_id');
        }
      }

      // Stratégie 3: Par email seul (fallback)
      if (!invitation && normalizedEmail) {
        console.log('Recherche invitation par email seul');
        const { data: invByEmail } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invByEmail) {
          invitation = invByEmail;
          console.log('Invitation trouvee par email');
        }
      }

      // Stratégie 4: Par code d'invitation (match direct)
      if (!invitation) {
        console.log('Recherche invitation par invitation_code');
        const { data: invByCode } = await supabase
          .from('patient_invitations')
          .select('*')
          .eq('invitation_code', code)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invByCode) {
          invitation = invByCode;
          console.log('Invitation trouvee par invitation_code');
        }
      }

      // Stratégie 5: Fallback - créer invitation virtuelle depuis patient
      if (!invitation && otpData.patient_id) {
        console.log('Fallback: recuperation patient directement...');
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', otpData.patient_id)
          .single();

        if (patientData) {
          console.log('Patient trouve, creation invitation virtuelle');
          invitation = {
            id: 'virtual-' + otpData.id,
            practitioner_id: patientData.practitioner_id,
            patient_id: patientData.id,
            email: patientData.email || normalizedEmail,
            full_name: patientData.name || patientData.full_name,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            phone: patientData.phone,
            city: patientData.city,
            age: patientData.age,
            date_of_birth: patientData.date_of_birth,
            status: 'pending'
          };
        }
      }

      if (!invitation) {
        console.error('Invitation non trouvee avec toutes les strategies');
        console.log('Debug info:');
        console.log('   OTP email:', otpData.email);
        console.log('   OTP patient_id:', otpData.patient_id);
        console.log('   OTP practitioner_id:', otpData.practitioner_id);
        return {
          success: false,
          error: 'Invitation non trouvée. Contactez votre naturopathe.',
        };
      }

      console.log('Invitation trouvee');
      console.log('   Praticien ID:', invitation.practitioner_id);
      console.log('   Invitation ID:', invitation.id);
      console.log('   Nom:', invitation.full_name);

      const practitionerId = invitation.practitioner_id as string;
      const existingPatientId = (invitation.patient_id || otpData.patient_id) as string | null;

      // 3. Vérifier si le patient existe déjà
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, activated')
        .eq('email', normalizedEmail)
        .eq('practitioner_id', practitionerId)
        .maybeSingle();

      if (existingPatient?.activated) {
        console.log('Patient deja active');
        return {
          success: false,
          error: 'Ce compte est déjà activé. Utilisez "Se connecter".',
        };
      }

      // 4. Créer le compte Auth Supabase
      console.log('Creation compte auth...');

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
        console.error('Erreur creation compte auth:', authError);

        // Gérer le cas "utilisateur existe déjà"
        if (authError.message.includes('already registered')) {
          console.log('Compte auth existe deja, tentative de connexion...');

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            console.error('Connexion echouee:', signInError);
            return {
              success: false,
              error: 'Un compte existe déjà avec un mot de passe différent. Utilisez "Se connecter".',
            };
          }

          console.log('Connexion reussie au compte existant');
          userId = signInData.user?.id;
        } else {
          return { success: false, error: authError.message };
        }
      } else {
        console.log('Compte auth cree:', authData.user?.id);
        userId = authData.user?.id;
      }

      if (!userId) {
        return { success: false, error: 'Erreur lors de la création du compte.' };
      }

      // 5. Construire le nom du patient
      const patientFirstName = (invitation.first_name as string) || '';
      const patientLastName = (invitation.last_name as string) || '';
      const patientFullName = (invitation.full_name as string) || `${patientFirstName} ${patientLastName}`.trim() || normalizedEmail.split('@')[0];
      const patientCity = (invitation.city as string) || null;
      const patientPhone = (invitation.phone as string) || null;
      const patientAge = (invitation.age as number) || null;
      const patientDateOfBirth = (invitation.date_of_birth as string) || null;

      // 6. Créer ou mettre à jour le patient
      let finalPatientId: string | null = null;

      const patientPayload = {
        practitioner_id: practitionerId,
        email: normalizedEmail,
        name: patientFullName,
        full_name: patientFullName,
        first_name: patientFirstName || null,
        last_name: patientLastName || null,
        phone: patientPhone,
        city: patientCity,
        age: patientAge,
        date_of_birth: patientDateOfBirth,
        activated: true,
        activated_at: new Date().toISOString(),
      };

      if (existingPatientId) {
        // Mettre à jour le patient existant (nouveau flux)
        console.log('Patient existant, mise a jour:', existingPatientId);
        const { error: updateError } = await supabase
          .from('patients')
          .update(patientPayload)
          .eq('id', existingPatientId);

        if (updateError) {
          console.error('Erreur MAJ patient:', updateError);
        } else {
          finalPatientId = existingPatientId;
          console.log('Patient mis a jour:', finalPatientId);
          // ✅ CRITIQUE : Créer le lien patient_memberships
          await this.createPatientMembership(existingPatientId, userId);
        }
      } else if (existingPatient && !existingPatient.activated) {
        // Mettre à jour l'ancien patient pending
        console.log('Patient pending, mise a jour:', existingPatient.id);
        const { error: updateError } = await supabase
          .from('patients')
          .update(patientPayload)
          .eq('id', existingPatient.id);

        if (updateError) {
          console.error('Erreur MAJ patient pending:', updateError);
        } else {
          finalPatientId = existingPatient.id;
          console.log('Patient pending mis a jour:', finalPatientId);
          // ✅ CRITIQUE : Créer le lien patient_memberships
          await this.createPatientMembership(existingPatient.id, userId);
        }
      }

      // Si pas de patient existant ou mise à jour échouée, créer nouveau
      if (!finalPatientId) {
        console.log('Creation nouveau patient avec ID auth:', userId);

        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            id: userId,
            ...patientPayload,
          })
          .select('id')
          .single();

        if (patientError) {
          console.error('Erreur creation patient:', patientError);

          if (patientError.message.includes('duplicate') || patientError.message.includes('unique')) {
            console.log('Tentative de creation sans ID specifique...');

            const { data: newPatient2, error: patientError2 } = await supabase
              .from('patients')
              .insert(patientPayload)
              .select('id')
              .single();

            if (patientError2) {
              console.error('Erreur creation patient (2eme tentative):', patientError2);
              return { success: false, error: patientError2.message };
            }

            if (newPatient2) {
              finalPatientId = newPatient2.id;
              console.log('Patient cree (sans ID specifique):', finalPatientId);
              await this.createPatientMembership(newPatient2.id, userId);
            }
          } else {
            return { success: false, error: patientError.message };
          }
        } else if (newPatient) {
          finalPatientId = newPatient.id;
          console.log('Nouveau patient cree avec ID auth:', finalPatientId);

          if (newPatient.id !== userId) {
            await this.createPatientMembership(newPatient.id, userId);
          }
        }
      }

      // 7. Marquer l'invitation comme acceptée (si c'est une vraie invitation)
      if (invitation.id && !String(invitation.id).startsWith('virtual-')) {
        console.log('Mise a jour invitation:', invitation.id);

        const { error: invitUpdateError } = await supabase
          .from('patient_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);

        if (invitUpdateError) {
          console.warn('Erreur mise a jour invitation:', invitUpdateError);
        } else {
          console.log('Invitation marquee comme acceptee');
        }
      }

      // 8. Marquer le code OTP comme utilisé
      await supabase
        .from('otp_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', otpData.id);

      console.log('Code OTP marque comme utilise');

      // 9. Connecter automatiquement l'utilisateur
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          console.error('Erreur connexion automatique:', signInError);
        } else {
          console.log('Connecte automatiquement');
        }
      }

      console.log('═══════════════════════════════════════');
      console.log('ACTIVATION REUSSIE');
      console.log('Email:', normalizedEmail);
      console.log('Patient ID:', finalPatientId || userId);
      console.log('Praticien ID:', practitionerId);
      console.log('═══════════════════════════════════════');

      return { success: true };
    } catch (err) {
      console.error('Exception activateAccount:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Helper pour créer le membership patient via RPC ULTIME
   */
  async createPatientMembership(patientId: string, userId: string): Promise<void> {
    // ═══════════════════════════════════════════════════════════════
    // CRÉATION PATIENT_MEMBERSHIPS via FONCTION RPC ULTIME
    // ═══════════════════════════════════════════════════════════════

    const finalPatientId = patientId;

    console.log('═══════════════════════════════════════');
    console.log('📝 CRÉATION MEMBERSHIP via RPC ULTIME');
    console.log('   Patient ID:', finalPatientId);
    console.log('   User ID:', userId);
    console.log('   Auth UID:', (await supabase.auth.getUser()).data.user?.id);
    console.log('═══════════════════════════════════════');

    try {
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_patient_membership_ultimate', {
          p_patient_id: finalPatientId,
          p_patient_user_id: userId
        })
        .single();

      console.log('═══════════════════════════════════════');
      console.log('📊 RÉSULTAT RPC:');
      console.log('   Data:', JSON.stringify(rpcResult, null, 2));
      console.log('   Error:', rpcError);
      console.log('═══════════════════════════════════════');

      if (rpcError) {
        console.error('❌ ERREUR RPC:', rpcError.message);
        console.error('   Code:', rpcError.code);
        console.error('   Details:', rpcError.details);
        console.error('   Hint:', rpcError.hint);
      } else if (rpcResult) {
        if (rpcResult.success) {
          console.log('✅ MEMBERSHIP CRÉÉ !');
          console.log('   Membership ID:', rpcResult.membership_id);
          console.log('   Message:', rpcResult.error_message);
        } else {
          console.error('❌ RPC a échoué:', rpcResult.error_message);
        }
      } else {
        console.error('⚠️ RPC retourné null');
      }

      console.log('🔎 Vérification lecture patient_memberships après RPC...');
      const { data: membershipCheck, error: membershipCheckError } = await supabase
        .from('patient_memberships')
        .select('id, patient_id, patient_user_id, created_at')
        .eq('patient_id', finalPatientId)
        .eq('patient_user_id', userId)
        .maybeSingle();

      console.log('📊 Résultat vérification membership:');
      console.log('   Data:', membershipCheck);
      console.log('   Error:', membershipCheckError);
    } catch (err) {
      console.error('❌ Exception lors de l\'appel RPC:', err);
    }

    console.log('═══════════════════════════════════════');
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
