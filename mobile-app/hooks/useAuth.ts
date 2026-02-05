import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check existing session on mount
    const checkSession = async () => {
      try {
        console.log('🔍 Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session check error:', error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message,
          }));
          return;
        }

        if (session) {
          console.log('✅ Session found:', session.user.email);
          setState({
            user: session.user,
            session,
            loading: false,
            error: null,
          });
        } else {
          console.log('⚠️ No active session');
          setState({
            user: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('❌ Session check exception:', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Erreur de connexion',
        }));
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);

        setState({
          user: session?.user ?? null,
          session: session,
          loading: false,
          error: null,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('📧 Signing in:', email);
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      console.log('✅ Sign in successful:', data.user?.email);
      return { success: true, user: data.user };
    } catch (err) {
      console.error('❌ Sign in exception:', err);
      const errorMsg = 'Erreur de connexion';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      try {
        console.log('📝 Signing up:', email);
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        });

        if (error) {
          console.error('❌ Sign up error:', error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message,
          }));
          return { success: false, error: error.message };
        }

        console.log('✅ Sign up successful:', data.user?.email);
        return { success: true, user: data.user };
      } catch (err) {
        console.error('❌ Sign up exception:', err);
        const errorMsg = 'Erreur lors de l\'inscription';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error (clearing session anyway):', error);
      } else {
        console.log('✅ Sign out successful');
      }

      // Always clear local state regardless of API result
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
      return error ? { success: false, error: error.message } : { success: true };
    } catch (err) {
      console.error('❌ Sign out exception (clearing session anyway):', err);
      // Always clear local state so the user is never stuck
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
      return { success: false, error: 'Erreur de déconnexion' };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      console.log('🔄 Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ Refresh error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Session refreshed');
      return { success: true, session: data.session };
    } catch (err) {
      console.error('❌ Refresh exception:', err);
      return { success: false, error: 'Erreur de rafraîchissement' };
    }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.session,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
};
