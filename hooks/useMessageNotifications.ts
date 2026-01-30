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

      // Recuperer les IDs des patients de ce praticien
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .eq('practitioner_id', user.id);

      if (patientsError) {
        console.error('Erreur recuperation patients:', patientsError);
        setState(prev => ({ ...prev, error: patientsError, loading: false }));
        return;
      }

      if (!patients || patients.length === 0) {
        setState({ unreadCount: 0, loading: false, error: null });
        return;
      }

      const patientIds = patients.map(p => p.id);

      // Compter les messages non lus envoyes par les patients
      const { count, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('patient_id', patientIds)
        .eq('sender_role', 'patient')
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
