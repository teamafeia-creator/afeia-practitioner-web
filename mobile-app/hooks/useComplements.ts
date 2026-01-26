/**
 * Complements Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { complementsApi } from '@/services/api';
import type { Complement } from '@/types';

export function useComplements() {
  const [complements, setComplements] = useState<Complement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await complementsApi.getAll();
      setComplements(data);
    } catch (err) {
      setError('Erreur lors du chargement des compléments');
      console.error('Error fetching complements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplements();
  }, [fetchComplements]);

  const trackComplement = useCallback(
    async (complementId: string, taken: boolean) => {
      const today = new Date().toISOString().split('T')[0];
      try {
        await complementsApi.track({ complementId, date: today, taken });
        // Update local state
        setComplements((prev) =>
          prev.map((c) =>
            c.id === complementId ? { ...c, takenToday: taken } : c
          )
        );
      } catch (err) {
        console.error('Error tracking complement:', err);
        throw err;
      }
    },
    []
  );

  const refresh = useCallback(() => {
    fetchComplements();
  }, [fetchComplements]);

  return {
    complements,
    isLoading,
    error,
    trackComplement,
    refresh,
  };
}
