import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { JournalForm } from '../../components/features/JournalForm';
import { JournalEntry } from '../../types';
import { todayISO } from '../../utils/dates';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

export default function JournalScreen() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);

  const [formData, setFormData] = useState({
    mood: '',
    sleepQuality: '',
    energyLevel: '',
    alimentationQuality: '',
  });
  const [notes, setNotes] = useState('');

  const fetchToday = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<{ entry: JournalEntry | null }>(
        '/api/mobile/journal/today',
      );
      if (data.entry) {
        setExistingEntry(data.entry);
        setFormData({
          mood: data.entry.mood || '',
          sleepQuality: data.entry.sleepQuality || '',
          energyLevel: data.entry.energyLevel || '',
          alimentationQuality: data.entry.alimentationQuality || '',
        });
        setNotes(data.entry.problemesParticuliers || '');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      setError(message || 'Impossible de charger le journal');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const canSubmit =
    formData.mood &&
    formData.sleepQuality &&
    formData.energyLevel &&
    formData.alimentationQuality;

  async function handleSave() {
    if (!canSubmit) return;

    setSaving(true);
    try {
      await api.post('/api/mobile/journal', {
        date: todayISO(),
        mood: formData.mood,
        sleepQuality: formData.sleepQuality,
        energyLevel: formData.energyLevel,
        alimentationQuality: formData.alimentationQuality,
        problemesParticuliers: notes || undefined,
      });

      Alert.alert('Succès', 'Votre journal a été enregistré');
      fetchToday();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      Alert.alert('Erreur', message || "Impossible d'enregistrer le journal");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchToday} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal du jour</Text>
        {existingEntry && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Complété</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchToday();
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="lg">
          <JournalForm data={formData} onChange={setFormData} />
        </Card>

        <Card variant="elevated" padding="lg">
          <Text style={styles.notesLabel}>Notes particulières</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Symptômes, remarques, questions pour votre naturopathe..."
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        <Button
          title={existingEntry ? 'Mettre à jour' : 'Enregistrer'}
          onPress={handleSave}
          loading={saving}
          disabled={!canSubmit}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
});
