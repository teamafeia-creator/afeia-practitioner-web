import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, anonKey);
}

async function run() {
  const supabase = buildClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const email = `smoke.${suffix}@example.com`;
  const password = `Smoke-${suffix}!`;

  console.log('Signing up test user:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: {
        full_name: 'Smoke Test Practitioner',
        role: 'practitioner'
      }
    }
  });

  if (signUpError) {
    throw new Error(`Signup failed: ${signUpError.message}`);
  }

  if (!signUpData.user) {
    throw new Error('Signup did not return a user.');
  }

  console.log('Signing out...');
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    throw new Error(`Signout failed: ${signOutError.message}`);
  }

  console.log('Signing in with password...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password
  });

  if (signInError) {
    throw new Error(`Login failed: ${signInError.message}`);
  }

  if (!signInData.session) {
    throw new Error('Login did not return a session.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(`Fetching user failed: ${userError.message}`);
  }

  console.log('Authenticated user:', userData.user?.email);
  console.log('Smoke test completed successfully.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
