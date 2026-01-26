import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Card, LoadingSpinner } from '../../components/ui';
import {
  ComplementsCard,
  ConseilsCard,
  JournalCard,
  MessagesCard,
  WearableCard,
  ArticlesCard,
} from '../../components/dashboard';
import { patientService } from '../../services/api/patient';
import { complementsService } from '../../services/api/complements';
import { journalService } from '../../services/api/journal';
import { conseilsService } from '../../services/api/conseils';
import { articlesService } from '../../services/api/articles';
import { wearableService } from '../../services/api/wearable';
import { messagesService } from '../../services/api/messages';
import { Colors } from '../../constants/Colors';
import { formatDate, formatFullName, formatInitials } from '../../utils/formatters';
import type {
  Patient,
  Naturopathe,
  Complement,
  JournalEntry,
  Conseil,
  Article,
  WearableData,
  Conversation,
} from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // État des données
  const [patient, setPatient] = useState<Patient | null>(null);
  const [naturopathe, setNaturopathe] = useState<Naturopathe | null>(null);
  const [complements, setComplements] = useState<Complement[]>([]);
  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(null);
  const [conseils, setConseils] = useState<Conseil[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [wearableData, setWearableData] = useState<WearableData | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastConsultation, setLastConsultation] = useState<string | null>(null);
  const [nextConsultation, setNextConsultation] = useState<string | null>(null);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      console.log('✅ Dashboard: Loading data...');

      // Charger les données en parallèle
      const [
        dashboardRes,
        complementsRes,
        journalRes,
        conseilsRes,
        articlesRes,
        conversationRes,
        unreadRes,
      ] = await Promise.allSettled([
        patientService.getDashboard(),
        complementsService.getTodayComplements(),
        journalService.getTodayEntry(),
        conseilsService.getAll(),
        articlesService.getRecommended(),
        messagesService.getConversation(),
        messagesService.getUnreadCount(),
      ]);

      // Dashboard
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.success) {
        setPatient(dashboardRes.value.data?.patient || null);
        setNaturopathe(dashboardRes.value.data?.naturopathe || null);
        setUnreadMessages(dashboardRes.value.data?.unreadMessages || 0);
        setLastConsultation(dashboardRes.value.data?.lastConsultation || null);
        setNextConsultation(dashboardRes.value.data?.nextConsultation || null);
      }

      // Compléments
      if (complementsRes.status === 'fulfilled' && complementsRes.value.success) {
        setComplements(complementsRes.value.data || []);
      }

      // Journal
      if (journalRes.status === 'fulfilled' && journalRes.value.success) {
        setTodayJournal(journalRes.value.data || null);
      }

      // Conseils
      if (conseilsRes.status === 'fulfilled' && conseilsRes.value.success) {
        setConseils(conseilsRes.value.data || []);
      }

      // Articles
      if (articlesRes.status === 'fulfilled' && articlesRes.value.success) {
        setArticles(articlesRes.value.data || []);
      }

      // Conversation
      if (conversationRes.status === 'fulfilled' && conversationRes.value.success) {
        setConversation(conversationRes.value.data || null);
      }

      // Messages non lus
      if (unreadRes.status === 'fulfilled' && unreadRes.value.success) {
        setUnreadMessages(unreadRes.value.data?.count || 0);
      }

      // Wearable (si premium)
      if (user?.isPremium) {
        try {
          const wearableRes = await wearableService.getData();
          if (wearableRes.success) {
            setWearableData(wearableRes.data || null);
          }
        } catch {
          console.log('⚠️ Dashboard: Could not load wearable data');
        }
      }

      console.log('✅ Dashboard: Data loaded');
    } catch (error) {
      console.error('❌ Dashboard: Error loading data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.isPremium]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleMarkConseilAsRead = async (id: string) => {
    try {
      await conseilsService.markAsRead(id);
      setConseils(prev =>
        prev.map(c => (c.id === id ? { ...c, isRead: true } : c))
      );
    } catch (error) {
      console.error('❌ Error marking conseil as read:', error);
    }
  };

  const handleToggleArticleFavorite = async (id: string) => {
    try {
      const article = articles.find(a => a.id === id);
      if (article?.isFavorite) {
        await articlesService.removeFromFavorites(id);
      } else {
        await articlesService.addToFavorites(id);
      }
      setArticles(prev =>
        prev.map(a => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a))
      );
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

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
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {formatInitials(user?.firstName || patient?.firstName, user?.lastName || patient?.lastName)}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>
                Bonjour {user?.firstName || patient?.firstName || 'Patient'}
              </Text>
              {naturopathe && (
                <Text style={styles.naturopatheName}>
                  Suivi par {formatFullName(naturopathe.firstName, naturopathe.lastName)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Informations consultations */}
        {(lastConsultation || nextConsultation) && (
          <Card style={styles.consultationsCard}>
            <View style={styles.consultationsRow}>
              {lastConsultation && (
                <View style={styles.consultationItem}>
                  <Text style={styles.consultationLabel}>Dernière consultation</Text>
                  <Text style={styles.consultationDate}>
                    {formatDate(lastConsultation)}
                  </Text>
                </View>
              )}
              {nextConsultation && (
                <View style={styles.consultationItem}>
                  <Text style={styles.consultationLabel}>Prochaine consultation</Text>
                  <Text style={[styles.consultationDate, styles.nextConsultation]}>
                    {formatDate(nextConsultation)}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Journal du jour */}
        <JournalCard
          todayEntry={todayJournal}
          complements={complements}
          onSaved={() => {
            journalService.getTodayEntry().then(res => {
              if (res.success) setTodayJournal(res.data || null);
            });
          }}
        />

        {/* Compléments */}
        <ComplementsCard
          complements={complements}
          onRefresh={() => {
            complementsService.getTodayComplements().then(res => {
              if (res.success) setComplements(res.data || []);
            });
          }}
        />

        {/* Messages */}
        <MessagesCard
          conversation={conversation}
          naturopathe={naturopathe}
          unreadCount={unreadMessages}
          onOpenConversation={() => router.push('/(tabs)/messages')}
        />

        {/* Conseils */}
        <ConseilsCard
          conseils={conseils}
          onMarkAsRead={handleMarkConseilAsRead}
          onViewAll={() => {}}
        />

        {/* Wearable */}
        <WearableCard
          isPremium={user?.isPremium || false}
          wearableData={wearableData}
          onUpgrade={() => router.push('/(tabs)/profile')}
          onViewDetails={() => {}}
        />

        {/* Articles */}
        <ArticlesCard
          articles={articles}
          onViewArticle={(article) => {}}
          onToggleFavorite={handleToggleArticleFavorite}
          onViewAll={() => {}}
        />

        {/* Espacement bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.blanc,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  naturopatheName: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  consultationsCard: {
    marginBottom: 16,
  },
  consultationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  consultationItem: {
    alignItems: 'center',
  },
  consultationLabel: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginBottom: 4,
  },
  consultationDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  nextConsultation: {
    color: Colors.teal,
  },
  bottomSpacer: {
    height: 20,
  },
});
