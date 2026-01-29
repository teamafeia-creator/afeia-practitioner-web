import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';

interface JournalCardProps {
  onPress?: () => void;
}

export default function JournalCard({ onPress }: JournalCardProps) {
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const entry = await api.getTodayJournal();
      setTodayEntry(entry);
    } catch (error) {
      console.error('Erreur chargement journal:', error);
      setTodayEntry(null);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 8) return '😄';
    if (mood >= 6) return '🙂';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😕';
    return '😢';
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>📔 Journal du jour</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>📔 Journal du jour</Text>
      {todayEntry ? (
        <View style={styles.summary}>
          <View style={styles.moodRow}>
            <Text style={styles.moodEmoji}>{getMoodEmoji(todayEntry.mood)}</Text>
            <View>
              <Text style={styles.moodLabel}>Humeur</Text>
              <Text style={styles.moodValue}>{todayEntry.mood}/10</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{todayEntry.sleep}h</Text>
              <Text style={styles.statLabel}>Sommeil</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{todayEntry.energy}/10</Text>
              <Text style={styles.statLabel}>Énergie</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{todayEntry.alimentation}/10</Text>
              <Text style={styles.statLabel}>Alimentation</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noEntry}>
          <Text style={styles.noEntryText}>
            Vous n'avez pas encore rempli votre journal aujourd'hui
          </Text>
          <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.buttonText}>Remplir maintenant</Text>
          </TouchableOpacity>
        </View>
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
  summary: {
    gap: 15,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodEmoji: {
    fontSize: 40,
  },
  moodLabel: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  moodValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  noEntry: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  noEntryText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: Colors.dore,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.blanc,
    fontWeight: '600',
    fontSize: 14,
  },
});
