'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ConsultantPlan } from '@/lib/types';

type SharePlanResponse = {
  success: boolean;
  plan: ConsultantPlan;
  message: string;
};

/**
 * Hook pour partager un plan avec un consultant
 */
export function useSharePlan(consultantId: string, planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SharePlanResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `/api/consultants/${consultantId}/plans/${planId}/share`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Erreur lors du partage du plan');
      }

      return response.json();
    },
    onSuccess: (data: SharePlanResponse) => {
      // Invalider les caches pertinents
      queryClient.invalidateQueries({ queryKey: ['consultants', consultantId, 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', planId] });
      queryClient.invalidateQueries({ queryKey: ['consultant', consultantId] });

      // Mettre à jour le cache local si possible
      queryClient.setQueryData<ConsultantPlan[]>(['consultants', consultantId, 'plans'], (oldPlans: ConsultantPlan[] | undefined) => {
        if (!oldPlans) return oldPlans;
        return oldPlans.map((plan: ConsultantPlan) =>
          plan.id === planId ? data.plan : plan
        );
      });
    },
  });
}

/**
 * Hook générique pour partager un plan (sans planId prédéfini)
 */
export function useSharePlanMutation(consultantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<SharePlanResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `/api/consultants/${consultantId}/plans/${planId}/share`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Erreur lors du partage du plan');
      }

      return response.json();
    },
    onSuccess: (_data: SharePlanResponse, planId: string) => {
      // Invalider les caches pertinents
      queryClient.invalidateQueries({ queryKey: ['consultants', consultantId, 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', planId] });
      queryClient.invalidateQueries({ queryKey: ['consultant', consultantId] });
    },
  });
}
