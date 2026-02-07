import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ComplementCard } from '../../components/features/ComplementCard';
import { Complement, Naturopathe } from '../../types';
import { todayISO } from '../../utils/dates';
import { colors, spacing, fontSize } from '../../constants/theme';

export default function ProfileScreen() {
  const { consultant, logout, refreshProfile } = useAuth();
  const [complements, setComplements] = useState<Complement[]>([]);
  const [naturopathe, setNaturopathe] = useState<Naturopathe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [compRes, naturoRes] = await Promise.allSettled([
        api.get<{ complements: Complement[] }>('/api/mobile/complements'),
        api.get<{ naturopathe: Naturopathe }>(
          '/api/mobile/consultant/naturopathe-info',
        ),
      ]);

      if (compRes.status === 'fulfilled') {
        setComplements(compRes.value.complements || []);
      }
      if (naturoRes.status === 'fulfilled') {
        setNaturopathe(naturoRes.value.naturopathe);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      setError(message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggleComplement(complementId: string, taken: boolean) {
    setTogglingId(complementId);
    try {
      await api.post('/api/mobile/complements/track', {
        complementId,
        date: todayISO(),
        taken,
      });
      setComplements((prev) =>
        prev.map((c) =>
          c.id === complementId ? { ...c, takenToday: taken } : c,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'SESSION_EXPIRED') {
        await logout();
        return;
      }
      Alert.alert('Erreur', 'Impossible de mettre à jour le suivi');
    } finally {
      setTogglingId(null);
    }
  }

  function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const fullName = consultant
    ? `${consultant.firstName} ${consultant.lastName}`
    : 'Consultant';
  const activeComplements = complements.filter((c) => c.active);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
              refreshProfile();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="lg">
          <View style={styles.profileHeader}>
            <Avatar name={fullName} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileEmail}>{consultant?.email}</Text>
              {consultant?.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
          </View>

          {consultant?.phone && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Téléphone</Text>
              <Text style={styles.detailValue}>{consultant.phone}</Text>
            </View>
          )}
          {consultant?.city && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ville</Text>
              <Text style={styles.detailValue}>{consultant.city}</Text>
            </View>
          )}
        </Card>

        {naturopathe && (
          <Card variant="elevated" padding="lg">
            <Text style={styles.sectionTitle}>Mon naturopathe</Text>
            <View style={styles.naturoRow}>
              <Avatar
                name={naturopathe.fullName}
                imageUrl={naturopathe.avatarUrl}
                size={44}
              />
              <View>
                <Text style={styles.naturoName}>{naturopathe.fullName}</Text>
                <Text style={styles.naturoEmail}>{naturopathe.email}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Compléments du jour ({activeComplements.filter((c) => c.takenToday).length}/
            {activeComplements.length})
          </Text>
          {activeComplements.length === 0 ? (
            <Card variant="flat" padding="lg">
              <Text style={styles.emptyText}>Aucun complément actif</Text>
            </Card>
          ) : (
            <View style={styles.complementsList}>
              {activeComplements.map((complement) => (
                <ComplementCard
                  key={complement.id}
                  complement={complement}
                  onToggle={handleToggleComplement}
                  toggling={togglingId === complement.id}
                />
              ))}
            </View>
          )}
        </View>

        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          variant="outline"
          fullWidth
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
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: 2,
  },
  premiumBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  premiumText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  naturoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  naturoName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  naturoEmail: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  complementsList: {
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});
