/**
 * AFEIA Mobile App - Configuration Diagnostic Script
 *
 * Usage: node scripts/check-config.js
 *
 * This script checks that the mobile app environment is properly configured.
 */

const fs = require('fs');
const path = require('path');

console.log('\n============================================');
console.log('  Diagnostic Configuration App Mobile AFEIA');
console.log('============================================\n');

// 1. Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envExists = fs.existsSync(envPath);

console.log('1. Fichier .env:', envExists ? '  OK' : '  MANQUANT');

if (!envExists) {
  console.log('\n   PROBLEME : Le fichier mobile-app/.env n\'existe pas !');
  console.log('   Solution : Copiez .env.example vers .env et remplissez les valeurs\n');
  console.log('   Commande : cp .env.example .env\n');

  if (fs.existsSync(envExamplePath)) {
    console.log('   Contenu de .env.example pour reference :');
    console.log('   ' + '-'.repeat(40));
    const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
    exampleContent.split('\n').forEach((line) => {
      console.log('   ' + line);
    });
    console.log('   ' + '-'.repeat(40));
  }

  process.exit(1);
}

// 2. Read .env content
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

const config = {};
lines.forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      config[key] = value;
    }
  }
});

// 3. Check required variables
const requiredVars = [
  { name: 'EXPO_PUBLIC_SUPABASE_URL', sensitive: false },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', sensitive: true },
  { name: 'EXPO_PUBLIC_API_URL', sensitive: false },
];

console.log('\n2. Variables d\'environnement :\n');

let hasErrors = false;

requiredVars.forEach(({ name, sensitive }) => {
  const value = config[name];
  const exists = value !== undefined && value !== '';

  if (!exists) {
    console.log(`   ${name}:`);
    console.log(`      MANQUANTE ou VIDE`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const displayValue = sensitive ? value.substring(0, 20) + '...' : value;
    console.log(`   ${name}:`);
    console.log(`      OK - ${displayValue}`);
  }
});

// 4. Specific validations
console.log('\n3. Validations specifiques :\n');

if (config.EXPO_PUBLIC_API_URL) {
  const apiUrl = config.EXPO_PUBLIC_API_URL;

  // Check for localhost (won't work with Expo Go on phone)
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    console.log('   API URL contient "localhost" ou "127.0.0.1"');
    console.log('      ATTENTION : Ne fonctionnera pas avec Expo Go sur telephone !');
    console.log('      Utilisez votre IP locale (ex: http://192.168.1.X:PORT)');
    console.log('      Trouvez votre IP avec : ipconfig (Win) ou ifconfig (Mac/Linux)\n');
    hasErrors = true;
  } else {
    console.log('   API URL ne contient pas localhost:  OK');
  }

  // Check protocol
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    console.log('   API URL doit commencer par http:// ou https://');
    console.log('      ERREUR : Format invalide\n');
    hasErrors = true;
  } else {
    console.log('   API URL a un protocole valide:  OK');
  }

  // Check for placeholder
  if (apiUrl.includes('XXX') || apiUrl.includes('your-')) {
    console.log('   API URL contient un placeholder (XXX ou your-)');
    console.log('      ERREUR : Remplacez par votre vraie IP locale\n');
    hasErrors = true;
  } else {
    console.log('   API URL ne contient pas de placeholder:  OK');
  }
}

if (config.EXPO_PUBLIC_SUPABASE_URL) {
  if (!config.EXPO_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    console.log('   Supabase URL ne contient pas "supabase.co"');
    console.log('      ATTENTION : Verifiez l\'URL Supabase\n');
  } else {
    console.log('   Supabase URL valide:  OK');
  }
}

// 5. Final result
console.log('\n============================================');
if (hasErrors) {
  console.log('  RESULTAT : Configuration INCORRECTE');
  console.log('  Corrigez les erreurs ci-dessus');
  console.log('============================================\n');
  process.exit(1);
} else {
  console.log('  RESULTAT : Configuration CORRECTE');
  console.log('  L\'app devrait fonctionner !');
  console.log('============================================\n');
  console.log('Prochaine etape : npx expo start --clear\n');
  process.exit(0);
}
