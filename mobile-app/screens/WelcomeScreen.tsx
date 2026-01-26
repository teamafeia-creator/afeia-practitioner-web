import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue chez AFEIA</Text>
      <Text style={styles.subtitle}>
        Votre accompagnement naturopathique personnalisé
      </Text>
      <TouchableOpacity style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>Commencer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.sable,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.teal,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: Colors.dore,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.blanc,
    fontSize: 18,
    fontWeight: '600',
  },
});
