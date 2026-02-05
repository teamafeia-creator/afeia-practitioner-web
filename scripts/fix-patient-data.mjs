/**
 * Comprehensive patient data maintenance script.
 *
 * Checks and auto-fixes:
 *  1. Patients without a practitioner assigned
 *  2. Patients not activated
 *  3. Missing patient_memberships (links auth users to patient records)
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-patient-data.mjs
 *
 * Add --dry-run to preview changes without writing:
 *   node --env-file=.env.local scripts/fix-patient-data.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing env vars. Run with:\n  node --env-file=.env.local scripts/fix-patient-data.mjs'
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const supabase = createClient(supabaseUrl, serviceRoleKey);

if (dryRun) {
  console.log('=== DRY RUN MODE (no changes will be written) ===\n');
}

console.log('--- Patient data verification ---\n');

let fixedCount = 0;

// ---------------------------------------------------------------
// 1. Patients without a practitioner
// ---------------------------------------------------------------
const { data: noPractitioner } = await supabase
  .from('patients')
  .select('id, email, name')
  .is('practitioner_id', null);

if (noPractitioner?.length) {
  console.log(`[1] ${noPractitioner.length} patient(s) without a practitioner`);

  const { data: practitioners } = await supabase
    .from('practitioners')
    .select('id, full_name')
    .limit(1);

  if (practitioners?.[0]) {
    for (const patient of noPractitioner) {
      console.log(`    -> ${patient.email || patient.id}`);

      if (!dryRun) {
        await supabase
          .from('patients')
          .update({ practitioner_id: practitioners[0].id })
          .eq('id', patient.id);
      }

      console.log(`       Assigned to ${practitioners[0].full_name}`);
      fixedCount += 1;
    }
  } else {
    console.log('    No practitioners found in the database, skipping.');
  }
} else {
  console.log('[1] All patients have a practitioner assigned.');
}

// ---------------------------------------------------------------
// 2. Patients not activated
// ---------------------------------------------------------------
const { data: notActivated } = await supabase
  .from('patients')
  .select('id, email, name')
  .eq('activated', false);

if (notActivated?.length) {
  console.log(`\n[2] ${notActivated.length} patient(s) not activated`);

  for (const patient of notActivated) {
    console.log(`    -> ${patient.email || patient.id}`);

    if (!dryRun) {
      await supabase
        .from('patients')
        .update({ activated: true, activated_at: new Date().toISOString() })
        .eq('id', patient.id);
    }

    console.log('       Activated');
    fixedCount += 1;
  }
} else {
  console.log('\n[2] All patients are activated.');
}

// ---------------------------------------------------------------
// 3. Missing memberships
// ---------------------------------------------------------------
const { data: patients } = await supabase
  .from('patients')
  .select('id, email');

let missingMemberships = 0;

if (patients?.length) {
  // Fetch all existing memberships in one query
  const { data: allMemberships } = await supabase
    .from('patient_memberships')
    .select('patient_id');

  const membershipSet = new Set(allMemberships?.map((m) => m.patient_id) || []);

  const patientsWithoutMembership = patients.filter((p) => !membershipSet.has(p.id));

  if (patientsWithoutMembership.length) {
    console.log(`\n[3] ${patientsWithoutMembership.length} patient(s) without a membership`);

    // Fetch auth users once
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const usersByEmail = new Map(users.map((u) => [u.email, u]));

    for (const patient of patientsWithoutMembership) {
      if (!patient.email) {
        console.log(`    -> ${patient.id}: no email, skipping`);
        continue;
      }

      const user = usersByEmail.get(patient.email);

      if (!user) {
        console.log(`    -> ${patient.email}: no auth user found, skipping`);
        continue;
      }

      console.log(`    -> ${patient.email}`);

      if (!dryRun) {
        const { error } = await supabase
          .from('patient_memberships')
          .insert({ patient_id: patient.id, patient_user_id: user.id });

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
    console.log('\n[3] All patients have memberships.');
  }
}

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------
console.log('\n--- Summary ---');
console.log(`Total fixes applied: ${fixedCount}${dryRun ? ' (dry run)' : ''}`);
console.log('Done.');
