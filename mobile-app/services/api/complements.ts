import { apiClient } from './client';
import type { APIResponse, Complement, ComplementTracking, PaginatedResponse } from '../../types';

// Service Compléments API

export const complementsService = {
  // Récupérer tous les compléments du patient
  async getAll(): Promise<APIResponse<Complement[]>> {
    try {
      console.log('✅ API Call: getComplements');
      const { data } = await apiClient.get('/complements');
      return data;
    } catch (error: any) {
      console.error('❌ getComplements Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer un complément par ID
  async getById(id: string): Promise<APIResponse<Complement>> {
    try {
      console.log('✅ API Call: getComplement', { id });
      const { data } = await apiClient.get(`/complements/${id}`);
      return data;
    } catch (error: any) {
      console.error('❌ getComplement Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Marquer un complément comme pris
  async track(complementId: string, taken: boolean, notes?: string): Promise<APIResponse<ComplementTracking>> {
    try {
      console.log('✅ API Call: trackComplement', { complementId, taken });
      const { data } = await apiClient.post('/complements/track', {
        complementId,
        taken,
        notes,
        date: new Date().toISOString().split('T')[0],
      });
      return data;
    } catch (error: any) {
      console.error('❌ trackComplement Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer l'historique de prise
  async getHistory(complementId?: string, startDate?: string, endDate?: string): Promise<APIResponse<ComplementTracking[]>> {
    try {
      console.log('✅ API Call: getComplementHistory');
      const params = new URLSearchParams();
      if (complementId) params.append('complementId', complementId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { data } = await apiClient.get(`/complements/history?${params.toString()}`);
      return data;
    } catch (error: any) {
      console.error('❌ getComplementHistory Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les compléments du jour
  async getTodayComplements(): Promise<APIResponse<Complement[]>> {
    try {
      console.log('✅ API Call: getTodayComplements');
      const { data } = await apiClient.get('/complements/today');
      return data;
    } catch (error: any) {
      console.error('❌ getTodayComplements Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default complementsService;
