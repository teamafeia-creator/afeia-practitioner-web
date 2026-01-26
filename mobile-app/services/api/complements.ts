/**
 * Complements API Service
 */

import apiClient from './client';
import type { Complement, ComplementTracking, TrackComplementRequest } from '@/types';

export const complementsApi = {
  /**
   * Get all prescribed complements
   */
  async getAll(): Promise<Complement[]> {
    const response = await apiClient.get<{ complements: Complement[] }>('/complements');
    return response.data.complements;
  },

  /**
   * Track complement intake
   */
  async track(data: TrackComplementRequest): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/complements/track', data);
    return response.data;
  },

  /**
   * Get tracking history
   */
  async getHistory(
    startDate: string,
    endDate: string
  ): Promise<ComplementTracking[]> {
    const response = await apiClient.get<{ history: ComplementTracking[] }>(
      '/complements/history',
      {
        params: { startDate, endDate },
      }
    );
    return response.data.history;
  },

  /**
   * Get today's tracking status for all complements
   */
  async getTodayStatus(): Promise<Record<string, boolean>> {
    const response = await apiClient.get<{ status: Record<string, boolean> }>(
      '/complements/today'
    );
    return response.data.status;
  },
};
