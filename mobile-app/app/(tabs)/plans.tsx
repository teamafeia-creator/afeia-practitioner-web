import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { PlanCard } from '../../components/features/PlanCard';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Plan } from '../../types';
import { colors, spacing, fontSize } from '../../constants/theme';

export default function PlansScreen() {
  const { logout } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<{ plans: Plan[] }>(
        '/api/mobile/plans?status=shared',
      );
      setPlans(data.plans || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      setError(message || 'Impossible de charger les plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchPlans} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Plans de soins</Text>
      </View>

      {plans.length === 0 ? (
        <EmptyState
          message="Aucun conseillancier"
          description="Votre naturopathe n'a pas encore partagé de conseillancier avec vous"
        />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PlanCard plan={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPlans();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
  },
  header: {
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
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  separator: {
    height: spacing.md,
  },
});
