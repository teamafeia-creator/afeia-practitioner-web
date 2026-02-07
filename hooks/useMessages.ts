'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Message = {
  id: string;
  consultant_id: string;
  sender: 'consultant' | 'praticien';
  text: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
};

/**
 * Hook pour récupérer les messages d'un consultant
 */
export function useMessages(consultantId: string) {
  return useQuery({
    queryKey: ['messages', consultantId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/consultants/${consultantId}/messages`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la récupération des messages');
      }

      const json = await response.json();
      return json.messages as Message[];
    },
    enabled: !!consultantId,
  });
}

/**
 * Hook pour envoyer un message
 */
export function useSendMessage(consultantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/consultants/${consultantId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'envoi du message");
      }

      return response.json() as Promise<Message>;
    },
    onSuccess: (newMessage: Message) => {
      // Optimistically update the cache
      queryClient.setQueryData<Message[]>(['messages', consultantId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return [newMessage];
        return [...oldMessages, newMessage];
      });
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['messages', consultantId] });
    },
  });
}

/**
 * Hook pour marquer les messages comme lus
 */
export function useMarkMessagesRead(consultantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/consultants/${consultantId}/messages/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du marquage des messages');
      }

      return response.json();
    },
    onSuccess: () => {
      // Update cache to mark messages as read
      queryClient.setQueryData<Message[]>(['messages', consultantId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return oldMessages;
        const now = new Date().toISOString();
        return oldMessages.map((msg: Message) =>
          msg.sender === 'consultant' && !msg.read_at
            ? { ...msg, read_at: now }
            : msg
        );
      });
    },
  });
}

/**
 * Hook combiné pour une gestion simplifiée des messages
 */
export function useConsultantMessages(consultantId: string) {
  const messagesQuery = useMessages(consultantId);
  const sendMessageMutation = useSendMessage(consultantId);
  const markReadMutation = useMarkMessagesRead(consultantId);

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    refetch: messagesQuery.refetch,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    markAsRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
  };
}
