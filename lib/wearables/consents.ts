// lib/wearables/consents.ts
// Consentements « objet connecté » (table wearable_consents, migration 20261112).
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { canUseWearables } from './access';
import { WEARABLES_CONSENT_VERSION } from './consent-text';

export type ActiveConsent = { version: string; acceptedAt: string };

/** Consentement actif (non retiré) du consultant sur la version donnée (par défaut la courante). */
export async function getActiveConsent(
  consultantId: string,
  version: string = WEARABLES_CONSENT_VERSION
): Promise<ActiveConsent | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from('wearable_consents')
    .select('text_version, accepted_at')
    .eq('consultant_id', consultantId)
    .eq('text_version', version)
    .is('withdrawn_at', null)
    .maybeSingle();
  if (error) throw new Error(`wearable_consents : lecture impossible (${error.code ?? 'inconnu'})`);
  return data ? { version: data.text_version as string, acceptedAt: data.accepted_at as string } : null;
}

/** Enregistre l'acceptation de la version courante. Idempotent : un consentement actif est réutilisé. */
export async function recordConsent(consultantId: string, version: string = WEARABLES_CONSENT_VERSION): Promise<ActiveConsent> {
  const existing = await getActiveConsent(consultantId, version);
  if (existing) return existing;
  const { data, error } = await createSupabaseAdminClient()
    .from('wearable_consents')
    .insert({ consultant_id: consultantId, text_version: version })
    .select('text_version, accepted_at')
    .single();
  if (error) {
    if (error.code === '23505') {
      const raced = await getActiveConsent(consultantId, version);
      if (raced) return raced;
    }
    throw new Error(`wearable_consents : enregistrement impossible (${error.code ?? 'inconnu'})`);
  }
  return { version: data.text_version as string, acceptedAt: data.accepted_at as string };
}

/** Accès à la fonctionnalité (WEARABLES_ENABLED_FOR) pour un consultant, d'après son e-mail. */
export async function consultantCanUseWearables(consultantId: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from('consultants')
    .select('email')
    .eq('id', consultantId)
    .maybeSingle();
  if (error) throw new Error(`consultants : lecture impossible (${error.code ?? 'inconnu'})`);
  return canUseWearables({ email: (data?.email as string | null) ?? null });
}
