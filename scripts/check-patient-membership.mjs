/**
 * Diagnostic script to check patient membership status.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-patient-membership.mjs
 *
 * Checks:
 *  1. Patient exists in `patients` table
 *  2. Membership exists in `patient_memberships`
 *  3. Auth user exists for that membership
 *  4. Auto-creates membership if patient exists but membership is missing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Missing env vars. Run with:\n  node --env-file=.env.local scripts/check-patient-membership.mjs'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const patientId = process.argv[2] || '679ca8c1-db86-49b0-a8d2-d4b534923705';

console.log('🔍 Verification patient:', patientId);

// 1. Patient exists?
const { data: patient, error: patientError } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patientId)
  .single();

console.log('\n📋 Patient:', patient ? '✅ Found' : '❌ Not found');
if (patientError) console.log('   Error:', patientError);
if (patient) console.log('   Data:', JSON.stringify(patient, null, 2));

// 2. Membership exists?
const { data: membership, error: membershipError } = await supabase
  .from('patient_memberships')
  .select('*')
  .eq('patient_id', patientId)
  .maybeSingle();

console.log('\n🔗 Membership:', membership ? '✅ Found' : '❌ Not found');
if (membershipError) console.log('   Error:', membershipError);
if (membership) console.log('   Data:', JSON.stringify(membership, null, 2));

// 3. Auth user exists?
if (membership?.patient_user_id) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(membership.patient_user_id);

  console.log('\n👤 Auth user:', user ? '✅ Found' : '❌ Not found');
  if (userError) console.log('   Error:', userError);
  if (user) console.log('   Email:', user.email);
}

// 4. Create membership if missing
if (patient && !membership) {
  console.log('\n⚠️  Membership missing – attempting to create...');

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const matchingUser = users.find((u) => u.email === patient.email);

  if (matchingUser) {
    const { data: newMembership, error: createError } = await supabase
      .from('patient_memberships')
      .insert({
        patient_id: patientId,
        patient_user_id: matchingUser.id,
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating membership:', createError);
    } else {
      console.log('✅ Membership created:', newMembership);
    }
  } else {
    console.log('❌ No auth user found with email:', patient.email);
  }
}
