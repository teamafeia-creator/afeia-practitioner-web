/**
 * Journal Screen
 * Daily journal for tracking well-being
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useJournal, useComplements } from '@/hooks';
import { Button, Input, Rating, Card, LoadingSpinner, SuccessState, Checkbox } from '@/components/ui';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';
import type { CreateJournalEntryRequest } from '@/types';

type TabType = 'today' | 'history';

export default function JournalScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const {
    todayEntry,
    history,
    isLoading,
    isSaving,
    saveEntry,
    saveDraft,
    loadDraft,
    fetchHistory,
    refresh,
  } = useJournal();
  const { complements } = useComplements();

  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<CreateJournalEntryRequest>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      mood: 3,
      alimentationQuality: 3,
      sleepQuality: 3,
      energyLevel: 3,
      complementsTaken: [],
      problemesParticuliers: '',
      noteNaturopathe: '',
    },
  });

  const formValues = watch();

  // Load existing entry or draft
  useEffect(() => {
    const initForm = async () => {
      if (todayEntry) {
        reset({
          date: todayEntry.date,
          mood: todayEntry.mood,
          alimentationQuality: todayEntry.alimentationQuality,
          sleepQuality: todayEntry.sleepQuality,
          energyLevel: todayEntry.energyLevel,
          complementsTaken: todayEntry.complementsTaken,
          problemesParticuliers: todayEntry.problemesParticuliers || '',
          noteNaturopathe: todayEntry.noteNaturopathe || '',
        });
      } else {
        const draft = await loadDraft();
        if (draft) {
          Object.keys(draft).forEach((key) => {
            setValue(key as keyof CreateJournalEntryRequest, draft[key as keyof CreateJournalEntryRequest] as any);
          });
        }
      }
    };
    initForm();
  }, [todayEntry]);

  // Auto-save draft
  useEffect(() => {
    if (isDirty && !todayEntry) {
      saveDraft(formValues);
    }
  }, [formValues, isDirty]);

  // Load history when switching tabs
  useEffect(() => {
    if (activeTab === 'history') {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      fetchHistory(startDate, endDate);
    }
  }, [activeTab]);

  const onSubmit = async (data: CreateJournalEntryRequest) => {
    try {
      await saveEntry(data);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        refresh();
      }, 2000);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le journal.');
    }
  };

  const handleComplementToggle = (complementId: string) => {
    const current = formValues.complementsTaken || [];
    if (current.includes(complementId)) {
      setValue('complementsTaken', current.filter((id) => id !== complementId));
    } else {
      setValue('complementsTaken', [...current, complementId]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getMoodEmoji = (mood: number) => {
    const emojis = ['😢', '😕', '😐', '🙂', '😊'];
    return emojis[mood - 1] || '😐';
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <SuccessState
          title="Journal enregistré !"
          message="Votre naturopathe peut maintenant voir votre journal du jour."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Journal</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Ionicons
            name="today-outline"
            size={20}
            color={activeTab === 'today' ? Colors.primary.teal : Colors.neutral.grayWarm}
          />
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            Aujourd'hui
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'history' ? Colors.primary.teal : Colors.neutral.grayWarm}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'today' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.dateText}>{formatDate(new Date().toISOString())}</Text>

            {todayEntry && (
              <View style={styles.alreadyFilledBanner}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.state.success} />
                <Text style={styles.alreadyFilledText}>
                  Vous avez déjà rempli votre journal aujourd'hui. Vous pouvez le modifier ci-dessous.
                </Text>
              </View>
            )}

            {/* Mood */}
            <Controller
              control={control}
              name="mood"
              render={({ field: { onChange, value } }) => (
                <Rating
                  label="Comment vous sentez-vous aujourd'hui ?"
                  value={value}
                  onChange={onChange}
                  type="emoji"
                  style={styles.field}
                />
              )}
            />

            {/* Sleep */}
            <Controller
              control={control}
              name="sleepQuality"
              render={({ field: { onChange, value } }) => (
                <Rating
                  label="Qualité de votre sommeil"
                  value={value}
                  onChange={onChange}
                  type="star"
                  style={styles.field}
                />
              )}
            />

            {/* Energy */}
            <Controller
              control={control}
              name="energyLevel"
              render={({ field: { onChange, value } }) => (
                <Rating
                  label="Votre niveau d'énergie"
                  value={value}
                  onChange={onChange}
                  type="star"
                  style={styles.field}
                />
              )}
            />

            {/* Alimentation */}
            <Controller
              control={control}
              name="alimentationQuality"
              render={({ field: { onChange, value } }) => (
                <Rating
                  label="Qualité de votre alimentation"
                  value={value}
                  onChange={onChange}
                  type="star"
                  style={styles.field}
                />
              )}
            />

            {/* Complements */}
            {complements.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Compléments pris aujourd'hui</Text>
                <View style={styles.complementsList}>
                  {complements.map((complement) => (
                    <TouchableOpacity
                      key={complement.id}
                      style={[
                        styles.complementChip,
                        formValues.complementsTaken?.includes(complement.id) &&
                          styles.complementChipActive,
                      ]}
                      onPress={() => handleComplementToggle(complement.id)}
                    >
                      {formValues.complementsTaken?.includes(complement.id) && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={Colors.neutral.white}
                          style={styles.complementChipIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.complementChipText,
                          formValues.complementsTaken?.includes(complement.id) &&
                            styles.complementChipTextActive,
                        ]}
                      >
                        {complement.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Problems */}
            <Controller
              control={control}
              name="problemesParticuliers"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Problèmes particuliers aujourd'hui (optionnel)"
                  placeholder="Décrivez tout symptôme ou difficulté..."
                  multiline
                  numberOfLines={3}
                  value={value}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                />
              )}
            />

            {/* Note */}
            <Controller
              control={control}
              name="noteNaturopathe"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Note pour votre naturopathe (optionnel)"
                  placeholder="Une question, une remarque..."
                  multiline
                  numberOfLines={3}
                  value={value}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                />
              )}
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              isLoading={isSaving}
              style={styles.submitButton}
            >
              {todayEntry ? 'Mettre à jour mon journal' : 'Enregistrer mon journal'}
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="book-outline" size={48} color={Colors.neutral.grayWarm} />
              <Text style={styles.emptyHistoryText}>
                Aucune entrée dans les 30 derniers jours.
              </Text>
            </View>
          ) : (
            history.map((entry) => (
              <Card key={entry.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                  <Text style={styles.historyMood}>{getMoodEmoji(entry.mood)}</Text>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Ionicons name="moon-outline" size={16} color={Theme.textSecondary} />
                    <Text style={styles.historyStatText}>Sommeil: {entry.sleepQuality}/5</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Ionicons name="flash-outline" size={16} color={Theme.textSecondary} />
                    <Text style={styles.historyStatText}>Énergie: {entry.energyLevel}/5</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Ionicons name="nutrition-outline" size={16} color={Theme.textSecondary} />
                    <Text style={styles.historyStatText}>Alimentation: {entry.alimentationQuality}/5</Text>
                  </View>
                </View>
                {entry.problemesParticuliers && (
                  <Text style={styles.historyNote}>
                    {entry.problemesParticuliers}
                  </Text>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sandDark,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Theme.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sandDark,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary.teal,
  },
  tabText: {
    ...TextStyles.label,
    color: Colors.neutral.grayWarm,
  },
  tabTextActive: {
    color: Colors.primary.teal,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  dateText: {
    ...TextStyles.h4,
    color: Theme.text,
    textTransform: 'capitalize',
    marginBottom: Spacing.lg,
  },
  alreadyFilledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.state.successLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  alreadyFilledText: {
    ...TextStyles.bodySmall,
    color: Colors.state.success,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    ...TextStyles.label,
    color: Theme.text,
    marginBottom: Spacing.sm,
  },
  complementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  complementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.neutral.sand,
    borderWidth: 1,
    borderColor: Colors.neutral.sandDark,
  },
  complementChipActive: {
    backgroundColor: Colors.primary.teal,
    borderColor: Colors.primary.teal,
  },
  complementChipIcon: {
    marginRight: Spacing.xs,
  },
  complementChipText: {
    ...TextStyles.bodySmall,
    color: Theme.text,
  },
  complementChipTextActive: {
    color: Colors.neutral.white,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },

  // History
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyHistoryText: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginTop: Spacing.md,
  },
  historyCard: {
    marginBottom: Spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyDate: {
    ...TextStyles.label,
    color: Theme.text,
    textTransform: 'capitalize',
  },
  historyMood: {
    fontSize: 24,
  },
  historyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyStatText: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
  },
  historyNote: {
    ...TextStyles.body,
    color: Theme.text,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
