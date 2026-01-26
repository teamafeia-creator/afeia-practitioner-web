import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button } from '../../components/ui';
import { Colors } from '../../constants/Colors';
import { formatFullName, formatInitials } from '../../utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const [notifications, setNotifications] = useState({
    push: true,
    complementReminders: true,
    journalReminder: true,
    messages: true,
  });

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
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    // TODO: Sauvegarder les préférences de notifications
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
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {formatInitials(user?.firstName, user?.lastName)}
            </Text>
          </View>
          <Text style={styles.userName}>
            {formatFullName(user?.firstName, user?.lastName)}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Informations personnelles */}
        <Card title="Informations personnelles">
          <ProfileItem label="Prénom" value={user?.firstName || '-'} />
          <ProfileItem label="Nom" value={user?.lastName || '-'} />
          <ProfileItem label="Email" value={user?.email || '-'} />
          <ProfileItem label="Téléphone" value={user?.phone || '-'} />
          <Button
            title="Modifier mes informations"
            onPress={() => {}}
            variant="outline"
            fullWidth
            size="small"
            style={styles.editButton}
          />
        </Card>

        {/* Notifications */}
        <Card title="Notifications">
          <NotificationToggle
            label="Notifications push"
            description="Recevoir des notifications sur votre appareil"
            value={notifications.push}
            onToggle={() => handleToggleNotification('push')}
          />
          <NotificationToggle
            label="Rappels compléments"
            description="Rappel quotidien pour prendre vos compléments"
            value={notifications.complementReminders}
            onToggle={() => handleToggleNotification('complementReminders')}
          />
          <NotificationToggle
            label="Rappel journal"
            description="Rappel pour remplir votre journal quotidien"
            value={notifications.journalReminder}
            onToggle={() => handleToggleNotification('journalReminder')}
          />
          <NotificationToggle
            label="Messages"
            description="Notifier des nouveaux messages"
            value={notifications.messages}
            onToggle={() => handleToggleNotification('messages')}
          />
        </Card>

        {/* Bague connectée */}
        <Card title="Bague connectée">
          {user?.isPremium ? (
            <View style={styles.wearableConnected}>
              <View style={styles.wearableStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Connectée • Sync auto</Text>
              </View>
              <Button
                title="Déconnecter"
                onPress={() => {}}
                variant="outline"
                size="small"
              />
            </View>
          ) : (
            <View style={styles.wearableNotConnected}>
              <Text style={styles.wearableDescription}>
                Connectez votre bague pour synchroniser vos données de santé
              </Text>
              <Button
                title="Connecter ma bague"
                onPress={() => {}}
                variant="outline"
                fullWidth
              />
            </View>
          )}
        </Card>

        {/* Abonnement */}
        <Card title="Mon abonnement">
          {user?.isPremium ? (
            <View style={styles.premiumContainer}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
              <Text style={styles.subscriptionInfo}>
                Votre abonnement est actif
              </Text>
              <Button
                title="Gérer mon abonnement"
                onPress={() => {}}
                variant="ghost"
                size="small"
              />
            </View>
          ) : (
            <View style={styles.freeContainer}>
              <Text style={styles.subscriptionInfo}>
                Profitez de toutes les fonctionnalités avec Premium
              </Text>
              <Button
                title="Passer à Premium"
                onPress={() => {}}
                variant="primary"
                fullWidth
              />
            </View>
          )}
        </Card>

        {/* Autres liens */}
        <Card>
          <MenuLink
            icon="🔒"
            title="Sécurité & confidentialité"
            onPress={() => {}}
          />
          <MenuLink
            icon="📜"
            title="CGU & Politique de confidentialité"
            onPress={() => {}}
          />
          <MenuLink
            icon="❓"
            title="Aide & Support"
            onPress={() => {}}
          />
        </Card>

        {/* Déconnexion */}
        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
          loading={isLoading}
        />

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ProfileItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.profileItem}>
    <Text style={styles.profileLabel}>{label}</Text>
    <Text style={styles.profileValue}>{value}</Text>
  </View>
);

const NotificationToggle: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}> = ({ label, description, value, onToggle }) => (
  <View style={styles.notificationItem}>
    <View style={styles.notificationText}>
      <Text style={styles.notificationLabel}>{label}</Text>
      <Text style={styles.notificationDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: Colors.grisChaud, true: Colors.tealLight }}
      thumbColor={value ? Colors.teal : Colors.blanc}
    />
  </View>
);

const MenuLink: React.FC<{
  icon: string;
  title: string;
  onPress: () => void;
}> = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.menuLink} onPress={onPress}>
    <Text style={styles.menuIcon}>{icon}</Text>
    <Text style={styles.menuTitle}>{title}</Text>
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
);

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
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.blanc,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sable,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  editButton: {
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sable,
  },
  notificationText: {
    flex: 1,
    marginRight: 12,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
  },
  notificationDescription: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  wearableConnected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wearableStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  wearableNotConnected: {
    alignItems: 'center',
  },
  wearableDescription: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginBottom: 12,
  },
  premiumContainer: {
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: Colors.aubergine,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  premiumBadgeText: {
    color: Colors.blanc,
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionInfo: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginBottom: 8,
  },
  freeContainer: {
    alignItems: 'center',
  },
  menuLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sable,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.grisChaud,
  },
  logoutButton: {
    marginTop: 16,
    borderColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.error,
  },
  version: {
    fontSize: 12,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginTop: 16,
  },
  bottomSpacer: {
    height: 20,
  },
});
