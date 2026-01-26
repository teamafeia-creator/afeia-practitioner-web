import { apiClient } from './client';
import type { APIResponse, Conseil, ConseilCategory, PaginatedResponse } from '../../types';

// Service Conseils API

export const conseilsService = {
  // Récupérer tous les conseils
  async getAll(category?: ConseilCategory): Promise<APIResponse<Conseil[]>> {
    try {
      console.log('✅ API Call: getConseils', { category });
      const params = category ? `?category=${category}` : '';
      const { data } = await apiClient.get(`/conseils${params}`);
      return data;
    } catch (error: any) {
      console.error('❌ getConseils Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer un conseil par ID
  async getById(id: string): Promise<APIResponse<Conseil>> {
    try {
      console.log('✅ API Call: getConseil', { id });
      const { data } = await apiClient.get(`/conseils/${id}`);
      return data;
    } catch (error: any) {
      console.error('❌ getConseil Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Marquer un conseil comme lu
  async markAsRead(id: string): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: markConseilAsRead', { id });
      const { data } = await apiClient.post(`/conseils/${id}/read`);
      return data;
    } catch (error: any) {
      console.error('❌ markConseilAsRead Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les conseils non lus
  async getUnread(): Promise<APIResponse<Conseil[]>> {
    try {
      console.log('✅ API Call: getUnreadConseils');
      const { data } = await apiClient.get('/conseils/unread');
      return data;
    } catch (error: any) {
      console.error('❌ getUnreadConseils Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default conseilsService;
