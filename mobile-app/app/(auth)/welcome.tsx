import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, spacing, fontSize } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>AFEIA</Text>
          <Text style={styles.subtitle}>
            Votre espace de suivi naturopathique
          </Text>
        </View>

        <View style={styles.illustration}>
          <View style={styles.illustrationCircle}>
            <Text style={styles.illustrationIcon}>&#x1F33F;</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Suivez vos soins, communiquez avec votre naturopathe et prenez soin de
          votre bien-être au quotidien.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="J'ai un code d'activation"
          onPress={() => router.push('/(auth)/activate')}
          variant="primary"
          size="lg"
          fullWidth
        />
        <Button
          title="J'ai déjà un compte"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand[50],
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.primary[700],
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    marginTop: spacing.sm,
  },
  illustration: {
    marginVertical: spacing['2xl'],
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationIcon: {
    fontSize: 56,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
});
