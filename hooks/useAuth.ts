'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = '/login', redirectIfFound = false } = options;
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  const checkSession = useCallback(async () => {
    try {
      console.log('[auth] Verification de la session...');

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[auth] Erreur lors de la recuperation de session:', error.message);
        setState(prev => ({ ...prev, error, loading: false }));
        return;
      }

      if (session) {
        console.log('[auth] Session active pour:', session.user.email);
        console.log('[auth] Token expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        setState({
          user: session.user,
          session,
          loading: false,
          error: null
        });
      } else {
        console.log('[auth] Pas de session active');
        setState({
          user: null,
          session: null,
          loading: false,
          error: null
        });
      }
    } catch (err) {
      console.error('[auth] Exception lors de la verification de session:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Unknown error'),
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    // Initial session check
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[auth] Auth state changed:', event);

        if (session) {
          console.log('[auth] Nouvelle session pour:', session.user.email);
          setState({
            user: session.user,
            session,
            loading: false,
            error: null
          });
        } else {
          console.log('[auth] Session terminee');
          setState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('[auth] Token rafraichi automatiquement');
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('[auth] Utilisateur deconnecte');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  // Handle redirects based on auth state
  useEffect(() => {
    if (state.loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (!state.session && !isAuthPage && !redirectIfFound) {
      // Not logged in, redirect to login
      console.log('[auth] Non authentifie, redirection vers:', redirectTo);
      router.replace(`${redirectTo}?from=${encodeURIComponent(pathname)}`);
    } else if (state.session && isAuthPage && redirectIfFound) {
      // Already logged in, redirect away from auth pages
      console.log('[auth] Deja connecte, redirection vers /dashboard');
      router.replace('/dashboard');
    }
  }, [state.loading, state.session, pathname, redirectTo, redirectIfFound, router]);

  const signOut = useCallback(async () => {
    console.log('[auth] Deconnexion en cours...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[auth] Erreur lors de la deconnexion:', error.message);
        throw error;
      }
      console.log('[auth] Deconnexion reussie');
      router.replace('/login');
    } catch (err) {
      console.error('[auth] Exception lors de la deconnexion:', err);
      throw err;
    }
  }, [router]);

  const refreshSession = useCallback(async () => {
    console.log('[auth] Rafraichissement manuel de la session...');
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[auth] Erreur lors du rafraichissement:', error.message);
        throw error;
      }
      if (session) {
        console.log('[auth] Session rafraichie');
        setState({
          user: session.user,
          session,
          loading: false,
          error: null
        });
      }
      return session;
    } catch (err) {
      console.error('[auth] Exception lors du rafraichissement:', err);
      throw err;
    }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.session,
    signOut,
    refreshSession,
    checkSession
  };
}

// Export a simpler hook for components that just need to check auth status
export function useRequireAuth(redirectTo = '/login') {
  return useAuth({ redirectTo, redirectIfFound: false });
}
