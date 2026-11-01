// lib/wearables/oauth-states.ts
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type { WearableProvider } from './connections';

/**
 * Marque un nonce de state OAuth comme consommé (usage unique).
 * Renvoie `false` s'il l'était déjà : l'appelant ne doit alors PAS échanger le code.
 * Lève une erreur si la base est injoignable (on n'échange pas le code non plus).
 */
export async function consumeOAuthState(input: {
  nonce: string;
  consultantId: string;
  provider: WearableProvider;
  expiresAt: Date;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('wearable_oauth_states').insert({
    nonce: input.nonce,
    consultant_id: input.consultantId,
    provider: input.provider,
    expires_at: input.expiresAt.toISOString(),
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(`wearable_oauth_states : enregistrement du state impossible (${error.code ?? 'inconnu'})`);
}
