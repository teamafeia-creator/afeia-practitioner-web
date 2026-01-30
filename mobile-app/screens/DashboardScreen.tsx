import { useState, useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import ComplementsCard from '../components/dashboard/ComplementsCard';
import ConseilsCard from '../components/dashboard/ConseilsCard';
import JournalCard from '../components/dashboard/JournalCard';
import MessagesCard from '../components/dashboard/MessagesCard';
import PlansCard from '../components/dashboard/PlansCard';
import WearableCard from '../components/dashboard/WearableCard';
import ArticlesCard from '../components/dashboard/ArticlesCard';
import { api } from '../services/api';

interface DashboardScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [naturopathe, setNaturopathe] = useState<any>(null);

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
      console.error('Erreur chargement donnees:', error);
      // Ne pas utiliser de donnees mockees - afficher l'etat reel
      setProfile(null);
      setNaturopathe(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.greeting}>
            Bonjour, {profile?.firstName || 'Patient'} 👋
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => onNavigate?.('profile')}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
        {naturopathe && (
          <View style={styles.naturoInfo}>
            <Text style={styles.subtitle}>
              Votre naturopathe : {naturopathe.fullName}
            </Text>
            {naturopathe.phone && (
              <Text style={styles.info}>📞 {naturopathe.phone}</Text>
            )}
            {naturopathe.nextConsultation && (
              <Text style={styles.info}>
                📅 Prochaine consultation : {naturopathe.nextConsultation}
              </Text>
            )}
          </View>
        )}
      </View>

      <PlansCard onPress={() => onNavigate?.('plans')} />
      <ComplementsCard />
      <ConseilsCard />
      <JournalCard onPress={() => onNavigate?.('journal')} />
      <MessagesCard onPress={() => onNavigate?.('messages')} />
      <WearableCard />
      <ArticlesCard />

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.teal,
    marginBottom: 10,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.blanc,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButtonText: {
    fontSize: 22,
  },
  naturoInfo: {
    marginTop: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.charcoal,
    marginBottom: 5,
  },
  info: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginBottom: 3,
  },
  bottomSpacer: {
    height: 30,
  },
});
