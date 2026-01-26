/**
 * Welcome Screen
 * First screen users see when opening the app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui';
import { Colors, Theme, Spacing, TextStyles } from '@/constants';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const handleStart = () => {
    router.push('/(auth)/otp');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>AFEIA</Text>
            <Text style={styles.logoSubtext}>Naturopathie</Text>
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Bienvenue dans votre espace AFEIA</Text>
          <Text style={styles.subtitle}>
            Votre accompagnement naturopathique personnalisé, accessible à tout moment.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="📋"
            text="Suivez vos recommandations personnalisées"
          />
          <FeatureItem
            icon="💊"
            text="Gérez vos compléments alimentaires"
          />
          <FeatureItem
            icon="📔"
            text="Tenez votre journal de bien-être"
          />
          <FeatureItem
            icon="💬"
            text="Communiquez avec votre naturopathe"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleStart}
          >
            Commencer
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onPress={handleLogin}
            style={styles.loginButton}
          >
            J'ai déjà un compte
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
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
    paddingTop: height * 0.08,
    paddingBottom: Spacing.xl,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary.teal,
    letterSpacing: 4,
  },
  logoSubtext: {
    ...TextStyles.body,
    color: Theme.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: 2,
  },

  // Text
  textSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    ...TextStyles.h2,
    color: Theme.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...TextStyles.bodyLarge,
    color: Theme.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Features
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.sand,
    padding: Spacing.base,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureText: {
    ...TextStyles.body,
    color: Theme.text,
    flex: 1,
  },

  // Actions
  actionSection: {
    paddingTop: Spacing.xl,
  },
  loginButton: {
    marginTop: Spacing.md,
  },
});
