import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const handleStart = () => {
    console.log('✅ Welcome: Starting...');
    router.push('/(auth)/otp');
  };

  const handleLogin = () => {
    console.log('✅ Welcome: Going to login');
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo et branding */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>AFEIA</Text>
          </View>
          <Text style={styles.title}>AFEIA Patient</Text>
          <Text style={styles.subtitle}>
            Votre compagnon naturopathie
          </Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Suivez vos compléments, remplissez votre journal quotidien et restez
            en contact avec votre naturopathe pour un accompagnement personnalisé.
          </Text>
        </View>

        {/* Caractéristiques */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="💊"
            text="Suivi de vos compléments alimentaires"
          />
          <FeatureItem
            icon="📔"
            text="Journal quotidien de bien-être"
          />
          <FeatureItem
            icon="💬"
            text="Messagerie avec votre naturopathe"
          />
          <FeatureItem
            icon="📊"
            text="Visualisation de vos progrès"
          />
        </View>
      </View>

      {/* Boutons */}
      <View style={styles.buttonsContainer}>
        <Button
          title="Commencer avec mon code"
          onPress={handleStart}
          variant="primary"
          fullWidth
          size="large"
        />
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Déjà un compte ? </Text>
          <Button
            title="Se connecter"
            onPress={handleLogin}
            variant="ghost"
            size="small"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.blanc,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.grisChaud,
    textAlign: 'center',
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    color: Colors.charcoal,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    backgroundColor: Colors.blanc,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
});
