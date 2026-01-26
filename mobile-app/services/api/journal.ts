import { apiClient } from './client';
import type { APIResponse, JournalEntry, JournalStats, PaginatedResponse } from '../../types';

// Service Journal API

export interface JournalEntryInput {
  mood: number;
  alimentation: number;
  sommeil: number;
  energie: number;
  complementsTaken: string[];
  problems?: string;
  noteNaturopathe?: string;
}

export const journalService = {
  // Créer une entrée de journal
  async createEntry(entry: JournalEntryInput): Promise<APIResponse<JournalEntry>> {
    try {
      console.log('✅ API Call: createJournalEntry', entry);
      const { data } = await apiClient.post('/journal', {
        ...entry,
        date: new Date().toISOString().split('T')[0],
      });
      return data;
    } catch (error: any) {
      console.error('❌ createJournalEntry Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer l'entrée du jour
  async getTodayEntry(): Promise<APIResponse<JournalEntry | null>> {
    try {
      console.log('✅ API Call: getTodayJournalEntry');
      const today = new Date().toISOString().split('T')[0];
      const { data } = await apiClient.get(`/journal/day/${today}`);
      return data;
    } catch (error: any) {
      console.error('❌ getTodayJournalEntry Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer l'historique
  async getHistory(page: number = 1, pageSize: number = 20): Promise<APIResponse<PaginatedResponse<JournalEntry>>> {
    try {
      console.log('✅ API Call: getJournalHistory', { page, pageSize });
      const { data } = await apiClient.get(`/journal/history?page=${page}&pageSize=${pageSize}`);
      return data;
    } catch (error: any) {
      console.error('❌ getJournalHistory Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer une entrée par date
  async getByDate(date: string): Promise<APIResponse<JournalEntry | null>> {
    try {
      console.log('✅ API Call: getJournalByDate', { date });
      const { data } = await apiClient.get(`/journal/day/${date}`);
      return data;
    } catch (error: any) {
      console.error('❌ getJournalByDate Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Mettre à jour une entrée
  async updateEntry(id: string, updates: Partial<JournalEntryInput>): Promise<APIResponse<JournalEntry>> {
    try {
      console.log('✅ API Call: updateJournalEntry', { id, updates });
      const { data } = await apiClient.put(`/journal/${id}`, updates);
      return data;
    } catch (error: any) {
      console.error('❌ updateJournalEntry Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les statistiques
  async getStats(period: 'week' | 'month' | 'year' = 'month'): Promise<APIResponse<JournalStats>> {
    try {
      console.log('✅ API Call: getJournalStats', { period });
      const { data } = await apiClient.get(`/journal/stats?period=${period}`);
      return data;
    } catch (error: any) {
      console.error('❌ getJournalStats Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default journalService;
