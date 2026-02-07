'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Hook pour supprimer un consultant (soft delete)
 */
export function useDeleteConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (consultantId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/consultants/${consultantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalider le cache des consultants
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['consultant'] });
    },
  });
}

/**
 * Hook pour mettre à jour un consultant
 */
export function useUpdateConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ consultantId, data }: { consultantId: string; data: Record<string, unknown> }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/consultants/${consultantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalider le cache du consultant spécifique
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', variables.consultantId] });
    },
  });
}
