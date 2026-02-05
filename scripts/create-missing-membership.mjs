/**
 * Create a missing patient_membership record.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-missing-membership.mjs <patientId> <email>
 *
 * Example:
 *   node --env-file=.env.local scripts/create-missing-membership.mjs \
 *     679ca8c1-db86-49b0-a8d2-d4b534923705 pauline@bibouche.fr
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Missing env vars. Run with:\n  node --env-file=.env.local scripts/create-missing-membership.mjs <patientId> <email>'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const patientId = process.argv[2] || '679ca8c1-db86-49b0-a8d2-d4b534923705';
const userEmail = process.argv[3] || '';

console.log('🔧 Creating missing membership...\n');

// 1. Fetch the patient
const { data: patient, error: patientError } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patientId)
  .single();

if (patientError || !patient) {
  console.log('❌ Patient not found:', patientId, patientError?.message);
  process.exit(1);
}

console.log('📋 Patient:', patient.name, patient.email);

const emailToSearch = userEmail || patient.email;

// 2. Find the auth user
const { data: { users } } = await supabase.auth.admin.listUsers();
const matchingUser = users.find((u) => u.email === emailToSearch);

console.log('👤 Auth user:', matchingUser ? matchingUser.id : 'Not found');

if (!matchingUser) {
  console.log('❌ No auth user found for email:', emailToSearch);
  console.log('   The account may not have been activated correctly.');
  process.exit(1);
}

// 3. Check if membership already exists
const { data: existing } = await supabase
  .from('patient_memberships')
  .select('*')
  .eq('patient_id', patientId)
  .maybeSingle();

if (existing) {
  console.log('⚠️  Membership already exists:', existing);
  process.exit(0);
}

// 4. Create the membership
const { data: newMembership, error } = await supabase
  .from('patient_memberships')
  .insert({
    patient_id: patientId,
    patient_user_id: matchingUser.id,
  })
  .select()
  .single();

if (error) {
  console.log('❌ Error creating membership:', error);
  process.exit(1);
}

console.log('✅ Membership created:', newMembership);
console.log('\nThe patient can now connect to the mobile app.');
