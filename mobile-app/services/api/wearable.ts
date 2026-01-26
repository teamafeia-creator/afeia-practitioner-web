import { apiClient } from './client';
import type { APIResponse, WearableData } from '../../types';

// Service Wearable (Bague connectée) API

export const wearableService = {
  // Récupérer les données wearable
  async getData(): Promise<APIResponse<WearableData>> {
    try {
      console.log('✅ API Call: getWearableData');
      const { data } = await apiClient.get('/wearable/data');
      return data;
    } catch (error: any) {
      console.error('❌ getWearableData Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Vérifier si une bague est connectée
  async isConnected(): Promise<APIResponse<{ connected: boolean; deviceName?: string }>> {
    try {
      console.log('✅ API Call: isWearableConnected');
      const { data } = await apiClient.get('/wearable/status');
      return data;
    } catch (error: any) {
      console.error('❌ isWearableConnected Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Connecter une bague
  async connect(deviceId: string): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: connectWearable', { deviceId });
      const { data } = await apiClient.post('/wearable/connect', { deviceId });
      return data;
    } catch (error: any) {
      console.error('❌ connectWearable Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Déconnecter la bague
  async disconnect(): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: disconnectWearable');
      const { data } = await apiClient.post('/wearable/disconnect');
      return data;
    } catch (error: any) {
      console.error('❌ disconnectWearable Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Synchroniser les données
  async sync(): Promise<APIResponse<WearableData>> {
    try {
      console.log('✅ API Call: syncWearable');
      const { data } = await apiClient.post('/wearable/sync');
      return data;
    } catch (error: any) {
      console.error('❌ syncWearable Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer l'historique des données
  async getHistory(period: 'day' | 'week' | 'month' = 'week'): Promise<APIResponse<WearableData[]>> {
    try {
      console.log('✅ API Call: getWearableHistory', { period });
      const { data } = await apiClient.get(`/wearable/history?period=${period}`);
      return data;
    } catch (error: any) {
      console.error('❌ getWearableHistory Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default wearableService;
