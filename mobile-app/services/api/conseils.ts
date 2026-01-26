/**
 * Conseils API Service
 */

import apiClient from './client';
import type { Conseil, ConseilCategory } from '@/types';

export const conseilsApi = {
  /**
   * Get all conseils, optionally filtered by category
   */
  async getAll(category?: ConseilCategory): Promise<Conseil[]> {
    const response = await apiClient.get<{ conseils: Conseil[] }>('/conseils', {
      params: category ? { category } : undefined,
    });
    return response.data.conseils;
  },

  /**
   * Mark a conseil as read
   */
  async markAsRead(conseilId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/conseils/mark-read', {
      conseilId,
    });
    return response.data;
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/conseils/unread-count');
    return response.data.count;
  },
};
