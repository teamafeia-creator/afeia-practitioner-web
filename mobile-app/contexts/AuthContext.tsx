/**
 * Auth Context
 * Manages authentication state across the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, patientApi } from '@/services/api';
import { TokenStorage } from '@/services/storage/secureStore';
import type { Patient, PatientProfile, LoginRequest, RegisterRequest } from '@/types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  patient: PatientProfile | null;
  needsAnamnese: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setNeedsAnamnese: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    patient: null,
    needsAnamnese: false,
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await TokenStorage.getAccessToken();
      if (!token) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          patient: null,
          needsAnamnese: false,
        });
        return;
      }

      // Fetch profile to verify token is valid
      const profile = await patientApi.getProfile();
      setState({
        isLoading: false,
        isAuthenticated: true,
        patient: profile,
        needsAnamnese: false, // Will be set by the app based on anamnese status
      });
    } catch (error) {
      // Token invalid or expired
      await TokenStorage.clearAll();
      setState({
        isLoading: false,
        isAuthenticated: false,
        patient: null,
        needsAnamnese: false,
      });
    }
  };

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);

    // Fetch full profile after login
    const profile = await patientApi.getProfile();

    setState({
      isLoading: false,
      isAuthenticated: true,
      patient: profile,
      needsAnamnese: response.needsAnamnese,
    });
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authApi.register(data);

    // Fetch full profile after registration
    const profile = await patientApi.getProfile();

    setState({
      isLoading: false,
      isAuthenticated: true,
      patient: profile,
      needsAnamnese: true, // New users always need to complete anamnese
    });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      patient: null,
      needsAnamnese: false,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const profile = await patientApi.getProfile();
      setState((prev) => ({
        ...prev,
        patient: profile,
      }));
    } catch (error) {
      // If profile fetch fails, log out
      await logout();
    }
  }, [state.isAuthenticated, logout]);

  const setNeedsAnamnese = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      needsAnamnese: value,
    }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshProfile,
        setNeedsAnamnese,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
