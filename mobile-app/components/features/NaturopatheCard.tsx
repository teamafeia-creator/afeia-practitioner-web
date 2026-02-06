import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Naturopathe } from '../../types';
import { formatDate } from '../../utils/dates';
import { colors, spacing, fontSize } from '../../constants/theme';

interface NaturopatheCardProps {
  naturopathe: Naturopathe;
  nextConsultation?: string;
  calendlyUrl?: string;
}

export function NaturopatheCard({
  naturopathe,
  nextConsultation,
  calendlyUrl,
}: NaturopatheCardProps) {
  const handleBooking = () => {
    if (calendlyUrl) {
      Linking.openURL(calendlyUrl);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <View style={styles.header}>
        <Avatar
          name={naturopathe.fullName}
          imageUrl={naturopathe.avatarUrl}
          size={52}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{naturopathe.fullName}</Text>
          <Text style={styles.role}>Votre naturopathe</Text>
        </View>
      </View>

      {nextConsultation && (
        <View style={styles.consultation}>
          <Text style={styles.consultationLabel}>Prochain rendez-vous</Text>
          <Text style={styles.consultationDate}>
            {formatDate(nextConsultation)}
          </Text>
        </View>
      )}

      {calendlyUrl && (
        <Button
          title="Prendre rendez-vous"
          onPress={handleBooking}
          variant="outline"
          size="sm"
          fullWidth
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  role: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginTop: 2,
  },
  consultation: {
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  consultationLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consultationDate: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary[700],
    marginTop: 2,
  },
});
