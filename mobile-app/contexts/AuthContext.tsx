import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { AuthState, AuthTokens, ConsultantProfile } from '../types';
import { getTokens, setTokens, clearTokens, setStoredConsultant } from '../utils/storage';
import { api } from '../services/api';

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'AUTHENTICATED'; consultant: ConsultantProfile; tokens: AuthTokens }
  | { type: 'UNAUTHENTICATED' };

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  consultant: null,
  tokens: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true };
    case 'AUTHENTICATED':
      return {
        isAuthenticated: true,
        isLoading: false,
        consultant: action.consultant,
        tokens: action.tokens,
      };
    case 'UNAUTHENTICATED':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    consultantId: string;
    email: string;
    password: string;
    tempToken: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    dispatch({ type: 'LOADING' });
    try {
      const tokens = await getTokens();
      if (!tokens?.accessToken) {
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      const data = await api.get<{ consultant: ConsultantProfile }>('/api/mobile/consultant/profile');
      if (data.consultant) {
        await setStoredConsultant(data.consultant as unknown as Record<string, unknown>);
        dispatch({ type: 'AUTHENTICATED', consultant: data.consultant, tokens });
      } else {
        await clearTokens();
        dispatch({ type: 'UNAUTHENTICATED' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'TOKEN_REFRESHED') {
        try {
          const newTokens = await getTokens();
          const data = await api.get<{ consultant: ConsultantProfile }>('/api/mobile/consultant/profile');
          if (data.consultant && newTokens) {
            dispatch({ type: 'AUTHENTICATED', consultant: data.consultant, tokens: newTokens });
            return;
          }
        } catch {
          // Fall through to unauthenticated
        }
      }
      await clearTokens();
      dispatch({ type: 'UNAUTHENTICATED' });
    }
  }

  async function handleLogin(email: string, password: string) {
    try {
      const data = await api.post<{
        accessToken: string;
        refreshToken: string;
        consultant: ConsultantProfile;
      }>('/api/mobile/auth/login', { email, password }, false);

      const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      await setTokens(tokens);
      await setStoredConsultant(data.consultant as unknown as Record<string, unknown>);
      dispatch({ type: 'AUTHENTICATED', consultant: data.consultant, tokens });
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur de connexion';
      return { success: false, error: message };
    }
  }

  async function handleRegister(params: {
    consultantId: string;
    email: string;
    password: string;
    tempToken: string;
  }) {
    try {
      const data = await api.post<{
        accessToken: string;
        refreshToken: string;
        consultant: ConsultantProfile;
      }>('/api/mobile/auth/register', params as unknown as Record<string, unknown>, false);

      const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      await setTokens(tokens);
      await setStoredConsultant(data.consultant as unknown as Record<string, unknown>);
      dispatch({ type: 'AUTHENTICATED', consultant: data.consultant, tokens });
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'inscription";
      return { success: false, error: message };
    }
  }

  async function handleLogout() {
    try {
      await api.post('/api/mobile/auth/logout');
    } catch {
      // Ignore logout errors
    }
    await clearTokens();
    dispatch({ type: 'UNAUTHENTICATED' });
  }

  async function refreshProfile() {
    try {
      const data = await api.get<{ consultant: ConsultantProfile }>('/api/mobile/consultant/profile');
      if (data.consultant) {
        await setStoredConsultant(data.consultant as unknown as Record<string, unknown>);
        const tokens = await getTokens();
        if (tokens) {
          dispatch({ type: 'AUTHENTICATED', consultant: data.consultant, tokens });
        }
      }
    } catch {
      // Silent fail for profile refresh
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
