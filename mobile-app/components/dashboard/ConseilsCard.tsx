import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { Conseil } from '../../types';

export default function ConseilsCard() {
  const [conseils, setConseils] = useState<Conseil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConseils();
  }, []);

  const loadConseils = async () => {
    try {
      const data = await api.getConseils();
      setConseils(data.conseils || []);
    } catch (error) {
      console.error('Erreur chargement conseils:', error);
      // Ne pas utiliser de donnees mockees - afficher une liste vide
      setConseils([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (conseilId: string) => {
    try {
      await api.markConseilRead(conseilId);
      setConseils((prev) =>
        prev.map((c) => (c.id === conseilId ? { ...c, read: true } : c))
      );
    } catch (error) {
      // Optimistic update
      setConseils((prev) =>
        prev.map((c) => (c.id === conseilId ? { ...c, read: true } : c))
      );
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category.toLowerCase()) {
      case 'alimentation':
        return '🥗';
      case 'sommeil':
        return '😴';
      case 'exercice':
        return '🏃';
      case 'stress':
        return '🧘';
      default:
        return '💡';
    }
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>💡 Conseils de votre naturopathe</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>💡 Conseils de votre naturopathe</Text>
      {conseils.length === 0 ? (
        <Text style={styles.empty}>Aucun conseil pour le moment</Text>
      ) : (
        conseils.slice(0, 3).map((conseil) => (
          <TouchableOpacity
            key={conseil.id}
            style={[styles.item, !conseil.read && styles.unread]}
            onPress={() => handleMarkRead(conseil.id)}
          >
            <Text style={styles.emoji}>{getCategoryEmoji(conseil.category)}</Text>
            <View style={styles.content}>
              <Text style={styles.conseilTitle}>{conseil.title}</Text>
              <Text style={styles.category}>{conseil.category}</Text>
            </View>
            {!conseil.read && <View style={styles.badge} />}
          </TouchableOpacity>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 15,
  },
  loading: {
    color: Colors.grisChaud,
  },
  empty: {
    color: Colors.grisChaud,
    fontStyle: 'italic',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unread: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  conseilTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  category: {
    fontSize: 13,
    color: Colors.grisChaud,
  },
  badge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dore,
  },
});
