/**
 * Create a missing consultant_membership record.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-missing-membership.mjs <consultantId> <email>
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
    '❌ Missing env vars. Run with:\n  node --env-file=.env.local scripts/create-missing-membership.mjs <consultantId> <email>'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const consultantId = process.argv[2] || '679ca8c1-db86-49b0-a8d2-d4b534923705';
const userEmail = process.argv[3] || '';

console.log('🔧 Creating missing membership...\n');

// 1. Fetch the consultant
const { data: consultant, error: consultantError } = await supabase
  .from('consultants')
  .select('*')
  .eq('id', consultantId)
  .single();

if (consultantError || !consultant) {
  console.log('❌ Consultant not found:', consultantId, consultantError?.message);
  process.exit(1);
}

console.log('📋 Consultant:', consultant.name, consultant.email);

const emailToSearch = userEmail || consultant.email;

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
  .from('consultant_memberships')
  .select('*')
  .eq('consultant_id', consultantId)
  .maybeSingle();

if (existing) {
  console.log('⚠️  Membership already exists:', existing);
  process.exit(0);
}

// 4. Create the membership
const { data: newMembership, error } = await supabase
  .from('consultant_memberships')
  .insert({
    consultant_id: consultantId,
    consultant_user_id: matchingUser.id,
  })
  .select()
  .single();

if (error) {
  console.log('❌ Error creating membership:', error);
  process.exit(1);
}

console.log('✅ Membership created:', newMembership);
console.log('\nThe consultant can now connect to the mobile app.');
