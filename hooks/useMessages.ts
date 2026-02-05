'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Message = {
  id: string;
  patient_id: string;
  sender: 'patient' | 'praticien';
  text: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
};

/**
 * Hook pour récupérer les messages d'un patient
 */
export function useMessages(patientId: string) {
  return useQuery({
    queryKey: ['messages', patientId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/patients/${patientId}/messages`, {
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
    enabled: !!patientId,
  });
}

/**
 * Hook pour envoyer un message
 */
export function useSendMessage(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/patients/${patientId}/messages`, {
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
      queryClient.setQueryData<Message[]>(['messages', patientId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return [newMessage];
        return [...oldMessages, newMessage];
      });
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['messages', patientId] });
    },
  });
}

/**
 * Hook pour marquer les messages comme lus
 */
export function useMarkMessagesRead(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/patients/${patientId}/messages/mark-read`, {
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
      queryClient.setQueryData<Message[]>(['messages', patientId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return oldMessages;
        const now = new Date().toISOString();
        return oldMessages.map((msg: Message) =>
          msg.sender === 'patient' && !msg.read_at
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
export function usePatientMessages(patientId: string) {
  const messagesQuery = useMessages(patientId);
  const sendMessageMutation = useSendMessage(patientId);
  const markReadMutation = useMarkMessagesRead(patientId);

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
