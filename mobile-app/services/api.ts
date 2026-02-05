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

  // Patient Profile – uses Next.js API instead of direct Supabase (RLS bypass)
  async getProfile() {
    console.log('═══════════════════════════════════════');
    console.log('[APP] Loading profile via API...');

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.log('[APP] ❌ No session token');
      console.log('═══════════════════════════════════════');
      throw createAuthError('AUTH_REQUIRED', 'Session utilisateur absente');
    }

    console.log('[APP] 📤 Calling API with token');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const url = `${apiUrl}/api/mobile/patient/profile`;

      console.log('[APP] GET', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[APP] 📥 Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[APP] ❌ Error:', errorText);

        if (response.status === 401) {
          throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        }
        if (response.status === 404) {
          throw createAuthError('PATIENT_NOT_READY', 'Patient non trouvé');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[APP] ✅ Profile:', data.email);
      console.log('═══════════════════════════════════════');

      return {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        isPremium: data.isPremium || false,
        subscription: data.subscription || null,
        naturopathe: data.naturopathe || null,
      };

    } catch (error) {
      console.error('[APP] ❌ Exception:', error);
      console.log('═══════════════════════════════════════');
      throw error;
    }
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
    console.log('📊 Loading complements via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/mobile/complements`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Complements loaded:', data.complements?.length || 0);

      return { complements: data.complements || [] };
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Complements error:', error);
      return { complements: [] };
    }
  },

  async trackComplement(complementId: string, taken: boolean) {
    console.log('📊 Tracking complement via API:', complementId, taken);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(`${apiUrl}/api/mobile/complements/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complementId, date: today, taken }),
    });

    if (!response.ok) {
      if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Complement tracked');
    return data;
  },

  // Conseils
  async getConseils(category?: string): Promise<{ conseils: Conseil[] }> {
    console.log('📊 Loading conseils via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const url = category
        ? `${apiUrl}/api/mobile/conseils?category=${encodeURIComponent(category)}`
        : `${apiUrl}/api/mobile/conseils`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conseils loaded:', data.conseils?.length || 0);

      return { conseils: data.conseils || [] };
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Conseils error:', error);
      return { conseils: [] };
    }
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
    console.log('📊 Submitting journal entry via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(`${apiUrl}/api/mobile/journal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: today,
        mood: entry.mood,
        alimentationQuality: entry.alimentation,
        sleepQuality: entry.sleep,
        energyLevel: entry.energy,
        complementsTaken: entry.complementsTaken,
        problemesParticuliers: entry.problems,
        noteNaturopathe: entry.noteForNaturo,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Journal entry submitted');
    return data;
  },

  async getJournalHistory(
    startDate?: string,
    endDate?: string
  ): Promise<{ entries: JournalEntry[] }> {
    console.log('📊 Loading journal history via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString();
      const url = `${apiUrl}/api/mobile/journal/history${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Journal history loaded:', data.entries?.length || 0);

      return { entries: data.entries || [] };
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Journal history error:', error);
      return { entries: [] };
    }
  },

  async getTodayJournal(): Promise<JournalEntry | null> {
    console.log('📊 Loading today journal via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/mobile/journal/today`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.entry) {
        console.log('📊 No journal entry for today');
        return null;
      }

      console.log('✅ Today journal loaded');
      return data.entry;
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Today journal error:', error);
      return null;
    }
  },

  // Messages
  async getMessages(): Promise<{ messages: Message[] }> {
    console.log('📊 Loading messages via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/mobile/messages`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // API returns { data: [...], total, page, limit, hasMore }
      const messages: Message[] = (data.data || []).map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content || '',
        timestamp: m.createdAt,
        read: m.read || false,
        senderRole: m.senderType,
      }));

      console.log('✅ Messages loaded:', messages.length);
      return { messages };
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Messages error:', error);
      return { messages: [] };
    }
  },

  async sendMessage(messageContent: string) {
    console.log('📊 Sending message via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/mobile/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: messageContent }),
    });

    if (!response.ok) {
      if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Message sent');
    return data.message;
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
    console.log('📊 Loading plans via API...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw createAuthError('AUTH_REQUIRED', 'Session manquante');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/mobile/plans`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw createAuthError('AUTH_REQUIRED', 'Session invalide');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Plans loaded:', data.plans?.length || 0);

      return { plans: data.plans || [] };
    } catch (error) {
      if (isApiAuthError(error)) throw error;
      console.error('❌ Plans error:', error);
      return { plans: [] };
    }
  },

  async getPlan(planId: string): Promise<Plan | null> {
    console.log('📊 Loading plan:', planId);

    // Plans are returned in full from getPlans() API response,
    // so re-fetch from the plans endpoint for now
    const { plans } = await this.getPlans();
    const plan = plans.find((p) => p.id === planId) || null;

    if (plan) {
      // Mark as viewed via API
      await this.markPlanViewed(planId);
    }

    return plan;
  },

  async markPlanViewed(planId: string) {
    console.log('📊 Marking plan as viewed:', planId);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/mobile/plans`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        console.log('✅ Plan marked as viewed');
      }
    } catch (error) {
      console.error('❌ Mark plan viewed error:', error);
    }
  },
};
