import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get variables from app.config.js extra (most reliable for Expo)
// Falls back to process.env for development
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Debug: Log configuration status
console.log('═══════════════════════════════════════');
console.log('🔍 Configuration Supabase:');
console.log('URL présente:', !!supabaseUrl);
console.log('URL value:', supabaseUrl);
console.log('Key présente:', !!supabaseAnonKey);
console.log('Key preview:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'MANQUANTE');
console.log('═══════════════════════════════════════');

// Strict validation
if (!supabaseUrl) {
  throw new Error(
    '❌ EXPO_PUBLIC_SUPABASE_URL manquante!\n' +
    'Vérifiez que:\n' +
    '1. Le fichier .env existe dans mobile-app/\n' +
    '2. La variable commence par EXPO_PUBLIC_\n' +
    '3. Le serveur Expo a été redémarré avec: npx expo start -c'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '❌ EXPO_PUBLIC_SUPABASE_ANON_KEY manquante!\n' +
    'Vérifiez votre fichier .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

console.log('✅ Client Supabase initialisé avec succès!');
