import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Bienvenue sur AFEIA</Text>
      <Text style={styles.subtitle}>Votre tableau de bord</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accueil</Text>
        <Text style={styles.cardText}>
          Dashboard fonctionnel. Les autres fonctionnalités seront ajoutées progressivement.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.teal,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.charcoal,
    marginBottom: 30,
  },
  card: {
    backgroundColor: Colors.blanc,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: Colors.charcoal,
  },
});
