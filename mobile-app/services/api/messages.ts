/**
 * Messages API Service
 */

import apiClient from './client';
import type { Message, SendMessageRequest, PaginatedResponse } from '@/types';

export const messagesApi = {
  /**
   * Get all messages
   */
  async getAll(page = 1, limit = 50): Promise<PaginatedResponse<Message>> {
    const response = await apiClient.get<PaginatedResponse<Message>>('/messages', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Send a message
   */
  async send(data: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<{ message: Message }>('/messages', data);
    return response.data.message;
  },

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(`/messages/${messageId}/read`);
    return response.data;
  },

  /**
   * Mark all messages as read
   */
  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>('/messages/read-all');
    return response.data;
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/messages/unread-count');
    return response.data.count;
  },
};
