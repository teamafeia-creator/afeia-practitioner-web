'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AdminPractitioner = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  calendly_url?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Hook pour récupérer la liste des praticiens (admin)
 */
export function usePractitioners() {
  return useQuery({
    queryKey: ['admin', 'practitioners'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch('/api/admin/practitioners', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération des praticiens');
      }

      const json = await response.json();
      return json.practitioners as AdminPractitioner[];
    },
  });
}

/**
 * Hook pour supprimer un praticien (admin)
 */
export function useDeletePractitioner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (practitionerId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`/api/admin/practitioners/${practitionerId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'practitioners'] });
    },
  });
}

/**
 * Hook pour réinitialiser la base de données (admin)
 */
export function useFreshDatabase() {
  return useMutation({
    mutationFn: async (confirmationCode: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch('/api/admin/fresh-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la réinitialisation');
      }

      return response.json();
    },
  });
}
