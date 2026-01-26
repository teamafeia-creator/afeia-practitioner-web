/**
 * Anamnese API Service
 */

import apiClient from './client';
import type { Anamnese, AnamneseData } from '@/types';

export const anamneseApi = {
  /**
   * Submit anamnese questionnaire
   */
  async submit(data: AnamneseData): Promise<{ anamneseId: string; completedAt: string }> {
    const response = await apiClient.post<{ anamneseId: string; completedAt: string }>(
      '/anamnese',
      { sections: data }
    );
    return response.data;
  },

  /**
   * Get existing anamnese (if already filled)
   */
  async get(): Promise<{ anamnese: Anamnese | null; completed: boolean }> {
    const response = await apiClient.get<{ anamnese: Anamnese | null; completed: boolean }>(
      '/anamnese'
    );
    return response.data;
  },

  /**
   * Save anamnese draft (partial)
   */
  async saveDraft(data: Partial<AnamneseData>): Promise<void> {
    await apiClient.post('/anamnese/draft', { sections: data });
  },

  /**
   * Get anamnese draft
   */
  async getDraft(): Promise<Partial<AnamneseData> | null> {
    const response = await apiClient.get<{ draft: Partial<AnamneseData> | null }>(
      '/anamnese/draft'
    );
    return response.data.draft;
  },
};
