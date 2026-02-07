'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const POLLING_INTERVAL = 30000; // 30 secondes

interface MessageNotificationsState {
  unreadCount: number;
  loading: boolean;
  error: Error | null;
}

export function useMessageNotifications() {
  const [state, setState] = useState<MessageNotificationsState>({
    unreadCount: 0,
    loading: true,
    error: null
  });

  const checkUnreadMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Recuperer les IDs des consultants de ce praticien
      const { data: consultants, error: consultantsError } = await supabase
        .from('consultants')
        .select('id')
        .eq('practitioner_id', user.id);

      if (consultantsError) {
        console.error('Erreur recuperation consultants:', consultantsError);
        setState(prev => ({ ...prev, error: consultantsError, loading: false }));
        return;
      }

      if (!consultants || consultants.length === 0) {
        setState({ unreadCount: 0, loading: false, error: null });
        return;
      }

      const consultantIds = consultants.map(p => p.id);

      // Compter les messages non lus envoyes par les consultants
      const { count, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('consultant_id', consultantIds)
        .eq('sender_role', 'consultant')
        .eq('read', false);

      if (messagesError) {
        console.error('Erreur comptage messages:', messagesError);
        setState(prev => ({ ...prev, error: messagesError, loading: false }));
        return;
      }

      setState({
        unreadCount: count || 0,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Exception checkUnreadMessages:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Erreur inconnue'),
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    // Verification initiale
    checkUnreadMessages();

    // Polling toutes les 30 secondes
    const interval = setInterval(checkUnreadMessages, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [checkUnreadMessages]);

  return {
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    refresh: checkUnreadMessages
  };
}
