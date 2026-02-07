import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables Supabase manquantes');
  console.error('   Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis');
  console.error('   Vous pouvez les définir dans .env.local ou en variables d\'environnement');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestData() {
  console.log('🌱 Seed des données de test...\n');

  try {
    // 1. Vérifier si un praticien existe déjà
    const { data: existingPractitioners, error: practError } = await supabase
      .from('practitioners')
      .select('id, email, full_name')
      .limit(1);

    if (practError) {
      console.error('❌ Erreur lors de la vérification des praticiens:', practError.message);
      process.exit(1);
    }

    if (existingPractitioners && existingPractitioners.length > 0) {
      console.log('✅ Des praticiens existent déjà dans la base');
      console.log('   Email:', existingPractitioners[0].email);
      console.log('   Nom:', existingPractitioners[0].full_name);

      // Créer des consultants de test pour ce praticien
      const practitionerId = existingPractitioners[0].id;
      await createTestConsultants(practitionerId);
    } else {
      console.log('ℹ️  Aucun praticien trouvé. Créez-en un via le dashboard web d\'abord.');
      console.log('   Ou utilisez /api/admin/invite-practitioner pour inviter un praticien.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

async function createTestConsultants(practitionerId) {
  console.log('\n📋 Création de consultants de test...');

  const testConsultants = [
    {
      practitioner_id: practitionerId,
      name: 'Sophie Martin',
      email: 'sophie.martin@example.com',
      phone: '+33612345678',
      age: 32,
      city: 'Paris',
      status: 'premium',
      is_premium: true,
      activated: true,
      activated_at: new Date().toISOString(),
    },
    {
      practitioner_id: practitionerId,
      name: 'Lucas Dubois',
      email: 'lucas.dubois@example.com',
      phone: '+33687654321',
      age: 28,
      city: 'Lyon',
      status: 'standard',
      is_premium: false,
      activated: true,
      activated_at: new Date().toISOString(),
    },
    {
      practitioner_id: practitionerId,
      name: 'Emma Lefebvre',
      email: 'emma.lefebvre@example.com',
      phone: '+33698765432',
      age: 45,
      city: 'Marseille',
      status: 'standard',
      is_premium: false,
      activated: false,
    },
  ];

  for (const consultant of testConsultants) {
    // Vérifier si le consultant existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('consultants')
      .select('id')
      .eq('email', consultant.email)
      .maybeSingle();

    if (checkError) {
      console.error(`   ❌ Erreur vérification ${consultant.name}:`, checkError.message);
      continue;
    }

    if (!existing) {
      const { data, error } = await supabase
        .from('consultants')
        .insert(consultant)
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Erreur création ${consultant.name}:`, error.message);
      } else {
        console.log(`   ✅ Consultant créé: ${consultant.name} (${data.id})`);
      }
    } else {
      console.log(`   ℹ️  Consultant existe déjà: ${consultant.name}`);
    }
  }
}

// Exécuter le seed
seedTestData()
  .then(() => {
    console.log('\n✅ Seed terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur seed:', error);
    process.exit(1);
  });
