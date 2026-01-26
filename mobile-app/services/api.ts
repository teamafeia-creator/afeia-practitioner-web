import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://afeia-practitioner-web-ijov.vercel.app/api/mobile';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  async verifyOTP(code: string) {
    const { data } = await apiClient.post('/auth/verify-otp', { code });
    return data;
  },

  async register(patientId: string, email: string, password: string, tempToken: string) {
    const { data } = await apiClient.post('/auth/register', {
      patientId,
      email,
      password,
      tempToken,
    });
    // Sauvegarder le token
    if (data.accessToken) {
      await SecureStore.setItemAsync('access_token', data.accessToken);
    }
    return data;
  },

  async login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    if (data.accessToken) {
      await SecureStore.setItemAsync('access_token', data.accessToken);
    }
    return data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('access_token');
  },

  // Patient
  async getProfile() {
    const { data } = await apiClient.get('/patient/profile');
    return data;
  },

  async updateProfile(profileData: any) {
    const { data } = await apiClient.put('/patient/profile', profileData);
    return data;
  },

  async getNaturopatheInfo() {
    const { data } = await apiClient.get('/patient/naturopathe-info');
    return data;
  },

  // Anamnèse
  async submitAnamnese(anamneseData: any) {
    const { data } = await apiClient.post('/anamnese', { data: anamneseData });
    return data;
  },

  async getAnamnese() {
    const { data } = await apiClient.get('/anamnese');
    return data;
  },

  // Compléments
  async getComplements() {
    const { data } = await apiClient.get('/complements');
    return data;
  },

  async trackComplement(complementId: string, taken: boolean) {
    const { data } = await apiClient.post('/complements/track', {
      complementId,
      date: new Date().toISOString(),
      taken,
    });
    return data;
  },

  // Conseils
  async getConseils(category?: string) {
    const { data } = await apiClient.get('/conseils', {
      params: category ? { category } : {},
    });
    return data;
  },

  async markConseilRead(conseilId: string) {
    const { data } = await apiClient.post('/conseils/mark-read', { conseilId });
    return data;
  },

  // Journal
  async submitJournal(entry: any) {
    const { data } = await apiClient.post('/journal', entry);
    return data;
  },

  async getJournalHistory(startDate?: string, endDate?: string) {
    const { data } = await apiClient.get('/journal/history', {
      params: { startDate, endDate },
    });
    return data;
  },

  async getTodayJournal() {
    const { data } = await apiClient.get('/journal/today');
    return data;
  },

  // Messages
  async getMessages() {
    const { data } = await apiClient.get('/messages');
    return data;
  },

  async sendMessage(content: string) {
    const { data } = await apiClient.post('/messages', { content });
    return data;
  },

  async markMessageRead(messageId: string) {
    const { data } = await apiClient.post('/messages/mark-read', { messageId });
    return data;
  },

  // Articles
  async getArticles(category?: string) {
    const { data } = await apiClient.get('/articles', {
      params: category ? { category } : {},
    });
    return data;
  },

  async getArticle(articleId: string) {
    const { data } = await apiClient.get(`/articles/${articleId}`);
    return data;
  },

  // Wearables
  async syncWearableData(wearableData: any) {
    const { data } = await apiClient.post('/wearables/sync', wearableData);
    return data;
  },

  async getWearableData() {
    const { data } = await apiClient.get('/wearables');
    return data;
  },
};
