import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import { complementsService } from '../../services/api/complements';
import type { Complement } from '../../types';

interface ComplementsCardProps {
  complements: Complement[];
  onRefresh: () => void;
}

export const ComplementsCard: React.FC<ComplementsCardProps> = ({
  complements,
  onRefresh,
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleComplement = async (complement: Complement) => {
    try {
      setLoading(complement.id);
      await complementsService.track(complement.id, !complement.takenToday);
      onRefresh();
    } catch (error) {
      console.error('❌ Error tracking complement:', error);
    } finally {
      setLoading(null);
    }
  };

  if (complements.length === 0) {
    return (
      <Card title="Mes compléments" subtitle="Aujourd'hui">
        <Text style={styles.emptyText}>
          Aucun complément prescrit pour le moment
        </Text>
      </Card>
    );
  }

  return (
    <Card
      title="Mes compléments"
      subtitle={`${complements.filter(c => c.takenToday).length}/${complements.length} pris aujourd'hui`}
    >
      {complements.map((complement) => (
        <TouchableOpacity
          key={complement.id}
          style={styles.complementItem}
          onPress={() => handleToggleComplement(complement)}
          disabled={loading === complement.id}
        >
          <View
            style={[
              styles.checkbox,
              complement.takenToday && styles.checkboxChecked,
            ]}
          >
            {complement.takenToday && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.complementInfo}>
            <Text style={styles.complementName}>{complement.name}</Text>
            <Text style={styles.complementDetails}>
              {complement.dosage} • {complement.frequency}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${complement.progressPercent}%` },
              ]}
            />
            <Text style={styles.daysRemaining}>
              J{complement.daysRemaining}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <Button
        title="Voir l'historique"
        onPress={() => {}}
        variant="ghost"
        size="small"
        style={styles.historyButton}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    paddingVertical: 16,
  },
  complementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sable,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.grisChaud,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  checkmark: {
    color: Colors.blanc,
    fontSize: 14,
    fontWeight: '700',
  },
  complementInfo: {
    flex: 1,
  },
  complementName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  complementDetails: {
    fontSize: 13,
    color: Colors.grisChaud,
  },
  progressContainer: {
    width: 50,
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.teal,
    borderRadius: 2,
    marginBottom: 4,
  },
  daysRemaining: {
    fontSize: 11,
    color: Colors.grisChaud,
  },
  historyButton: {
    marginTop: 12,
  },
});

export default ComplementsCard;
