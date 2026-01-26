import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import type { WearableData } from '../../types';

interface WearableCardProps {
  isPremium: boolean;
  wearableData: WearableData | null;
  onUpgrade: () => void;
  onViewDetails: () => void;
}

export const WearableCard: React.FC<WearableCardProps> = ({
  isPremium,
  wearableData,
  onUpgrade,
  onViewDetails,
}) => {
  // Affichage non-premium
  if (!isPremium) {
    return (
      <Card>
        <View style={styles.premiumContainer}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
          <Text style={styles.premiumTitle}>Bague connectée</Text>
          <Text style={styles.premiumDescription}>
            Connectez votre bague Oura, Circular ou autre pour suivre votre
            sommeil, fréquence cardiaque et HRV en temps réel.
          </Text>
          <Button
            title="Découvrir Premium"
            onPress={onUpgrade}
            variant="primary"
            fullWidth
          />
        </View>
      </Card>
    );
  }

  // Affichage premium sans données
  if (!wearableData?.connected) {
    return (
      <Card title="Bague connectée" subtitle="Non connectée">
        <Text style={styles.notConnectedText}>
          Connectez votre bague pour synchroniser vos données de santé.
        </Text>
        <Button
          title="Connecter ma bague"
          onPress={() => {}}
          variant="outline"
          fullWidth
        />
      </Card>
    );
  }

  // Affichage premium avec données
  return (
    <Card
      title="Bague connectée"
      subtitle={`Sync: ${wearableData.lastSync || 'Récemment'}`}
      headerRight={
        <Button
          title="Détails"
          onPress={onViewDetails}
          variant="ghost"
          size="small"
        />
      }
    >
      <View style={styles.metricsGrid}>
        {/* Sommeil */}
        {wearableData.sleep && (
          <MetricItem
            icon="😴"
            label="Sommeil"
            value={`${Math.floor(wearableData.sleep.duration / 60)}h${wearableData.sleep.duration % 60}min`}
            subtitle={`Score: ${wearableData.sleep.score}/100`}
          />
        )}

        {/* Fréquence cardiaque */}
        {wearableData.heartRate && (
          <MetricItem
            icon="❤️"
            label="FC moyenne"
            value={`${wearableData.heartRate.average} bpm`}
            subtitle={`${wearableData.heartRate.min}-${wearableData.heartRate.max} bpm`}
          />
        )}

        {/* HRV */}
        {wearableData.hrv && (
          <MetricItem
            icon="📈"
            label="HRV"
            value={`${wearableData.hrv.value} ms`}
            subtitle={wearableData.hrv.trend === 'up' ? '↑ En hausse' : wearableData.hrv.trend === 'down' ? '↓ En baisse' : '→ Stable'}
          />
        )}

        {/* Activité */}
        {wearableData.activity && (
          <MetricItem
            icon="👟"
            label="Pas"
            value={`${wearableData.activity.steps.toLocaleString()}`}
            subtitle={`Objectif: ${wearableData.activity.goal.toLocaleString()}`}
          />
        )}
      </View>
    </Card>
  );
};

const MetricItem: React.FC<{
  icon: string;
  label: string;
  value: string;
  subtitle: string;
}> = ({ icon, label, value, subtitle }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  premiumContainer: {
    alignItems: 'center',
    padding: 8,
  },
  premiumBadge: {
    backgroundColor: Colors.aubergine,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  premiumBadgeText: {
    color: Colors.blanc,
    fontSize: 12,
    fontWeight: '600',
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  notConnectedText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.grisChaud,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  metricSubtitle: {
    fontSize: 11,
    color: Colors.grisChaud,
  },
});

export default WearableCard;
