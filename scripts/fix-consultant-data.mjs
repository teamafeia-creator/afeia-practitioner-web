/**
 * Comprehensive consultant data maintenance script.
 *
 * Checks and auto-fixes:
 *  1. Consultants without a practitioner assigned
 *  2. Consultants not activated
 *  3. Missing consultant_memberships (links auth users to consultant records)
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-consultant-data.mjs
 *
 * Add --dry-run to preview changes without writing:
 *   node --env-file=.env.local scripts/fix-consultant-data.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing env vars. Run with:\n  node --env-file=.env.local scripts/fix-consultant-data.mjs'
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(supabaseUrl, serviceRoleKey);

if (dryRun) {
  console.log('=== DRY RUN MODE (no changes will be written) ===\n');
}

console.log('--- Consultant data verification ---\n');

let fixedCount = 0;

// ---------------------------------------------------------------
// 1. Consultants without a practitioner
// ---------------------------------------------------------------
const { data: noPractitioner } = await supabase
  .from('consultants')
  .select('id, email, name')
  .is('practitioner_id', null);

if (noPractitioner?.length) {
  console.log(`[1] ${noPractitioner.length} consultant(s) without a practitioner`);

  const { data: practitioners } = await supabase
    .from('practitioners')
    .select('id, full_name')
    .limit(1);

  if (practitioners?.[0]) {
    for (const consultant of noPractitioner) {
      console.log(`    -> ${consultant.email || consultant.id}`);

      if (!dryRun) {
        await supabase
          .from('consultants')
          .update({ practitioner_id: practitioners[0].id })
          .eq('id', consultant.id);
      }

      console.log(`       Assigned to ${practitioners[0].full_name}`);
      fixedCount += 1;
    }
  } else {
    console.log('    No practitioners found in the database, skipping.');
  }
} else {
  console.log('[1] All consultants have a practitioner assigned.');
}

// ---------------------------------------------------------------
// 2. Consultants not activated
// ---------------------------------------------------------------
const { data: notActivated } = await supabase
  .from('consultants')
  .select('id, email, name')
  .eq('activated', false);

if (notActivated?.length) {
  console.log(`\n[2] ${notActivated.length} consultant(s) not activated`);

  for (const consultant of notActivated) {
    console.log(`    -> ${consultant.email || consultant.id}`);

    if (!dryRun) {
      await supabase
        .from('consultants')
        .update({ activated: true, activated_at: new Date().toISOString() })
        .eq('id', consultant.id);
    }

    console.log('       Activated');
    fixedCount += 1;
  }
} else {
  console.log('\n[2] All consultants are activated.');
}

// ---------------------------------------------------------------
// 3. Missing memberships
// ---------------------------------------------------------------
const { data: consultants } = await supabase
  .from('consultants')
  .select('id, email');

let missingMemberships = 0;

if (consultants?.length) {
  // Fetch all existing memberships in one query
  const { data: allMemberships } = await supabase
    .from('consultant_memberships')
    .select('consultant_id');

  const membershipSet = new Set(allMemberships?.map((m) => m.consultant_id) || []);

  const consultantsWithoutMembership = consultants.filter((p) => !membershipSet.has(p.id));

  if (consultantsWithoutMembership.length) {
    console.log(`\n[3] ${consultantsWithoutMembership.length} consultant(s) without a membership`);

    // Fetch auth users once
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const usersByEmail = new Map(users.map((u) => [u.email, u]));

    for (const consultant of consultantsWithoutMembership) {
      if (!consultant.email) {
        console.log(`    -> ${consultant.id}: no email, skipping`);
        continue;
      }

      const user = usersByEmail.get(consultant.email);

      if (!user) {
        console.log(`    -> ${consultant.email}: no auth user found, skipping`);
        continue;
      }

      console.log(`    -> ${consultant.email}`);

      if (!dryRun) {
        const { error } = await supabase
          .from('consultant_memberships')
          .insert({ consultant_id: consultant.id, consultant_user_id: user.id });

        if (error) {
          console.log(`       Error: ${error.message}`);
          continue;
        }
      }

      console.log(`       Membership created (user ${user.id})`);
      missingMemberships += 1;
      fixedCount += 1;
    }
  } else {
    console.log('\n[3] All consultants have memberships.');
  }
}

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------
console.log('\n--- Summary ---');
console.log(`Total fixes applied: ${fixedCount}${dryRun ? ' (dry run)' : ''}`);
console.log('Done.');
