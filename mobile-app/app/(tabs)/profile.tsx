/**
 * Profile Screen
 * User settings and account management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Card, PremiumBadge, Button } from '@/components/ui';
import { Colors, Theme, Spacing, TextStyles, BorderRadius } from '@/constants';

export default function ProfileScreen() {
  const { patient, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderComplements, setReminderComplements] = useState(true);
  const [reminderJournal, setReminderJournal] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile screen
    Alert.alert('Bientôt disponible', 'La modification du profil sera bientôt disponible.');
  };

  const handleConnectWearable = () => {
    if (patient?.isPremium) {
      // TODO: Implement Circular Ring connection
      Alert.alert('Connexion Circular', 'Fonctionnalité en cours de développement.');
    } else {
      Alert.alert(
        'Fonctionnalité Premium',
        'Passez à Premium pour connecter votre bague Circular et suivre vos données de santé.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Découvrir Premium', onPress: () => {/* Navigate to premium */ } },
        ]
      );
    }
  };

  const handleManageSubscription = () => {
    // TODO: Navigate to subscription management
    Alert.alert('Bientôt disponible', 'La gestion des abonnements sera bientôt disponible.');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@afeia.com');
  };

  const handleOpenCGU = () => {
    Linking.openURL('https://afeia.com/cgu');
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://afeia.com/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Avatar
            source={patient?.avatarUrl}
            name={`${patient?.firstName} ${patient?.lastName}`}
            size="2xl"
          />
          <Text style={styles.name}>
            {patient?.firstName} {patient?.lastName}
          </Text>
          <Text style={styles.email}>{patient?.email}</Text>
          {patient?.isPremium && (
            <View style={styles.premiumBadgeContainer}>
              <PremiumBadge />
              <Text style={styles.premiumText}>Membre Premium</Text>
            </View>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <Card style={styles.sectionCard}>
            <MenuItem
              icon="person-outline"
              label="Informations personnelles"
              onPress={handleEditProfile}
            />
            <MenuItem
              icon="lock-closed-outline"
              label="Sécurité & confidentialité"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={styles.sectionCard}>
            <View style={styles.switchItem}>
              <View style={styles.switchItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={Theme.text} />
                <Text style={styles.switchLabel}>Notifications push</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: Colors.neutral.sandDark,
                  true: Colors.primary.tealLight,
                }}
                thumbColor={
                  notificationsEnabled ? Colors.primary.teal : Colors.neutral.grayWarm
                }
              />
            </View>
            <View style={styles.switchItem}>
              <View style={styles.switchItemLeft}>
                <Ionicons name="medical-outline" size={22} color={Theme.text} />
                <View>
                  <Text style={styles.switchLabel}>Rappel compléments</Text>
                  <Text style={styles.switchHint}>Chaque jour à 8h00</Text>
                </View>
              </View>
              <Switch
                value={reminderComplements}
                onValueChange={setReminderComplements}
                trackColor={{
                  false: Colors.neutral.sandDark,
                  true: Colors.primary.tealLight,
                }}
                thumbColor={
                  reminderComplements ? Colors.primary.teal : Colors.neutral.grayWarm
                }
                disabled={!notificationsEnabled}
              />
            </View>
            <View style={styles.switchItem}>
              <View style={styles.switchItemLeft}>
                <Ionicons name="book-outline" size={22} color={Theme.text} />
                <View>
                  <Text style={styles.switchLabel}>Rappel journal</Text>
                  <Text style={styles.switchHint}>Chaque jour à 20h00</Text>
                </View>
              </View>
              <Switch
                value={reminderJournal}
                onValueChange={setReminderJournal}
                trackColor={{
                  false: Colors.neutral.sandDark,
                  true: Colors.primary.tealLight,
                }}
                thumbColor={
                  reminderJournal ? Colors.primary.teal : Colors.neutral.grayWarm
                }
                disabled={!notificationsEnabled}
              />
            </View>
          </Card>
        </View>

        {/* Wearable Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bague connectée</Text>
          <Card
            variant={patient?.isPremium ? 'default' : 'premium'}
            style={styles.sectionCard}
          >
            <TouchableOpacity
              style={styles.wearableItem}
              onPress={handleConnectWearable}
            >
              <View style={styles.wearableLeft}>
                <Ionicons
                  name="watch-outline"
                  size={24}
                  color={patient?.isPremium ? Colors.primary.teal : Colors.secondary.aubergine}
                />
                <View>
                  <Text style={styles.wearableLabel}>Circular Ring</Text>
                  <Text style={styles.wearableStatus}>
                    {patient?.isPremium ? 'Non connectée' : 'Fonctionnalité Premium'}
                  </Text>
                </View>
              </View>
              {!patient?.isPremium && <PremiumBadge />}
              {patient?.isPremium && (
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grayWarm} />
              )}
            </TouchableOpacity>
          </Card>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement</Text>
          <Card style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.subscriptionItem}
              onPress={handleManageSubscription}
            >
              <View style={styles.subscriptionLeft}>
                <Ionicons name="card-outline" size={22} color={Theme.text} />
                <View>
                  <Text style={styles.subscriptionLabel}>
                    {patient?.isPremium ? 'Premium' : 'Gratuit'}
                  </Text>
                  <Text style={styles.subscriptionStatus}>
                    {patient?.isPremium
                      ? 'Renouvellement le 26/02/2026'
                      : 'Découvrez les avantages Premium'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grayWarm} />
            </TouchableOpacity>
            {!patient?.isPremium && (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onPress={handleManageSubscription}
                style={styles.premiumButton}
              >
                Passer à Premium
              </Button>
            )}
          </Card>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aide & informations</Text>
          <Card style={styles.sectionCard}>
            <MenuItem
              icon="help-circle-outline"
              label="Aide & Support"
              onPress={handleContactSupport}
            />
            <MenuItem
              icon="document-text-outline"
              label="Conditions générales d'utilisation"
              onPress={handleOpenCGU}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Politique de confidentialité"
              onPress={handleOpenPrivacy}
            />
          </Card>
        </View>

        {/* Logout */}
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color={Colors.state.error} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </View>
        </Button>

        {/* Version */}
        <Text style={styles.versionText}>AFEIA Patient v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  rightElement,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={Theme.text} />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={Colors.neutral.grayWarm} />
      )}
    </TouchableOpacity>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  name: {
    ...TextStyles.h3,
    color: Theme.text,
    marginTop: Spacing.md,
  },
  email: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginTop: Spacing.xs,
  },
  premiumBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  premiumText: {
    ...TextStyles.labelSmall,
    color: Colors.secondary.aubergine,
  },

  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.labelSmall,
    color: Theme.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sand,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemLabel: {
    ...TextStyles.body,
    color: Theme.text,
  },

  // Switch Items
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sand,
  },
  switchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  switchLabel: {
    ...TextStyles.body,
    color: Theme.text,
  },
  switchHint: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
  },

  // Wearable
  wearableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  wearableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  wearableLabel: {
    ...TextStyles.body,
    color: Theme.text,
  },
  wearableStatus: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
  },

  // Subscription
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  subscriptionLabel: {
    ...TextStyles.body,
    color: Theme.text,
    fontWeight: '500',
  },
  subscriptionStatus: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
  },
  premiumButton: {
    margin: Spacing.base,
  },

  // Logout
  logoutButton: {
    marginTop: Spacing.lg,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoutText: {
    ...TextStyles.body,
    color: Colors.state.error,
    fontWeight: '500',
  },

  // Version
  versionText: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
