import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { Message } from '../../types';

interface MessagesCardProps {
  onPress?: () => void;
}

export default function MessagesCard({ onPress }: MessagesCardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [naturopathe, setNaturopathe] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [messagesData, naturoData] = await Promise.all([
        api.getMessages(),
        api.getNaturopatheInfo(),
      ]);
      setMessages(messagesData.messages || []);
      setNaturopathe(naturoData);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      // En cas d'erreur, on affiche une liste vide (pas de mock)
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>💬 Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Aucun message</Text>
        ) : (
          messages.slice(0, 2).map((message) => (
            <View key={message.id} style={[styles.message, !message.read && styles.unread]}>
              <View style={styles.messageHeader}>
                <Text style={styles.sender}>
                  {message.senderId === 'patient' ? 'Vous' : (naturopathe?.fullName || 'Naturopathe')}
                </Text>
                <Text style={styles.date}>{formatDate(message.timestamp)}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {message.content}
              </Text>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.viewAll} onPress={onPress}>
          <Text style={styles.viewAllText}>Voir tous les messages →</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
  },
  badge: {
    backgroundColor: Colors.dore,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.blanc,
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    color: Colors.grisChaud,
  },
  empty: {
    color: Colors.grisChaud,
    fontStyle: 'italic',
  },
  message: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unread: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  date: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
  preview: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  viewAll: {
    marginTop: 15,
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.teal,
    fontWeight: '500',
  },
});
