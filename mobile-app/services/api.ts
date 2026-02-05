import { supabase } from '../lib/supabase';
import {
  Complement,
  Conseil,
  Message,
  JournalEntry,
  Article,
  WearableData,
  AnamneseData,
  Plan,
} from '../types';

type ApiAuthErrorCode = 'AUTH_REQUIRED' | 'PATIENT_NOT_READY';

class ApiAuthError extends Error {
  code: ApiAuthErrorCode;

  constructor(code: ApiAuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiAuthError';
  }
}

export const isApiAuthError = (
  error: unknown,
  code?: ApiAuthErrorCode
): error is ApiAuthError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as ApiAuthError;
  if (!candidate.code || candidate.name !== 'ApiAuthError') {
    return false;
  }

  return code ? candidate.code === code : true;
};

const createAuthError = (code: ApiAuthErrorCode, message: string) =>
  new ApiAuthError(code, message);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

// Helper to get patient ID from current user
const getPatientId = async (userIdOverride?: string): Promise<string | null> => {
  const userId = userIdOverride ?? await getCurrentUserId();

  console.log('═══════════════════════════════════════');
  console.log('🔍 GET PATIENT ID');
  console.log('   User ID:', userId);

  if (!userId) {
    console.log('❌ No authenticated user');
    console.log('═══════════════════════════════════════');
    return null;
  }

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // Get patient record for this user via patient_memberships
    const { data: membership, error } = await supabase
      .from('patient_memberships')
      .select('patient_id')
      .eq('patient_user_id', userId)
      .maybeSingle();

    console.log(`📊 Résultat query patient_memberships (tentative ${attempt}/${maxAttempts}):`);
    console.log('   Data:', membership);
    console.log('   Error:', error);
    console.log('   Patient ID:', membership?.patient_id);

    if (error) {
      console.log('❌ Patient lookup error:', error.message);
      console.log('   Code:', (error as any).code);
      console.log('   Details:', (error as any).details);
      console.log('   Hint:', (error as any).hint);
      console.log('═══════════════════════════════════════');
      return null;
    }

    if (membership?.patient_id) {
      console.log('✅ Patient ID trouvé:', membership.patient_id);
      console.log('═══════════════════════════════════════');
      return membership.patient_id;
    }

    if (attempt < maxAttempts) {
      const delayMs = 500 * attempt;
      console.log(`⏳ Membership non disponible, retry dans ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  console.log('⚠️ Patient ID introuvable après retries.');
  console.log('═══════════════════════════════════════');
  return null;
};

const requirePatientContext = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    throw createAuthError('AUTH_REQUIRED', 'Session utilisateur absente');
  }

  const patientId = await getPatientId(userId);

  if (!patientId) {
    throw createAuthError('PATIENT_NOT_READY', 'Patient non prêt');
  }

  return { patientId, userId };
};

export const api = {
  // Auth - now handled by Supabase auth directly
  async verifyOTP(code: string) {
    console.log('📊 Verifying OTP code...');
    // OTP verification via edge function or API route
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { code },
    });

    if (error) {
      console.error('❌ OTP verification error:', error);
      throw error;
    }

    console.log('✅ OTP verified:', data);
    return data;
  },

  async register(patientId: string, email: string, password: string, _tempToken: string) {
    console.log('📊 Registering user:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          patient_id: patientId,
        },
      },
    });

    if (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }

    console.log('✅ Registration successful:', data.user?.email);
    return {
      user: data.user,
      session: data.session,
    };
  },

  async login(email: string, password: string) {
    console.log('📊 Logging in:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login error:', error);
      throw error;
    }

    console.log('✅ Login successful:', data.user?.email);
    return {
      user: data.user,
      session: data.session,
    };
  },

  async logout() {
    console.log('📊 Logging out...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }

    console.log('✅ Logout successful');
  },

  // Patient Profile
  async getProfile() {
    const startTime = Date.now();
    console.log('═══════════════════════════════════════');
    console.log('[APP] Loading profile...');

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[APP] Session present:', !!session);
    console.log('[APP] Session user:', session?.user?.id, session?.user?.email);

    const { patientId, userId } = await requirePatientContext();
    console.log('[APP] Patient ID:', patientId);
    console.log('[APP] User ID:', userId);

    const { data, error } = await supabase
      .from('patients')
      .select('*, practitioners(full_name, email, phone)')
      .eq('id', patientId)
      .maybeSingle();

    const queryDuration = Date.now() - startTime;
    console.log(`[APP] Patient query duration: ${queryDuration}ms`);
    console.log('[APP] Patient data present:', !!data);
    console.log('[APP] Patient query error:', error ? error.message : 'none');

    if (error) {
      console.error('[APP] Profile load error:', error);
      console.error('[APP] Error code:', (error as any).code);
      console.error('[APP] Error details:', (error as any).details);
      console.error('[APP] Error hint:', (error as any).hint);
      throw error;
    }

    if (!data) {
      console.log('[APP] Profile not found for patient:', patientId);
      console.log('[APP] Checking membership integrity...');

      // Extra diagnostic: check if the membership row points to a valid patient
      const { data: membership } = await supabase
        .from('patient_memberships')
        .select('patient_id, patient_user_id')
        .eq('patient_user_id', userId)
        .maybeSingle();

      if (membership) {
        console.log('[APP] Membership exists:', JSON.stringify(membership));
        console.log('[APP] But patient row is missing for patient_id:', membership.patient_id);
      } else {
        console.log('[APP] No membership found for user_id:', userId);
      }

      // Check if patient exists at all in the DB
      const { data: patientExists } = await supabase
        .from('patients')
        .select('id, email, activated, practitioner_id')
        .eq('id', patientId)
        .maybeSingle();

      console.log('[APP] Direct patient lookup:', patientExists ? JSON.stringify(patientExists) : 'not found');
      console.log('═══════════════════════════════════════');

      throw new Error('Patient profile not found');
    }

    // Handle both old schema (name) and new schema (first_name, last_name)
    let firstName = data.first_name;
    let lastName = data.last_name;
    if (!firstName && data.name) {
      const nameParts = data.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const duration = Date.now() - startTime;
    console.log(`[APP] Profile loaded in ${duration}ms: ${data?.email}`);
    console.log('[APP] Patient name:', firstName, lastName);
    console.log('[APP] Practitioner:', data.practitioners ? (data.practitioners as any).full_name : 'none');
    console.log('[APP] Activated:', data.activated, '| Premium:', data.is_premium);
    console.log('═══════════════════════════════════════');

    return {
      id: data.id,
      email: data.email,
      firstName,
      lastName,
      phone: data.phone,
      practitioner: data.practitioners ? {
        fullName: (data.practitioners as any).full_name,
        email: (data.practitioners as any).email,
        phone: (data.practitioners as any).phone,
      } : null,
    };
  },

  async updateProfile(profileData: { firstName?: string; lastName?: string; phone?: string }) {
    console.log('📊 Updating profile...');
    const { patientId } = await requirePatientContext();

    // Build update object with both old and new column formats
    const updateData: Record<string, string | undefined> = {
      phone: profileData.phone,
      updated_at: new Date().toISOString(),
    };

    if (profileData.firstName !== undefined || profileData.lastName !== undefined) {
      // Update new columns
      updateData.first_name = profileData.firstName;
      updateData.last_name = profileData.lastName;
      // Also update legacy 'name' column for backwards compatibility
      const fullName = [profileData.firstName, profileData.lastName].filter(Boolean).join(' ');
      if (fullName) {
        updateData.name = fullName;
      }
    }

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }

    console.log('✅ Profile updated');
    return data;
  },

  async getNaturopatheInfo() {
    console.log('📊 Loading naturopathe info...');
    const { patientId } = await requirePatientContext();

    // Get patient's practitioner
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('practitioner_id')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError) {
      console.error('❌ Patient lookup error:', patientError);
      throw patientError;
    }

    if (!patient?.practitioner_id) {
      console.log('ℹ️ No practitioner assigned to patient');
      return null;
    }

    const { data: practitioner, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('id', patient.practitioner_id)
      .maybeSingle();

    if (error) {
      console.error('❌ Naturopathe load error:', error);
      throw error;
    }

    if (!practitioner) {
      console.log('ℹ️ Practitioner not found');
      return null;
    }

    console.log('✅ Naturopathe info loaded:', practitioner?.full_name);
    return {
      id: practitioner.id,
      fullName: practitioner.full_name,
      email: practitioner.email,
      phone: practitioner.phone,
    };
  },

  // Anamnese
  async submitAnamnese(anamneseData: AnamneseData) {
    console.log('📊 Submitting anamnese...');
    const { patientId } = await requirePatientContext();

    const { data, error } = await supabase
      .from('patient_anamnesis')
      .upsert({
        patient_id: patientId,
        data: anamneseData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Anamnese submit error:', error);
      throw error;
    }

    console.log('✅ Anamnese submitted');
    return data;
  },

  async getAnamnese() {
    console.log('📊 Loading anamnese...');
    const { patientId } = await requirePatientContext();

    const { data, error } = await supabase
      .from('patient_anamnesis')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('❌ Anamnese load error:', error);
      throw error;
    }

    console.log('✅ Anamnese loaded');
    return data?.data || null;
  },

  // Complements
  async getComplements(): Promise<{ complements: Complement[] }> {
    console.log('📊 Loading complements...');
    const { patientId } = await requirePatientContext();

    const today = new Date().toISOString().split('T')[0];

    // Get prescriptions for this patient
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select('*, prescription_items(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Complements load error:', error);
      throw error;
    }

    // Get today's tracking
    const { data: tracking } = await supabase
      .from('complement_tracking')
      .select('*')
      .eq('patient_id', patientId)
      .eq('date', today);

    const takenIds = new Set(tracking?.filter((t) => t.taken).map((t) => t.complement_id) || []);

    // Transform prescriptions to complements
    const complements: Complement[] = [];
    prescriptions?.forEach((prescription) => {
      prescription.prescription_items?.forEach((item: { id: string; name: string; dosage?: string; frequency?: string; duration?: number; instructions?: string }) => {
        complements.push({
          id: item.id,
          name: item.name,
          dosage: item.dosage || '',
          frequency: item.frequency || '1x/jour',
          duration: item.duration || 30,
          instructions: item.instructions,
          takenToday: takenIds.has(item.id),
        });
      });
    });

    console.log('✅ Complements loaded:', complements.length);
    return { complements };
  },

  async trackComplement(complementId: string, taken: boolean) {
    console.log('📊 Tracking complement:', complementId, taken);
    const { patientId } = await requirePatientContext();

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('complement_tracking')
      .upsert({
        patient_id: patientId,
        complement_id: complementId,
        date: today,
        taken,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Complement tracking error:', error);
      throw error;
    }

    console.log('✅ Complement tracked');
    return data;
  },

  // Conseils
  async getConseils(category?: string): Promise<{ conseils: Conseil[] }> {
    console.log('📊 Loading conseils...', category ? `category: ${category}` : '');
    const { patientId } = await requirePatientContext();

    let query = supabase
      .from('conseils')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Conseils load error:', error);
      throw error;
    }

    const conseils: Conseil[] =
      data?.map((c) => ({
        id: c.id,
        category: c.category,
        title: c.title,
        content: c.content,
        date: c.created_at,
        read: c.read || false,
      })) || [];

    console.log('✅ Conseils loaded:', conseils.length);
    return { conseils };
  },

  async markConseilRead(conseilId: string) {
    console.log('📊 Marking conseil as read:', conseilId);
    await requirePatientContext();

    const { error } = await supabase
      .from('conseils')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', conseilId);

    if (error) {
      console.error('❌ Mark conseil read error:', error);
      throw error;
    }

    console.log('✅ Conseil marked as read');
  },

  // Journal
  async submitJournal(entry: Partial<JournalEntry>) {
    console.log('📊 Submitting journal entry...');
    const { patientId } = await requirePatientContext();

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert({
        patient_id: patientId,
        date: today,
        mood: entry.mood,
        alimentation: entry.alimentation,
        sleep: entry.sleep,
        energy: entry.energy,
        complements_taken: entry.complementsTaken,
        problems: entry.problems,
        note_for_naturo: entry.noteForNaturo,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Journal submit error:', error);
      throw error;
    }

    console.log('✅ Journal entry submitted');
    return data;
  },

  async getJournalHistory(
    startDate?: string,
    endDate?: string
  ): Promise<{ entries: JournalEntry[] }> {
    console.log('📊 Loading journal history...');
    const { patientId } = await requirePatientContext();

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Journal history error:', error);
      throw error;
    }

    const entries: JournalEntry[] =
      data?.map((e) => ({
        id: e.id,
        date: e.date,
        mood: e.mood,
        alimentation: e.alimentation,
        sleep: e.sleep,
        energy: e.energy,
        complementsTaken: e.complements_taken || [],
        problems: e.problems,
        noteForNaturo: e.note_for_naturo,
      })) || [];

    console.log('✅ Journal history loaded:', entries.length);
    return { entries };
  },

  async getTodayJournal(): Promise<JournalEntry | null> {
    console.log('📊 Loading today journal...');
    const { patientId } = await requirePatientContext();

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', patientId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Today journal error:', error);
      throw error;
    }

    if (!data) {
      console.log('📊 No journal entry for today');
      return null;
    }

    console.log('✅ Today journal loaded');
    return {
      id: data.id,
      date: data.date,
      mood: data.mood,
      alimentation: data.alimentation,
      sleep: data.sleep,
      energy: data.energy,
      complementsTaken: data.complements_taken || [],
      problems: data.problems,
      noteForNaturo: data.note_for_naturo,
    };
  },

  // Messages
  async getMessages(): Promise<{ messages: Message[] }> {
    console.log('📊 Loading messages...');
    const { patientId } = await requirePatientContext();

    // Messages are linked to patient via patient_id, not sender_id/receiver_id
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Messages load error:', error);
      throw error;
    }

    const messages: Message[] =
      data?.map((m) => ({
        id: m.id,
        // sender_role indicates if it's from patient or practitioner
        senderId: m.sender_role === 'patient' ? patientId : 'practitioner',
        // Support both old (body/text) and new (content) column names
        content: m.content ?? m.body ?? m.text ?? '',
        timestamp: m.created_at ?? m.sent_at,
        read: m.read ?? m.read_by_practitioner ?? false,
        senderRole: m.sender_role ?? m.sender,
      })) || [];

    console.log('✅ Messages loaded:', messages.length);
    return { messages };
  },

  async sendMessage(messageContent: string) {
    console.log('📊 Sending message...');
    const { patientId } = await requirePatientContext();

    // Insert message with patient_id and sender_role (patient sending)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        patient_id: patientId,
        sender_role: 'patient',
        body: messageContent, // Use 'body' column (will be synced to 'content' by trigger)
        content: messageContent,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }

    console.log('✅ Message sent');
    return data;
  },

  async markMessageRead(messageId: string) {
    console.log('📊 Marking message as read:', messageId);
    await requirePatientContext();

    const { error } = await supabase
      .from('messages')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('❌ Mark message read error:', error);
      throw error;
    }

    console.log('✅ Message marked as read');
  },

  // Articles
  async getArticles(category?: string): Promise<{ articles: Article[] }> {
    console.log('📊 Loading articles...', category ? `category: ${category}` : '');

    let query = supabase
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Articles load error:', error);
      throw error;
    }

    const articles: Article[] =
      data?.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        summary: a.summary || '',
        content: a.content,
        imageUrl: a.image_url,
        date: a.created_at,
      })) || [];

    console.log('✅ Articles loaded:', articles.length);
    return { articles };
  },

  async getArticle(articleId: string): Promise<Article | null> {
    console.log('📊 Loading article:', articleId);

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (error) {
      console.error('❌ Article load error:', error);
      throw error;
    }

    if (!data) {
      console.log('ℹ️ Article not found:', articleId);
      return null;
    }

    console.log('✅ Article loaded:', data.title);
    return {
      id: data.id,
      title: data.title,
      category: data.category,
      summary: data.summary || '',
      content: data.content,
      imageUrl: data.image_url,
      date: data.created_at,
    };
  },

  // Wearables
  async syncWearableData(wearableData: WearableData) {
    console.log('📊 Syncing wearable data...');
    const { patientId } = await requirePatientContext();

    const { data, error } = await supabase
      .from('wearable_data')
      .insert({
        patient_id: patientId,
        steps: wearableData.steps,
        heart_rate: wearableData.heartRate,
        sleep_hours: wearableData.sleep,
        calories: wearableData.calories,
        synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Wearable sync error:', error);
      throw error;
    }

    console.log('✅ Wearable data synced');
    return data;
  },

  async getWearableData(): Promise<{ data: WearableData | null }> {
    console.log('📊 Loading wearable data...');
    const { patientId } = await requirePatientContext();

    // Get latest wearable data
    const { data, error } = await supabase
      .from('wearable_data')
      .select('*')
      .eq('patient_id', patientId)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Wearable load error:', error);
      throw error;
    }

    if (!data) {
      console.log('📊 No wearable data found');
      return { data: null };
    }

    console.log('✅ Wearable data loaded');
    return {
      data: {
        steps: data.steps,
        heartRate: data.heart_rate,
        sleep: data.sleep_hours,
        calories: data.calories,
        lastSync: data.synced_at,
      },
    };
  },

  // Plans de soin
  async getPlans(): Promise<{ plans: Plan[] }> {
    console.log('📊 Loading plans...');
    const { patientId } = await requirePatientContext();

    // Get plans from patient_plans table (shared plans by practitioner)
    const { data, error } = await supabase
      .from('patient_plans')
      .select(`
        id,
        version,
        status,
        content,
        shared_at,
        created_at,
        updated_at,
        practitioner_id,
        practitioners:practitioner_id (
          id,
          full_name,
          email
        )
      `)
      .eq('patient_id', patientId)
      .eq('status', 'shared')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Plans load error:', error);
      // Try alternative table structure (care_plans)
      const { data: carePlans, error: carePlansError } = await supabase
        .from('care_plans')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['sent', 'viewed'])
        .order('created_at', { ascending: false });

      if (carePlansError) {
        console.error('❌ Care plans load error:', carePlansError);
        throw carePlansError;
      }

      const plans: Plan[] = carePlans?.map((p) => ({
        id: p.id,
        title: p.title || 'Plan de soin',
        description: p.description,
        content: p.content,
        status: p.status === 'sent' ? 'shared' : p.status,
        sharedAt: p.sent_at,
        createdAt: p.created_at,
      })) || [];

      console.log('✅ Care plans loaded:', plans.length);
      return { plans };
    }

    const plans: Plan[] = data?.map((p) => {
      const practitioner = p.practitioners as any;
      return {
        id: p.id,
        title: p.content?.title || 'Plan de soin',
        description: p.content?.description,
        content: p.content,
        status: p.status,
        sharedAt: p.shared_at,
        createdAt: p.created_at,
        practitioner: practitioner ? {
          id: practitioner.id,
          name: practitioner.full_name,
          email: practitioner.email,
        } : undefined,
      };
    }) || [];

    console.log('✅ Plans loaded:', plans.length);
    return { plans };
  },

  async getPlan(planId: string): Promise<Plan | null> {
    console.log('📊 Loading plan:', planId);
    const { patientId } = await requirePatientContext();

    // Try patient_plans first
    const { data, error } = await supabase
      .from('patient_plans')
      .select(`
        *,
        practitioners:practitioner_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', planId)
      .eq('patient_id', patientId)
      .single();

    if (error) {
      // Try care_plans
      const { data: carePlan, error: carePlanError } = await supabase
        .from('care_plans')
        .select('*')
        .eq('id', planId)
        .eq('patient_id', patientId)
        .single();

      if (carePlanError) {
        console.error('❌ Plan load error:', carePlanError);
        return null;
      }

      // Mark as viewed
      await supabase
        .from('care_plans')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', planId);

      return {
        id: carePlan.id,
        title: carePlan.title || 'Plan de soin',
        description: carePlan.description,
        content: carePlan.content,
        status: 'viewed',
        sharedAt: carePlan.sent_at,
        createdAt: carePlan.created_at,
      };
    }

    const practitioner = data.practitioners as any;
    console.log('✅ Plan loaded:', data.id);
    return {
      id: data.id,
      title: data.content?.title || 'Plan de soin',
      description: data.content?.description,
      content: data.content,
      status: data.status,
      sharedAt: data.shared_at,
      createdAt: data.created_at,
      practitioner: practitioner ? {
        id: practitioner.id,
        name: practitioner.full_name,
        email: practitioner.email,
      } : undefined,
    };
  },

  async markPlanViewed(planId: string) {
    console.log('📊 Marking plan as viewed:', planId);
    const { patientId } = await requirePatientContext();

    // Update patient_plans
    const { error } = await supabase
      .from('patient_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('patient_id', patientId);

    if (error) {
      // Try care_plans
      await supabase
        .from('care_plans')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', planId)
        .eq('patient_id', patientId);
    }

    console.log('✅ Plan marked as viewed');
  },
};
