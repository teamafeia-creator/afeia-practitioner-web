import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { Complement } from '../../types';

export default function ComplementsCard() {
  const [complements, setComplements] = useState<Complement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplements();
  }, []);

  const loadComplements = async () => {
    try {
      const data = await api.getComplements();
      setComplements(data.complements || []);
    } catch (error) {
      console.error('Erreur chargement compléments:', error);
      // Mock data for demo
      setComplements([
        {
          id: '1',
          name: 'Magnésium',
          dosage: '300mg',
          frequency: '1x/jour',
          duration: 30,
          takenToday: false,
        },
        {
          id: '2',
          name: 'Vitamine D3',
          dosage: '2000 UI',
          frequency: '1x/jour',
          duration: 60,
          takenToday: true,
        },
        {
          id: '3',
          name: 'Oméga 3',
          dosage: '1000mg',
          frequency: '2x/jour',
          duration: 90,
          takenToday: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (complementId: string, taken: boolean) => {
    try {
      await api.trackComplement(complementId, !taken);
      loadComplements();
    } catch (error) {
      // Optimistic update
      setComplements((prev) =>
        prev.map((c) =>
          c.id === complementId ? { ...c, takenToday: !taken } : c
        )
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>💊 Mes Compléments</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>💊 Mes Compléments</Text>
      {complements.length === 0 ? (
        <Text style={styles.empty}>Aucun complément prescrit</Text>
      ) : (
        complements.map((comp) => (
          <View key={comp.id} style={styles.item}>
            <View style={styles.info}>
              <Text style={styles.name}>{comp.name}</Text>
              <Text style={styles.details}>
                {comp.dosage} • {comp.frequency}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkbox, comp.takenToday && styles.checked]}
              onPress={() => handleToggle(comp.id, comp.takenToday)}
            >
              {comp.takenToday && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.teal,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: Colors.teal,
  },
  checkmark: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
