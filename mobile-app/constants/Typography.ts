import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const Typography = StyleSheet.create({
  // Titres
  h1: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.charcoal,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.charcoal,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.charcoal,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.charcoal,
    lineHeight: 24,
  },

  // Corps de texte
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.charcoal,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.grisChaud,
    lineHeight: 20,
  },

  // Labels
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.charcoal,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.grisChaud,
    lineHeight: 16,
  },

  // Boutons
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Liens
  link: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.teal,
    lineHeight: 24,
    textDecorationLine: 'underline',
  },

  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.grisChaud,
    lineHeight: 16,
  },
});

export default Typography;
