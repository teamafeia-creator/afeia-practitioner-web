/**
 * Journal Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { journalApi } from '@/services/api';
import { DraftStorage } from '@/services/storage/secureStore';
import type { JournalEntry, CreateJournalEntryRequest } from '@/types';

export function useJournal() {
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const entry = await journalApi.getToday();
      setTodayEntry(entry);
    } catch (err) {
      setError('Erreur lors du chargement du journal');
      console.error('Error fetching today journal:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (startDate: string, endDate: string) => {
    try {
      setError(null);
      const entries = await journalApi.getHistory(startDate, endDate);
      setHistory(entries);
      return entries;
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
      console.error('Error fetching journal history:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const saveEntry = useCallback(async (data: CreateJournalEntryRequest) => {
    try {
      setIsSaving(true);
      setError(null);
      const result = await journalApi.create(data);

      // Clear draft after successful save
      await DraftStorage.clearJournalDraft();

      // Refresh today's entry
      await fetchToday();

      return result;
    } catch (err) {
      console.error('Error saving journal entry:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [fetchToday]);

  const saveDraft = useCallback(async (data: Partial<CreateJournalEntryRequest>) => {
    try {
      await DraftStorage.setJournalDraft(JSON.stringify(data));
    } catch (err) {
      console.error('Error saving journal draft:', err);
    }
  }, []);

  const loadDraft = useCallback(async (): Promise<Partial<CreateJournalEntryRequest> | null> => {
    try {
      const draft = await DraftStorage.getJournalDraft();
      if (draft) {
        return JSON.parse(draft);
      }
      return null;
    } catch (err) {
      console.error('Error loading journal draft:', err);
      return null;
    }
  }, []);

  const getStatistics = useCallback(async (startDate: string, endDate: string) => {
    try {
      return await journalApi.getStatistics(startDate, endDate);
    } catch (err) {
      console.error('Error fetching journal statistics:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchToday();
  }, [fetchToday]);

  return {
    todayEntry,
    history,
    isLoading,
    isSaving,
    error,
    saveEntry,
    saveDraft,
    loadDraft,
    fetchHistory,
    getStatistics,
    refresh,
  };
}
