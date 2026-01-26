/**
 * Wearable (Circular Ring) API Service
 */

import apiClient from './client';
import type { WearableData } from '@/types';

export const wearableApi = {
  /**
   * Connect Circular ring
   */
  async connect(circularAuthCode: string): Promise<{ connected: boolean }> {
    const response = await apiClient.post<{ connected: boolean }>('/wearable/connect', {
      circularAuthCode,
    });
    return response.data;
  },

  /**
   * Disconnect wearable
   */
  async disconnect(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/wearable/disconnect');
    return response.data;
  },

  /**
   * Get wearable data for a specific date
   */
  async getData(date: string): Promise<WearableData | null> {
    const response = await apiClient.get<{ data: WearableData | null }>('/wearable/data', {
      params: { date },
    });
    return response.data.data;
  },

  /**
   * Get wearable data history
   */
  async getHistory(startDate: string, endDate: string): Promise<WearableData[]> {
    const response = await apiClient.get<{ data: WearableData[] }>('/wearable/history', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  /**
   * Sync wearable data
   */
  async sync(): Promise<{ synced: boolean; lastSyncDate: string }> {
    const response = await apiClient.post<{ synced: boolean; lastSyncDate: string }>(
      '/wearable/sync'
    );
    return response.data;
  },

  /**
   * Get connection status
   */
  async getStatus(): Promise<{
    connected: boolean;
    lastSyncDate: string | null;
    deviceName: string | null;
  }> {
    const response = await apiClient.get<{
      connected: boolean;
      lastSyncDate: string | null;
      deviceName: string | null;
    }>('/wearable/status');
    return response.data;
  },
};
