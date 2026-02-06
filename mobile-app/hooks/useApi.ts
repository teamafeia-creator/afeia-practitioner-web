import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

export function useApi<T>(path: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
    refreshing: false,
  });
  const { logout } = useAuth();

  const fetch = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setState((prev) => ({ ...prev, refreshing: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      const data = await api.get<T>(path);
      setState({ data, loading: false, error: null, refreshing: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: message,
      }));
    }
  }, [path, logout]);

  const refresh = useCallback(() => fetch(true), [fetch]);

  return { ...state, fetch, refresh };
}
