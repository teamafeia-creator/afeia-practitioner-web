import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const consultantId = '004230e4-7014-498b-896b-1696845b8aae';
const userId = '070f3c05-57f8-45fd-b5c1-db651cadea12';

console.log('--- Fix missing consultant row ---\n');

// 1. Check membership
const { data: membership } = await supabase
  .from('consultant_memberships')
  .select('*')
  .eq('consultant_id', consultantId)
  .single();

console.log('Membership exists:', !!membership);
if (membership) {
  console.log('  consultant_user_id:', membership.consultant_user_id);
}

// 2. Check consultant
const { data: consultant } = await supabase
  .from('consultants')
  .select('*')
  .eq('id', consultantId)
  .maybeSingle();

console.log('Consultant exists:', !!consultant);

// 3. If consultant is missing, create it
if (!consultant) {
  console.log('\nConsultant row missing – creating it...');

  // Try to get the email from auth
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);

  const email = user?.email || 'unknown@example.com';

  // Try to find the invitation for context (name, practitioner)
  const { data: invitation } = await supabase
    .from('consultant_invitations')
    .select('practitioner_id, full_name, first_name, last_name')
    .eq('consultant_id', consultantId)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const name =
    invitation?.full_name ||
    [invitation?.first_name, invitation?.last_name].filter(Boolean).join(' ') ||
    email.split('@')[0];

  // Find practitioner_id from invitation or OTP
  let practitionerId = invitation?.practitioner_id || null;

  if (!practitionerId) {
    const { data: otp } = await supabase
      .from('otp_codes')
      .select('practitioner_id')
      .eq('consultant_id', consultantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    practitionerId = otp?.practitioner_id || null;
  }

  if (!practitionerId) {
    console.error('ERROR: No practitioner_id found – cannot create consultant row.');
    process.exit(1);
  }

  const newConsultant = {
    id: consultantId,
    email,
    name,
    practitioner_id: practitionerId,
    status: 'standard',
    is_premium: false,
  };

  console.log('Inserting:', newConsultant);

  const { data: created, error } = await supabase
    .from('consultants')
    .insert(newConsultant)
    .select()
    .single();

  if (error) {
    console.error('ERROR creating consultant:', error);
    process.exit(1);
  } else {
    console.log('Consultant created:', created);
  }
} else {
  console.log('\nConsultant already exists – no action needed.');
}

console.log('\nDone.');
