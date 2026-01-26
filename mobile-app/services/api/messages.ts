import { apiClient } from './client';
import type { APIResponse, Message, Conversation, PaginatedResponse } from '../../types';

// Service Messages API

export const messagesService = {
  // Récupérer la conversation avec le naturopathe
  async getConversation(): Promise<APIResponse<Conversation>> {
    try {
      console.log('✅ API Call: getConversation');
      const { data } = await apiClient.get('/messages/conversation');
      return data;
    } catch (error: any) {
      console.error('❌ getConversation Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer tous les messages
  async getMessages(page: number = 1, pageSize: number = 50): Promise<APIResponse<PaginatedResponse<Message>>> {
    try {
      console.log('✅ API Call: getMessages', { page, pageSize });
      const { data } = await apiClient.get(`/messages?page=${page}&pageSize=${pageSize}`);
      return data;
    } catch (error: any) {
      console.error('❌ getMessages Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Envoyer un message
  async sendMessage(content: string): Promise<APIResponse<Message>> {
    try {
      console.log('✅ API Call: sendMessage', { contentLength: content.length });
      const { data } = await apiClient.post('/messages', { content });
      return data;
    } catch (error: any) {
      console.error('❌ sendMessage Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Marquer les messages comme lus
  async markAsRead(messageIds: string[]): Promise<APIResponse<{ success: boolean }>> {
    try {
      console.log('✅ API Call: markMessagesAsRead', { count: messageIds.length });
      const { data } = await apiClient.post('/messages/read', { messageIds });
      return data;
    } catch (error: any) {
      console.error('❌ markMessagesAsRead Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer le nombre de messages non lus
  async getUnreadCount(): Promise<APIResponse<{ count: number }>> {
    try {
      console.log('✅ API Call: getUnreadCount');
      const { data } = await apiClient.get('/messages/unread/count');
      return data;
    } catch (error: any) {
      console.error('❌ getUnreadCount Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default messagesService;
