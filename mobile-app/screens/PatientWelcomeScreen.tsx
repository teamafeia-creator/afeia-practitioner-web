import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors } from '../constants/Colors';

interface PatientWelcomeScreenProps {
  onActivate: () => void;
  onLogin: () => void;
  onForgotPassword: () => void;
}

export default function PatientWelcomeScreen({
  onActivate,
  onLogin,
  onForgotPassword,
}: PatientWelcomeScreenProps) {
  return (
    <View style={styles.container}>
      {/* Logo placeholder - replace with actual logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>AFEIA</Text>
      </View>

      <Text style={styles.title}>Bienvenue sur AFEIA</Text>
      <Text style={styles.subtitle}>Votre espace patient</Text>

      {/* Option 1: First connection */}
      <TouchableOpacity style={[styles.card, styles.cardPrimary]} onPress={onActivate}>
        <Text style={styles.cardIcon}>🆕</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Premiere connexion</Text>
          <Text style={styles.cardSubtitle}>J'ai recu un code d'activation</Text>
        </View>
        <View style={styles.cardButton}>
          <Text style={styles.cardButtonText}>Activer mon compte</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Option 2: Already registered */}
      <TouchableOpacity style={[styles.card, styles.cardSecondary]} onPress={onLogin}>
        <Text style={styles.cardIcon}>✅</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Deja inscrit</Text>
          <Text style={styles.cardSubtitle}>Je me connecte avec mon compte</Text>
        </View>
        <View style={styles.cardButton}>
          <Text style={styles.cardButtonText}>Se connecter</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Forgot password link */}
      <TouchableOpacity onPress={onForgotPassword} style={styles.linkContainer}>
        <Text style={styles.link}>Mot de passe oublie ?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.sable,
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.teal,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.blanc,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.grisChaud,
    marginBottom: 48,
  },
  card: {
    backgroundColor: Colors.blanc,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
  },
  cardPrimary: {
    borderColor: Colors.teal,
  },
  cardSecondary: {
    borderColor: Colors.dore,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardContent: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  cardButton: {
    backgroundColor: Colors.sable,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
  },
  cardArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.teal,
    marginLeft: 8,
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    color: Colors.teal,
    textDecorationLine: 'underline',
  },
});
