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
      setData(response.data);
      setConnected(true);
    } catch (error) {
      console.error('Erreur chargement wearable:', error);
      // Mock data for demo
      setData({
        steps: 8547,
        heartRate: 72,
        sleep: 7.5,
        calories: 1850,
        lastSync: new Date().toISOString(),
      });
      setConnected(true);
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
        <Text style={styles.title}>⌚ Données connectées</Text>
        <Text style={styles.description}>
          Connectez votre montre ou bracelet connecté pour suivre vos données de santé.
        </Text>
        <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
          <Text style={styles.connectButtonText}>Connecter un appareil</Text>
        </TouchableOpacity>
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
  connectButton: {
    backgroundColor: Colors.teal,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: Colors.blanc,
    fontWeight: '600',
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
