/**
 * Diagnostic script to check consultant membership status.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-consultant-membership.mjs
 *
 * Checks:
 *  1. Consultant exists in `consultants` table
 *  2. Membership exists in `consultant_memberships`
 *  3. Auth user exists for that membership
 *  4. Auto-creates membership if consultant exists but membership is missing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Missing env vars. Run with:\n  node --env-file=.env.local scripts/check-consultant-membership.mjs'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const consultantId = process.argv[2] || '679ca8c1-db86-49b0-a8d2-d4b534923705';

console.log('🔍 Verification consultant:', consultantId);

// 1. Consultant exists?
const { data: consultant, error: consultantError } = await supabase
  .from('consultants')
  .select('*')
  .eq('id', consultantId)
  .single();

console.log('\n📋 Consultant:', consultant ? '✅ Found' : '❌ Not found');
if (consultantError) console.log('   Error:', consultantError);
if (consultant) console.log('   Data:', JSON.stringify(consultant, null, 2));

// 2. Membership exists?
const { data: membership, error: membershipError } = await supabase
  .from('consultant_memberships')
  .select('*')
  .eq('consultant_id', consultantId)
  .maybeSingle();

console.log('\n🔗 Membership:', membership ? '✅ Found' : '❌ Not found');
if (membershipError) console.log('   Error:', membershipError);
if (membership) console.log('   Data:', JSON.stringify(membership, null, 2));

// 3. Auth user exists?
if (membership?.consultant_user_id) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(membership.consultant_user_id);

  console.log('\n👤 Auth user:', user ? '✅ Found' : '❌ Not found');
  if (userError) console.log('   Error:', userError);
  if (user) console.log('   Email:', user.email);
}

// 4. Create membership if missing
if (consultant && !membership) {
  console.log('\n⚠️  Membership missing – attempting to create...');

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const matchingUser = users.find((u) => u.email === consultant.email);

  if (matchingUser) {
    const { data: newMembership, error: createError } = await supabase
      .from('consultant_memberships')
      .insert({
        consultant_id: consultantId,
        consultant_user_id: matchingUser.id,
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating membership:', createError);
    } else {
      console.log('✅ Membership created:', newMembership);
    }
  } else {
    console.log('❌ No auth user found with email:', consultant.email);
  }
}
