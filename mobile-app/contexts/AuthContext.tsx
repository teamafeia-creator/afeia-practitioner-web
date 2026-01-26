import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api/auth';
import { secureStorage } from '../services/storage/secureStore';
import type { Patient, LoginCredentials, RegisterPayload } from '../types';

interface AuthContextType {
  // État
  user: Patient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  verifyOTP: (code: string) => Promise<{ valid: boolean; email?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = !!user;

  // Initialisation - Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const initAuth = async () => {
      console.log('✅ AuthContext: Initializing...');
      try {
        const isAuth = await secureStorage.isAuthenticated();

        if (isAuth) {
          const storedUser = await secureStorage.getUserData<Patient>();
          if (storedUser) {
            setUser(storedUser);
            console.log('✅ AuthContext: User restored from storage');
          }

          // Optionnel: rafraîchir les données depuis l'API
          try {
            const response = await authService.getProfile();
            if (response.success && response.data) {
              setUser(response.data);
              console.log('✅ AuthContext: User refreshed from API');
            }
          } catch (error) {
            console.log('⚠️ AuthContext: Could not refresh user from API');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Init error', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Vérifier le code OTP
  const verifyOTP = useCallback(async (code: string): Promise<{ valid: boolean; email?: string }> => {
    setIsLoading(true);
    try {
      console.log('✅ AuthContext: Verifying OTP');
      const response = await authService.verifyOTP(code);

      if (response.success && response.data) {
        return response.data;
      }

      return { valid: false };
    } catch (error: any) {
      console.error('❌ AuthContext: OTP verification failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inscription
  const register = useCallback(async (payload: RegisterPayload): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('✅ AuthContext: Registering user');
      const response = await authService.register(payload);

      if (response.success && response.data) {
        setUser(response.data.patient);
        console.log('✅ AuthContext: User registered successfully');
      } else {
        throw new Error(response.error || 'Erreur lors de l\'inscription');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Registration failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connexion
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('✅ AuthContext: Logging in user');
      const response = await authService.login(credentials);

      if (response.success && response.data) {
        setUser(response.data.patient);
        console.log('✅ AuthContext: User logged in successfully');
      } else {
        throw new Error(response.error || 'Identifiants incorrects');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Déconnexion
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('✅ AuthContext: Logging out user');
      await authService.logout();
      setUser(null);
      console.log('✅ AuthContext: User logged out successfully');
    } catch (error: any) {
      console.error('❌ AuthContext: Logout failed', error);
      // On déconnecte quand même localement
      setUser(null);
      await secureStorage.clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rafraîchir les données utilisateur
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      console.log('✅ AuthContext: Refreshing user data');
      const response = await authService.getProfile();

      if (response.success && response.data) {
        setUser(response.data);
        console.log('✅ AuthContext: User refreshed');
      }
    } catch (error) {
      console.error('❌ AuthContext: Refresh user failed', error);
    }
  }, [isAuthenticated]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    verifyOTP,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
