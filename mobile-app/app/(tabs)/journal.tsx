import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, LoadingSpinner } from '../../components/ui';
import { JournalCard } from '../../components/dashboard';
import { journalService } from '../../services/api/journal';
import { complementsService } from '../../services/api/complements';
import { Colors } from '../../constants/Colors';
import { formatDate, formatMoodEmoji } from '../../utils/formatters';
import type { JournalEntry, Complement } from '../../types';

export default function JournalScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [complements, setComplements] = useState<Complement[]>([]);

  const loadData = useCallback(async () => {
    try {
      console.log('✅ Journal: Loading data...');

      const [todayRes, historyRes, complementsRes] = await Promise.allSettled([
        journalService.getTodayEntry(),
        journalService.getHistory(1, 30),
        complementsService.getAll(),
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value.success) {
        setTodayEntry(todayRes.value.data || null);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.success) {
        setHistory(historyRes.value.data?.data || []);
      }

      if (complementsRes.status === 'fulfilled' && complementsRes.value.success) {
        setComplements(complementsRes.value.data || []);
      }

      console.log('✅ Journal: Data loaded');
    } catch (error) {
      console.error('❌ Journal: Error loading data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const renderHistoryItem = ({ item }: { item: JournalEntry }) => (
    <TouchableOpacity style={styles.historyItem}>
      <View style={styles.historyDate}>
        <Text style={styles.historyDateText}>{formatDate(item.date, { day: 'numeric', month: 'short' })}</Text>
      </View>
      <View style={styles.historyContent}>
        <View style={styles.historyMetrics}>
          <MetricBadge label="Humeur" value={formatMoodEmoji(item.mood)} />
          <MetricBadge label="Alim." value={`${item.alimentation}/5`} />
          <MetricBadge label="Sommeil" value={`${item.sommeil}/5`} />
          <MetricBadge label="Énergie" value={`${item.energie}/5`} />
        </View>
        {item.problems && (
          <Text style={styles.historyProblems} numberOfLines={1}>
            {item.problems}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner fullScreen message="Chargement..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.teal}
          />
        }
      >
        {/* Titre */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon Journal</Text>
          <Text style={styles.subtitle}>
            Suivez votre bien-être au quotidien
          </Text>
        </View>

        {/* Entrée du jour */}
        <JournalCard
          todayEntry={todayEntry}
          complements={complements}
          onSaved={loadData}
        />

        {/* Historique */}
        <Card title="Historique" subtitle={`${history.length} entrées`}>
          {history.length > 0 ? (
            <FlatList
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>
              Aucune entrée dans l'historique
            </Text>
          )}
        </Card>

        {/* Statistiques (aperçu) */}
        <Card title="Tendances" subtitle="Ce mois">
          <View style={styles.statsRow}>
            <StatItem
              label="Humeur moyenne"
              value={calculateAverage(history, 'mood')}
              icon="😊"
            />
            <StatItem
              label="Sommeil moyen"
              value={`${calculateAverage(history, 'sommeil')}/5`}
              icon="😴"
            />
            <StatItem
              label="Énergie moyenne"
              value={`${calculateAverage(history, 'energie')}/5`}
              icon="⚡"
            />
          </View>
          <View style={styles.streakContainer}>
            <Text style={styles.streakLabel}>🔥 Série actuelle</Text>
            <Text style={styles.streakValue}>
              {calculateStreak(history)} jour{calculateStreak(history) > 1 ? 's' : ''}
            </Text>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.metricBadge}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const StatItem: React.FC<{ label: string; value: string; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const calculateAverage = (entries: JournalEntry[], field: keyof JournalEntry): string => {
  if (entries.length === 0) return '-';
  const sum = entries.reduce((acc, entry) => acc + (Number(entry[field]) || 0), 0);
  return (sum / entries.length).toFixed(1);
};

const calculateStreak = (entries: JournalEntry[]): number => {
  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    entryDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grisChaud,
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  historyDate: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.teal,
    textAlign: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  historyProblems: {
    fontSize: 13,
    color: Colors.grisChaud,
    fontStyle: 'italic',
  },
  metricBadge: {
    alignItems: 'center',
    backgroundColor: Colors.sable,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.grisChaud,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.sable,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    paddingVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginTop: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.sable,
    padding: 12,
    borderRadius: 12,
  },
  streakLabel: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dore,
  },
  bottomSpacer: {
    height: 20,
  },
});
