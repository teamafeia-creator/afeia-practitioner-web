import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { NaturopatheCard } from '../../components/features/NaturopatheCard';
import { Naturopathe, Complement, JournalEntry, Plan } from '../../types';
import { colors, spacing, fontSize, shadows } from '../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardData {
  naturopathe: Naturopathe | null;
  nextConsultation: string | null;
  calendlyUrl: string | null;
  unreadCount: number;
  complements: Complement[];
  todayJournal: JournalEntry | null;
  latestPlan: Plan | null;
}

export default function HomeScreen() {
  const { consultant, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    naturopathe: null,
    nextConsultation: null,
    calendlyUrl: null,
    unreadCount: 0,
    complements: [],
    todayJournal: null,
    latestPlan: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [naturoRes, unreadRes, compRes, journalRes, plansRes] =
        await Promise.allSettled([
          api.get<{
            naturopathe: Naturopathe;
            nextConsultation?: string;
            calendlyUrl?: string;
          }>('/api/mobile/consultant/naturopathe-info'),
          api.get<{ count: number }>('/api/mobile/messages/unread-count'),
          api.get<{ complements: Complement[] }>('/api/mobile/complements'),
          api.get<{ entry: JournalEntry | null }>('/api/mobile/journal/today'),
          api.get<{ plans: Plan[] }>('/api/mobile/plans?status=shared'),
        ]);

      setData({
        naturopathe:
          naturoRes.status === 'fulfilled' ? naturoRes.value.naturopathe : null,
        nextConsultation:
          naturoRes.status === 'fulfilled'
            ? naturoRes.value.nextConsultation || null
            : null,
        calendlyUrl:
          naturoRes.status === 'fulfilled'
            ? naturoRes.value.calendlyUrl || null
            : null,
        unreadCount:
          unreadRes.status === 'fulfilled' ? unreadRes.value.count : 0,
        complements:
          compRes.status === 'fulfilled' ? compRes.value.complements : [],
        todayJournal:
          journalRes.status === 'fulfilled' ? journalRes.value.entry : null,
        latestPlan:
          plansRes.status === 'fulfilled' && plansRes.value.plans.length > 0
            ? plansRes.value.plans[0]
            : null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingScreen />;

  const firstName = consultant?.firstName || 'Consultant';
  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });
  const complementsTaken = data.complements.filter((c) => c.takenToday).length;
  const complementsTotal = data.complements.filter((c) => c.active).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingName}>
            Bonjour, {firstName}
          </Text>
          <Text style={styles.greetingDate}>{today}</Text>
        </View>

        {data.naturopathe && (
          <NaturopatheCard
            naturopathe={data.naturopathe}
            nextConsultation={data.nextConsultation || undefined}
            calendlyUrl={data.calendlyUrl || undefined}
          />
        )}

        <Card
          variant="elevated"
          padding="lg"
          style={styles.summaryCard}
        >
          <Text style={styles.sectionTitle}>Résumé du jour</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>
                {data.todayJournal ? '\u2713' : '\u2717'}
              </Text>
              <Text style={styles.summaryLabel}>Journal</Text>
              <Text style={styles.summaryValue}>
                {data.todayJournal ? 'Complété' : 'À remplir'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>{'\u2695'}</Text>
              <Text style={styles.summaryLabel}>Compléments</Text>
              <Text style={styles.summaryValue}>
                {complementsTaken}/{complementsTotal}
              </Text>
            </View>
          </View>
        </Card>

        {data.unreadCount > 0 && (
          <Card
            variant="elevated"
            padding="lg"
            onPress={() => router.push('/(tabs)/messages')}
          >
            <View style={styles.unreadRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.unreadCount}</Text>
              </View>
              <View style={styles.unreadInfo}>
                <Text style={styles.unreadTitle}>
                  {data.unreadCount === 1
                    ? 'Nouveau message'
                    : `${data.unreadCount} nouveaux messages`}
                </Text>
                <Text style={styles.unreadSubtitle}>
                  Appuyez pour consulter
                </Text>
              </View>
            </View>
          </Card>
        )}

        {data.latestPlan && (
          <Card
            variant="elevated"
            padding="lg"
            onPress={() => router.push('/(tabs)/plans')}
          >
            <Text style={styles.sectionTitle}>Dernier plan de soins</Text>
            <Text style={styles.planDate}>
              {data.latestPlan.sharedAt
                ? `Partagé le ${format(new Date(data.latestPlan.sharedAt), 'd MMM yyyy', { locale: fr })}`
                : 'Plan disponible'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  greeting: {
    marginBottom: spacing.sm,
  },
  greetingName: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
  },
  greetingDate: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  summaryCard: {
    // no extra styles needed
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryIcon: {
    fontSize: 24,
    color: colors.primary[500],
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  unreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  unreadInfo: {
    flex: 1,
  },
  unreadTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  unreadSubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
  planDate: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
});
