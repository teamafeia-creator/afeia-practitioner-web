import { useState, useEffect, useCallback } from 'react';
import { patientService } from '../services/api/patient';
import { complementsService } from '../services/api/complements';
import { journalService } from '../services/api/journal';
import { messagesService } from '../services/api/messages';
import type {
  Patient,
  Naturopathe,
  Complement,
  JournalEntry,
  Conversation,
} from '../types';

interface UsePatientReturn {
  // État
  patient: Patient | null;
  naturopathe: Naturopathe | null;
  complements: Complement[];
  todayJournal: JournalEntry | null;
  conversation: Conversation | null;
  unreadMessages: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  refreshComplements: () => Promise<void>;
  refreshJournal: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export const usePatient = (): UsePatientReturn => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [naturopathe, setNaturopathe] = useState<Naturopathe | null>(null);
  const [complements, setComplements] = useState<Complement[]>([]);
  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données du dashboard
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('✅ usePatient: Loading dashboard data');
      const response = await patientService.getDashboard();

      if (response.success && response.data) {
        setPatient(response.data.patient);
        setNaturopathe(response.data.naturopathe);
        setUnreadMessages(response.data.unreadMessages);
      }
    } catch (err: any) {
      console.error('❌ usePatient: Error loading dashboard', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les compléments
  const refreshComplements = useCallback(async () => {
    try {
      console.log('✅ usePatient: Loading complements');
      const response = await complementsService.getTodayComplements();

      if (response.success && response.data) {
        setComplements(response.data);
      }
    } catch (err: any) {
      console.error('❌ usePatient: Error loading complements', err);
    }
  }, []);

  // Charger le journal du jour
  const refreshJournal = useCallback(async () => {
    try {
      console.log('✅ usePatient: Loading today journal');
      const response = await journalService.getTodayEntry();

      if (response.success) {
        setTodayJournal(response.data || null);
      }
    } catch (err: any) {
      console.error('❌ usePatient: Error loading journal', err);
    }
  }, []);

  // Charger les messages
  const refreshMessages = useCallback(async () => {
    try {
      console.log('✅ usePatient: Loading messages');
      const [convResponse, countResponse] = await Promise.all([
        messagesService.getConversation(),
        messagesService.getUnreadCount(),
      ]);

      if (convResponse.success && convResponse.data) {
        setConversation(convResponse.data);
      }

      if (countResponse.success && countResponse.data) {
        setUnreadMessages(countResponse.data.count);
      }
    } catch (err: any) {
      console.error('❌ usePatient: Error loading messages', err);
    }
  }, []);

  // Rafraîchir toutes les données
  const refresh = useCallback(async () => {
    await Promise.all([
      loadDashboardData(),
      refreshComplements(),
      refreshJournal(),
      refreshMessages(),
    ]);
  }, [loadDashboardData, refreshComplements, refreshJournal, refreshMessages]);

  // Charger les données au montage
  useEffect(() => {
    refresh();
  }, []);

  return {
    patient,
    naturopathe,
    complements,
    todayJournal,
    conversation,
    unreadMessages,
    isLoading,
    error,
    refresh,
    refreshComplements,
    refreshJournal,
    refreshMessages,
  };
};

export default usePatient;
