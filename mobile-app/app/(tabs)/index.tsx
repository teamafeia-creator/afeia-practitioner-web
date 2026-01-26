/**
 * Dashboard Screen
 * Main home screen for patients
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useComplements } from '@/hooks';
import { Card, Avatar, PremiumBadge, LoadingScreen, ErrorState, Checkbox } from '@/components/ui';
import { patientApi, conseilsApi, messagesApi, formatApiError } from '@/services/api';
import { Colors, Theme, Spacing, TextStyles, Shadows } from '@/constants';
import type { NaturopatheInfo, Conseil, Message } from '@/types';

export default function DashboardScreen() {
  const { patient } = useAuth();
  const { complements, trackComplement, refresh: refreshComplements } = useComplements();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naturopatheInfo, setNaturopatheInfo] = useState<NaturopatheInfo | null>(null);
  const [conseils, setConseils] = useState<Conseil[]>([]);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [natInfo, conseilsData, messagesData, unreadCount] = await Promise.all([
        patientApi.getNaturopatheInfo(),
        conseilsApi.getAll(),
        messagesApi.getAll(1, 1),
        messagesApi.getUnreadCount(),
      ]);

      setNaturopatheInfo(natInfo);
      setConseils(conseilsData.slice(0, 3)); // Only show first 3
      setLastMessage(messagesData.data[0] || null);
      setUnreadMessages(unreadCount);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchData(), refreshComplements()]);
    setIsRefreshing(false);
  };

  const handleComplementToggle = async (complementId: string, taken: boolean) => {
    try {
      await trackComplement(complementId, taken);
    } catch (err) {
      console.error('Error tracking complement:', err);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement de votre espace..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
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
            tintColor={Colors.primary.teal}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar
              source={patient?.avatarUrl}
              name={`${patient?.firstName} ${patient?.lastName}`}
              size="lg"
            />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.name}>{patient?.firstName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <Ionicons name="notifications-outline" size={24} color={Theme.text} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Naturopathe Info Card */}
        {naturopatheInfo && (
          <Card style={styles.naturopatheCard}>
            <View style={styles.naturopatheHeader}>
              <Avatar
                source={naturopatheInfo.naturopathe.avatarUrl}
                name={naturopatheInfo.naturopathe.fullName}
                size="md"
              />
              <View style={styles.naturopatheInfo}>
                <Text style={styles.naturopatheLabel}>Votre naturopathe</Text>
                <Text style={styles.naturopatheName}>{naturopatheInfo.naturopathe.fullName}</Text>
              </View>
            </View>
            <View style={styles.naturopatheContact}>
              {naturopatheInfo.naturopathe.phone && (
                <TouchableOpacity style={styles.contactItem}>
                  <Ionicons name="call-outline" size={16} color={Colors.primary.teal} />
                  <Text style={styles.contactText}>{naturopatheInfo.naturopathe.phone}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.contactItem}>
                <Ionicons name="mail-outline" size={16} color={Colors.primary.teal} />
                <Text style={styles.contactText}>{naturopatheInfo.naturopathe.email}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.consultations}>
              {naturopatheInfo.lastConsultation && (
                <View style={styles.consultationItem}>
                  <Text style={styles.consultationLabel}>Dernière consultation</Text>
                  <Text style={styles.consultationDate}>
                    {new Date(naturopatheInfo.lastConsultation).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}
              {naturopatheInfo.nextConsultation && (
                <View style={[styles.consultationItem, styles.nextConsultation]}>
                  <Text style={styles.consultationLabel}>Prochaine consultation</Text>
                  <Text style={[styles.consultationDate, styles.nextConsultationDate]}>
                    {new Date(naturopatheInfo.nextConsultation).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Complements Card */}
        <Card
          title="Mes Compléments"
          icon={<Ionicons name="medical-outline" size={24} color={Colors.primary.teal} />}
          style={styles.card}
          onPress={() => {/* Navigate to complements detail */}}
        >
          {complements.length === 0 ? (
            <Text style={styles.emptyText}>Aucun complément prescrit pour le moment.</Text>
          ) : (
            <>
              {complements.slice(0, 3).map((complement) => (
                <View key={complement.id} style={styles.complementItem}>
                  <TouchableOpacity
                    style={styles.complementCheckbox}
                    onPress={() => handleComplementToggle(complement.id, !complement.takenToday)}
                  >
                    <View style={[
                      styles.checkbox,
                      complement.takenToday && styles.checkboxChecked,
                    ]}>
                      {complement.takenToday && (
                        <Ionicons name="checkmark" size={14} color={Colors.neutral.white} />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.complementInfo}>
                    <Text style={[
                      styles.complementName,
                      complement.takenToday && styles.complementNameTaken,
                    ]}>
                      {complement.name}
                    </Text>
                    <Text style={styles.complementDosage}>
                      {complement.dosage} • {complement.frequency === 'matin' ? 'Matin' :
                        complement.frequency === 'midi' ? 'Midi' :
                        complement.frequency === 'soir' ? 'Soir' :
                        complement.frequency === 'matin_soir' ? 'Matin et Soir' : 'Matin, Midi et Soir'}
                    </Text>
                  </View>
                  {complement.takenToday && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.state.success} />
                  )}
                </View>
              ))}
              {complements.length > 3 && (
                <TouchableOpacity style={styles.seeAllButton}>
                  <Text style={styles.seeAllText}>Voir tous ({complements.length})</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary.teal} />
                </TouchableOpacity>
              )}
            </>
          )}
        </Card>

        {/* Journal Card */}
        <Card
          title="Mon journal du jour"
          icon={<Ionicons name="book-outline" size={24} color={Colors.secondary.sage} />}
          style={styles.card}
          onPress={() => router.push('/(tabs)/journal')}
        >
          <Text style={styles.journalPrompt}>
            Comment vous sentez-vous aujourd'hui ?
          </Text>
          <View style={styles.journalEmojis}>
            {['😢', '😕', '😐', '🙂', '😊'].map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiButton}
                onPress={() => router.push('/(tabs)/journal')}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.journalButton}
            onPress={() => router.push('/(tabs)/journal')}
          >
            <Text style={styles.journalButtonText}>Remplir mon journal</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary.teal} />
          </TouchableOpacity>
        </Card>

        {/* Messages Card */}
        <Card
          title="Messages"
          icon={<Ionicons name="chatbubble-outline" size={24} color={Colors.primary.teal} />}
          rightElement={
            unreadMessages > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadMessages} nouveau{unreadMessages > 1 ? 'x' : ''}</Text>
              </View>
            ) : undefined
          }
          style={styles.card}
          onPress={() => router.push('/(tabs)/messages')}
        >
          {lastMessage ? (
            <View style={styles.messagePreview}>
              <Avatar
                source={naturopatheInfo?.naturopathe.avatarUrl}
                name={naturopatheInfo?.naturopathe.fullName}
                size="sm"
              />
              <View style={styles.messageContent}>
                <Text style={styles.messageSender}>
                  {lastMessage.senderType === 'praticien'
                    ? naturopatheInfo?.naturopathe.fullName
                    : 'Vous'}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                  {lastMessage.content}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
          )}
        </Card>

        {/* Conseils Card */}
        {conseils.length > 0 && (
          <Card
            title={`Conseils de ${naturopatheInfo?.naturopathe.fullName.split(' ')[0] || 'votre naturopathe'}`}
            icon={<Ionicons name="bulb-outline" size={24} color={Colors.secondary.gold} />}
            style={styles.card}
          >
            {conseils.map((conseil) => (
              <TouchableOpacity key={conseil.id} style={styles.conseilItem}>
                <View style={styles.conseilIcon}>
                  <Ionicons
                    name={
                      conseil.category === 'alimentation' ? 'nutrition-outline' :
                      conseil.category === 'exercices' ? 'fitness-outline' :
                      conseil.category === 'hygiene_vie' ? 'sunny-outline' :
                      conseil.category === 'plantes' ? 'leaf-outline' :
                      'bulb-outline'
                    }
                    size={16}
                    color={Colors.secondary.gold}
                  />
                </View>
                <View style={styles.conseilContent}>
                  <Text style={styles.conseilTitle}>{conseil.title}</Text>
                  <Text style={styles.conseilText} numberOfLines={2}>
                    {conseil.content}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.neutral.grayWarm} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Premium Wearable Card */}
        <Card
          title="Données Circular"
          icon={<Ionicons name="watch-outline" size={24} color={Colors.secondary.aubergine} />}
          rightElement={<PremiumBadge />}
          variant="premium"
          style={styles.card}
        >
          {patient?.isPremium ? (
            <View style={styles.wearableData}>
              <View style={styles.wearableItem}>
                <Ionicons name="moon-outline" size={20} color={Colors.primary.teal} />
                <Text style={styles.wearableLabel}>Sommeil</Text>
                <Text style={styles.wearableValue}>7h32</Text>
              </View>
              <View style={styles.wearableItem}>
                <Ionicons name="heart-outline" size={20} color={Colors.state.error} />
                <Text style={styles.wearableLabel}>FC</Text>
                <Text style={styles.wearableValue}>62 bpm</Text>
              </View>
              <View style={styles.wearableItem}>
                <Ionicons name="pulse-outline" size={20} color={Colors.secondary.sage} />
                <Text style={styles.wearableLabel}>HRV</Text>
                <Text style={styles.wearableValue}>45 ms</Text>
              </View>
              <View style={styles.wearableItem}>
                <Ionicons name="footsteps-outline" size={20} color={Colors.secondary.gold} />
                <Text style={styles.wearableLabel}>Pas</Text>
                <Text style={styles.wearableValue}>8,234</Text>
              </View>
            </View>
          ) : (
            <View style={styles.premiumPromo}>
              <Ionicons name="lock-closed-outline" size={32} color={Colors.secondary.aubergine} />
              <Text style={styles.premiumTitle}>Fonctionnalité Premium</Text>
              <Text style={styles.premiumText}>
                Connectez votre bague Circular pour suivre votre sommeil, HRV, et activité en temps réel.
              </Text>
              <TouchableOpacity style={styles.premiumButton}>
                <Text style={styles.premiumButtonText}>Découvrir Premium</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.sand,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: Spacing.md,
  },
  greeting: {
    ...TextStyles.body,
    color: Theme.textSecondary,
  },
  name: {
    ...TextStyles.h4,
    color: Theme.text,
  },
  notificationButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.state.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.neutral.white,
    fontSize: 10,
    fontWeight: '700',
  },

  // Naturopathe Card
  naturopatheCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
  },
  naturopatheHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  naturopatheInfo: {
    marginLeft: Spacing.md,
  },
  naturopatheLabel: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
  },
  naturopatheName: {
    ...TextStyles.h5,
    color: Theme.text,
  },
  naturopatheContact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    ...TextStyles.bodySmall,
    color: Colors.primary.teal,
    marginLeft: Spacing.xs,
  },
  consultations: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  consultationItem: {
    flex: 1,
    padding: Spacing.sm,
    backgroundColor: Colors.neutral.sand,
    borderRadius: 8,
  },
  nextConsultation: {
    backgroundColor: Colors.primary.tealPale,
  },
  consultationLabel: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    marginBottom: 2,
  },
  consultationDate: {
    ...TextStyles.label,
    color: Theme.text,
  },
  nextConsultationDate: {
    color: Colors.primary.tealDeep,
  },

  // Cards
  card: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    fontStyle: 'italic',
  },

  // Complements
  complementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sand,
  },
  complementCheckbox: {
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutral.grayWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary.teal,
    borderColor: Colors.primary.teal,
  },
  complementInfo: {
    flex: 1,
  },
  complementName: {
    ...TextStyles.body,
    color: Theme.text,
    fontWeight: '500',
  },
  complementNameTaken: {
    textDecorationLine: 'line-through',
    color: Theme.textSecondary,
  },
  complementDosage: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
  },
  seeAllText: {
    ...TextStyles.body,
    color: Colors.primary.teal,
    marginRight: Spacing.xs,
  },

  // Journal
  journalPrompt: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginBottom: Spacing.md,
  },
  journalEmojis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  journalButtonText: {
    ...TextStyles.body,
    color: Colors.primary.teal,
    fontWeight: '500',
    marginRight: Spacing.xs,
  },

  // Messages
  unreadBadge: {
    backgroundColor: Colors.primary.tealPale,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 12,
  },
  unreadText: {
    ...TextStyles.caption,
    color: Colors.primary.tealDeep,
    fontWeight: '600',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  messageSender: {
    ...TextStyles.labelSmall,
    color: Theme.text,
    marginBottom: 2,
  },
  messageText: {
    ...TextStyles.body,
    color: Theme.textSecondary,
  },

  // Conseils
  conseilItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sand,
  },
  conseilIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  conseilContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  conseilTitle: {
    ...TextStyles.label,
    color: Theme.text,
    marginBottom: 2,
  },
  conseilText: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
  },

  // Wearable
  wearableData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  wearableItem: {
    alignItems: 'center',
  },
  wearableLabel: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    marginTop: Spacing.xs,
  },
  wearableValue: {
    ...TextStyles.label,
    color: Theme.text,
  },
  premiumPromo: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  premiumTitle: {
    ...TextStyles.h5,
    color: Colors.secondary.aubergine,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  premiumText: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  premiumButton: {
    backgroundColor: Colors.secondary.auberginePale,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  premiumButtonText: {
    ...TextStyles.label,
    color: Colors.secondary.aubergine,
  },
});
