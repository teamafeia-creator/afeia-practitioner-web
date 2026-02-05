import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldlojanehidmykveuqop.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbG9qYW5laGlkbXlrdmV1cW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA2OTI4MiwiZXhwIjoyMDg0NjQ1MjgyfQ.Yf7p9aY16T7HHt3P1xeR87SLdcAO5kijxAoQy7mdq-w'
);

console.log('🔧 Assignation praticien urgent\n');

// Trouver TOUS les patients sans praticien
const { data: patientsWithoutPractitioner } = await supabase
  .from('patients')
  .select('id, email, name')
  .is('practitioner_id', null);

console.log('Patients sans praticien:', patientsWithoutPractitioner?.length || 0);

if (!patientsWithoutPractitioner || patientsWithoutPractitioner.length === 0) {
  console.log('✅ Tous les patients ont un praticien !');
  process.exit(0);
}

// Trouver le praticien par defaut
const { data: practitioners } = await supabase
  .from('practitioners')
  .select('id, full_name, email')
  .order('created_at', { ascending: true })
  .limit(1);

if (!practitioners?.[0]) {
  console.log('❌ Aucun praticien dans la base !');
  process.exit(1);
}

const practitioner = practitioners[0];
console.log('\n👨‍⚕️ Praticien par defaut:', practitioner.full_name, '-', practitioner.email);

// Assigner a tous
for (const patient of patientsWithoutPractitioner) {
  const { error } = await supabase
    .from('patients')
    .update({ practitioner_id: practitioner.id })
    .eq('id', patient.id);

  if (error) {
    console.log('   ❌', patient.email, '- Erreur:', error.message);
  } else {
    console.log('   ✅', patient.email);
  }
}

console.log('\n🎉 Termine !');
