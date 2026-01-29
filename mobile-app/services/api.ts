import { supabase } from '../lib/supabase';
import {
  Complement,
  Conseil,
  Message,
  JournalEntry,
  Article,
  WearableData,
  AnamneseData,
} from '../types';

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// Helper to get patient ID from current user
const getPatientId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.log('❌ No authenticated user');
    return null;
  }

  // Get patient record for this user
  const { data: patient, error } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.log('📊 Patient lookup error (may be normal for new users):', error.message);
    return userId; // Fall back to user ID
  }

  return patient?.id ?? userId;
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
    console.log('📊 Loading profile...');
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*, practitioners(full_name, email, phone)')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('❌ Profile load error:', error);
      throw error;
    }

    console.log('✅ Profile loaded:', data?.email);
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
    };
  },

  async updateProfile(profileData: { firstName?: string; lastName?: string; phone?: string }) {
    console.log('📊 Updating profile...');
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        updated_at: new Date().toISOString(),
      })
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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

    // Get patient's practitioner
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError) {
      console.error('❌ Patient lookup error:', patientError);
      throw patientError;
    }

    if (!patient?.practitioner_id) {
      return null;
    }

    const { data: practitioner, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('id', patient.practitioner_id)
      .single();

    if (error) {
      console.error('❌ Naturopathe load error:', error);
      throw error;
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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${patientId},receiver_id.eq.${patientId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Messages load error:', error);
      throw error;
    }

    const messages: Message[] =
      data?.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        timestamp: m.created_at,
        read: m.read || false,
      })) || [];

    console.log('✅ Messages loaded:', messages.length);
    return { messages };
  },

  async sendMessage(content: string) {
    console.log('📊 Sending message...');
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

    // Get patient's practitioner
    const { data: patient } = await supabase
      .from('patients')
      .select('practitioner_id')
      .eq('id', patientId)
      .single();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: patientId,
        receiver_id: patient?.practitioner_id,
        content,
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
      .single();

    if (error) {
      console.error('❌ Article load error:', error);
      throw error;
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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
    const patientId = await getPatientId();

    if (!patientId) {
      throw new Error('User not authenticated');
    }

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
};
