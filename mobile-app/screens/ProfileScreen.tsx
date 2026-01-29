import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Colors } from '../constants/Colors';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../services/api';
import { storage } from '../utils/storage';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onEditAnamnese?: () => void;
  hasAnamnesis?: boolean;
}

export default function ProfileScreen({ onBack, onLogout, onEditAnamnese, hasAnamnesis }: ProfileScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [naturopathe, setNaturopathe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, naturoData] = await Promise.all([
        api.getProfile(),
        api.getNaturopatheInfo(),
      ]);
      setProfile(profileData);
      setNaturopathe(naturoData);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      // Mock data for demo
      setProfile({
        firstName: 'Sophie',
        lastName: 'Martin',
        email: 'sophie.martin@email.com',
        phone: '06 12 34 56 78',
      });
      setNaturopathe({
        fullName: 'Dr. Martin',
        email: 'dr.martin@afeia.com',
        phone: '01 23 45 67 89',
      });
    } finally {
      setLoading(false);
    }
  };

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
            await api.logout();
            await storage.clearAll();
            onLogout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Info', 'Contactez votre naturopathe pour supprimer votre compte.');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>← Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.title}>👤 Mon Profil</Text>
        </View>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👤 Mon Profil</Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>
            {profile?.firstName} {profile?.lastName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Téléphone</Text>
          <Text style={styles.infoValue}>{profile?.phone || 'Non renseigné'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Mon naturopathe</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>{naturopathe?.fullName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{naturopathe?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Téléphone</Text>
          <Text style={styles.infoValue}>{naturopathe?.phone || 'Non renseigné'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Recevoir des rappels pour les compléments
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#E0E0E0', true: Colors.teal }}
            thumbColor={Colors.blanc}
          />
        </View>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Mode sombre</Text>
            <Text style={styles.settingDescription}>
              Activer le thème sombre
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#E0E0E0', true: Colors.teal }}
            thumbColor={Colors.blanc}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Mon anamnèse</Text>
        <Text style={styles.anamneseDescription}>
          {hasAnamnesis
            ? 'Votre questionnaire de santé a été rempli. Vous pouvez le modifier à tout moment.'
            : 'Complétez votre questionnaire de santé pour aider votre naturopathe à mieux vous accompagner.'}
        </Text>
        <TouchableOpacity
          style={styles.anamneseButton}
          onPress={onEditAnamnese}
        >
          <Text style={styles.anamneseButtonText}>
            {hasAnamnesis ? '✏️ Modifier mon anamnèse' : '📋 Remplir mon anamnèse'}
          </Text>
          <Text style={styles.documentArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Documents</Text>
        <TouchableOpacity style={styles.documentRow}>
          <Text style={styles.documentText}>📊 Historique des consultations</Text>
          <Text style={styles.documentArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.documentRow}>
          <Text style={styles.documentText}>💊 Mes protocoles</Text>
          <Text style={styles.documentArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <TouchableOpacity style={styles.documentRow}>
          <Text style={styles.documentText}>📜 Conditions d'utilisation</Text>
          <Text style={styles.documentArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.documentRow}>
          <Text style={styles.documentText}>🔒 Politique de confidentialité</Text>
          <Text style={styles.documentArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.logoutSection}>
        <Button title="Se déconnecter" onPress={handleLogout} variant="secondary" />
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    color: Colors.teal,
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.teal,
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.grisChaud,
    marginTop: 50,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.charcoal,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.charcoal,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  documentText: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  documentArrow: {
    fontSize: 16,
    color: Colors.grisChaud,
  },
  anamneseDescription: {
    fontSize: 13,
    color: Colors.grisChaud,
    marginBottom: 15,
    lineHeight: 18,
  },
  anamneseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.teal + '15',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  anamneseButtonText: {
    fontSize: 15,
    color: Colors.teal,
    fontWeight: '500',
  },
  logoutSection: {
    marginTop: 10,
    marginBottom: 15,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
});
