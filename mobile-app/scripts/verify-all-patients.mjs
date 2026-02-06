import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldlojanehidmykveuqop.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbG9qYW5laGlkbXlrdmV1cW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA2OTI4MiwiZXhwIjoyMDg0NjQ1MjgyfQ.Yf7p9aY16T7HHt3P1xeR87SLdcAO5kijxAoQy7mdq-w'
);

console.log('🔍 Vérification de tous les patients\n');

// 1. Patients sans praticien
const { data: orphans } = await supabase
  .from('patients')
  .select('id, email, name')
  .is('practitioner_id', null);

console.log('Patients sans praticien:', orphans?.length || 0);
if (orphans && orphans.length > 0) {
  console.log('❌ PROBLÈME : Patients orphelins détectés :');
  for (const p of orphans) {
    console.log('  -', p.email || p.name);
  }
} else {
  console.log('✅ Tous les patients ont un praticien');
}

// 2. Praticiens disponibles
const { data: practitioners } = await supabase
  .from('practitioners')
  .select('id, full_name, email');

console.log('\nPraticiens dans la base:', practitioners?.length || 0);
if (practitioners && practitioners.length > 0) {
  console.log('✅ Praticiens :');
  for (const p of practitioners) {
    console.log('  -', p.full_name, '-', p.email);
  }
} else {
  console.log('❌ AUCUN praticien dans la base !');
}

console.log('\n✅ Vérification terminée');
