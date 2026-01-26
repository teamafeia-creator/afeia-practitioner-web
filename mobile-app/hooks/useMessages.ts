/**
 * Messages Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { messagesApi } from '@/services/api';
import type { Message, SendMessageRequest } from '@/types';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await messagesApi.getAll(pageNum, 50);

      if (append) {
        setMessages((prev) => [...prev, ...response.data]);
      } else {
        setMessages(response.data);
      }

      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError('Erreur lors du chargement des messages');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (data: SendMessageRequest) => {
    try {
      setIsSending(true);
      const newMessage = await messagesApi.send(data);
      setMessages((prev) => [newMessage, ...prev]);
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchMessages(page + 1, true);
    }
  }, [isLoading, hasMore, page, fetchMessages]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messagesApi.markAsRead(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, read: true, readAt: new Date().toISOString() } : m
        )
      );
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchMessages(1, false);
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    refresh,
  };
}
