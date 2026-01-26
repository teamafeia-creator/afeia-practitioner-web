/**
 * Anamnese Complete Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';

export default function CompleteScreen() {
  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.state.success} />
        </View>

        <Text style={styles.title}>Merci !</Text>
        <Text style={styles.subtitle}>
          Votre questionnaire a bien été envoyé à votre naturopathe.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary.teal} />
          <Text style={styles.infoText}>
            Ces informations permettront de préparer une séance personnalisée et adaptée à votre rythme et à vos besoins.
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Vous pouvez maintenant :</Text>
          <FeatureItem icon="calendar-outline" text="Voir vos prochains rendez-vous" />
          <FeatureItem icon="medical-outline" text="Suivre vos compléments alimentaires" />
          <FeatureItem icon="book-outline" text="Tenir votre journal quotidien" />
          <FeatureItem icon="chatbubble-outline" text="Communiquer avec votre naturopathe" />
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleContinue}
          style={styles.button}
        >
          Accéder à mon espace
        </Button>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={Colors.primary.teal} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h1,
    color: Theme.text,
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...TextStyles.bodyLarge,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.tealPale,
    padding: Spacing.base,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  infoText: {
    ...TextStyles.body,
    color: Colors.primary.tealDeep,
    flex: 1,
    marginLeft: Spacing.md,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: Spacing.xl,
  },
  featuresTitle: {
    ...TextStyles.label,
    color: Theme.text,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  featureText: {
    ...TextStyles.body,
    color: Theme.text,
    marginLeft: Spacing.md,
  },
  button: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
});
