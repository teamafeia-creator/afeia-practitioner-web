import { apiClient } from './client';
import type { APIResponse, AnamneseData, AnamneseProgress } from '../../types';

// Service Anamnèse API

export const anamneseService = {
  // Récupérer la progression de l'anamnèse
  async getProgress(): Promise<APIResponse<AnamneseProgress>> {
    try {
      console.log('✅ API Call: getAnamneseProgress');
      const { data } = await apiClient.get('/anamnese/progress');
      return data;
    } catch (error: any) {
      console.error('❌ getAnamneseProgress Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sauvegarder une section
  async saveSection(
    sectionNumber: number,
    sectionData: Record<string, any>
  ): Promise<APIResponse<AnamneseProgress>> {
    try {
      console.log('✅ API Call: saveAnamneseSection', { section: sectionNumber });
      const { data } = await apiClient.post('/anamnese/section', {
        section: sectionNumber,
        data: sectionData,
      });
      return data;
    } catch (error: any) {
      console.error('❌ saveAnamneseSection Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Soumettre l'anamnèse complète
  async submit(anamneseData: AnamneseData): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: submitAnamnese');
      const { data } = await apiClient.post('/anamnese/submit', anamneseData);
      return data;
    } catch (error: any) {
      console.error('❌ submitAnamnese Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer l'anamnèse existante (pour consultation)
  async getAnamnese(): Promise<APIResponse<AnamneseData>> {
    try {
      console.log('✅ API Call: getAnamnese');
      const { data } = await apiClient.get('/anamnese');
      return data;
    } catch (error: any) {
      console.error('❌ getAnamnese Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default anamneseService;
