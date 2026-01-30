import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { WearableData } from '../../types';

export default function WearableCard() {
  const [data, setData] = useState<WearableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadWearableData();
  }, []);

  const loadWearableData = async () => {
    try {
      const response = await api.getWearableData();
      if (response.data) {
        setData(response.data);
        setConnected(true);
      } else {
        // Pas de donnees - fonctionnalite a venir
        setData(null);
        setConnected(false);
      }
    } catch (error) {
      console.error('Erreur chargement wearable:', error);
      // Ne pas utiliser de donnees mockees
      setData(null);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // TODO: Implement wearable connection flow
    console.log('Connect wearable');
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>⌚ Données connectées</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  if (!connected || !data) {
    return (
      <Card>
        <Text style={styles.title}>⌚ Donnees connectees</Text>
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonEmoji}>🔜</Text>
          <Text style={styles.comingSoonText}>Prochainement</Text>
          <Text style={styles.description}>
            La connexion avec votre montre ou bracelet connecte sera bientot disponible.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>⌚ Données connectées</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statEmoji}>👟</Text>
          <Text style={styles.statValue}>{data.steps.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Pas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statEmoji}>❤️</Text>
          <Text style={styles.statValue}>{data.heartRate}</Text>
          <Text style={styles.statLabel}>BPM</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statEmoji}>😴</Text>
          <Text style={styles.statValue}>{data.sleep}h</Text>
          <Text style={styles.statLabel}>Sommeil</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{data.calories}</Text>
          <Text style={styles.statLabel}>kcal</Text>
        </View>
      </View>
      {data.lastSync && (
        <Text style={styles.lastSync}>
          Dernière sync : {new Date(data.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
  description: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginBottom: 15,
    lineHeight: 20,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  comingSoonEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginTop: 2,
  },
  lastSync: {
    fontSize: 11,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginTop: 15,
  },
});
