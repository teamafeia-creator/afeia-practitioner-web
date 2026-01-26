/**
 * Journal API Service
 */

import apiClient from './client';
import type { JournalEntry, CreateJournalEntryRequest } from '@/types';

export const journalApi = {
  /**
   * Create or update journal entry for a specific date
   */
  async create(data: CreateJournalEntryRequest): Promise<{ journalId: string }> {
    const response = await apiClient.post<{ journalId: string }>('/journal', data);
    return response.data;
  },

  /**
   * Get today's journal entry
   */
  async getToday(): Promise<JournalEntry | null> {
    const response = await apiClient.get<{ entry: JournalEntry | null }>('/journal/today');
    return response.data.entry;
  },

  /**
   * Get journal history
   */
  async getHistory(startDate: string, endDate: string): Promise<JournalEntry[]> {
    const response = await apiClient.get<{ entries: JournalEntry[] }>('/journal/history', {
      params: { startDate, endDate },
    });
    return response.data.entries;
  },

  /**
   * Get journal statistics (for graphs)
   */
  async getStatistics(
    startDate: string,
    endDate: string
  ): Promise<{
    averageMood: number;
    averageSleep: number;
    averageEnergy: number;
    averageAlimentation: number;
    entries: JournalEntry[];
  }> {
    const response = await apiClient.get<{
      averageMood: number;
      averageSleep: number;
      averageEnergy: number;
      averageAlimentation: number;
      entries: JournalEntry[];
    }>('/journal/statistics', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
