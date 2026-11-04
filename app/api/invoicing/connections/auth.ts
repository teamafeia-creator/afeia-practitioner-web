import type { NextRequest } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/** Id du praticien à partir du jeton Supabase (Authorization: Bearer), ou null. */
export async function practitionerIdFrom(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data, error } = await createSupabaseAuthClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
