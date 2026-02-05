'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
      const response = await fetch('/api/admin/practitioners', { credentials: 'include' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération des praticiens');
      }

      const json = await response.json();
      return json.practitioners as AdminPractitioner[];
    }
  });
}

/**
 * Hook pour supprimer un praticien (admin)
 */
export function useDeletePractitioner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (practitionerId: string) => {
      const response = await fetch(`/api/admin/practitioners/${practitionerId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'practitioners'] });
    }
  });
}

/**
 * Hook pour réinitialiser la base de données (admin)
 */
export function useFreshDatabase() {
  return useMutation({
    mutationFn: async (confirmationCode: string) => {
      const response = await fetch('/api/admin/fresh-database', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la réinitialisation');
      }

      return response.json();
    }
  });
}
