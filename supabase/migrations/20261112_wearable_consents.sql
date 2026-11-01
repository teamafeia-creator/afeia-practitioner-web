-- POL-18 · Consentement « objet connecté ».
--
-- wearable_consents : une ligne par acceptation (patient, version du texte, accepté le, retiré le).
--  * aucune connexion possible sans consentement actif (withdrawn_at NULL) sur la version courante
--    (contrôlé par /api/wearables/polar/connect, version dans lib/wearables/consent-text.ts) ;
--  * la déconnexion (wearable_disconnect) renseigne withdrawn_at ; la ligne est conservée (trace) ;
--  * texte : content/consents/wearables-<version>.md.
-- RLS : le patient lit et crée les siens (jamais de modification, pas d'antidatage) ;
-- service_role pour le reste.

CREATE TABLE IF NOT EXISTS public.wearable_consents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  text_version  TEXT NOT NULL CHECK (text_version ~ '^v[0-9]+$'),
  accepted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_consents_withdrawn_after_accepted CHECK (withdrawn_at IS NULL OR withdrawn_at >= accepted_at)
);

-- Un seul consentement actif par patient et par version.
CREATE UNIQUE INDEX IF NOT EXISTS wearable_consents_one_active
  ON public.wearable_consents (consultant_id, text_version)
  WHERE withdrawn_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wearable_consents_consultant ON public.wearable_consents (consultant_id);

COMMENT ON TABLE public.wearable_consents IS
  'Consentements au partage des données d''objet connecté (version du texte, acceptation, retrait).';

ALTER TABLE public.wearable_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_consents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.wearable_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wearable_consents TO authenticated;
GRANT INSERT (consultant_id, text_version) ON public.wearable_consents TO authenticated;
GRANT ALL ON public.wearable_consents TO service_role;

DROP POLICY IF EXISTS wearable_consents_self_select ON public.wearable_consents;
CREATE POLICY wearable_consents_self_select ON public.wearable_consents
  FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT public.auth_self_consultant_ids()));

-- Création par le patient lui-même, consentement actif (accepted_at = défaut now(), withdrawn_at NULL :
-- seules consultant_id et text_version sont insérables).
DROP POLICY IF EXISTS wearable_consents_self_insert ON public.wearable_consents;
CREATE POLICY wearable_consents_self_insert ON public.wearable_consents
  FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT public.auth_self_consultant_ids()) AND withdrawn_at IS NULL);
-- Aucune policy UPDATE/DELETE : un consentement ne se modifie pas côté client.

-- ---------------------------------------------------------------------------
-- Déconnexion : retrait du consentement (même fonction que 20261111, + retrait).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wearable_disconnect(
  p_consultant_id UUID,
  p_provider      public.wearable_provider,
  p_delete_data   BOOLEAN DEFAULT TRUE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id        UUID;
  v_provider_user_id TEXT;
  v_found            BOOLEAN;
  v_counts           JSONB := '{}'::jsonb;
  v_n                INTEGER;
BEGIN
  SELECT access_token_secret_id, provider_user_id, true
    INTO v_secret_id, v_provider_user_id, v_found
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  -- POL-18 : la déconnexion retire le consentement actif (trace conservée, withdrawn_at renseigné).
  UPDATE public.wearable_consents
  SET withdrawn_at = now()
  WHERE consultant_id = p_consultant_id AND withdrawn_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := jsonb_build_object('consents_withdrawn', v_n);

  IF v_found IS NULL THEN
    RETURN jsonb_build_object('found', false, 'consents_withdrawn', v_n);
  END IF;

  UPDATE public.wearable_connections
  SET status = 'revoked',
      access_token_secret_id = NULL,
      token_expires_at = NULL,
      interrupted_at = coalesce(interrupted_at, now()),
      updated_at = now()
  WHERE consultant_id = p_consultant_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;

  IF p_delete_data THEN
    DELETE FROM public.sleep_sessions WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sleep_sessions', v_n);
    DELETE FROM public.hrv_nightly WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('hrv_nightly', v_n);
    DELETE FROM public.hr_samples WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('hr_samples', v_n);
    DELETE FROM public.daily_activity WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('daily_activity', v_n);
    DELETE FROM public.wearable_raw WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('wearable_raw', v_n);
    DELETE FROM public.wearable_events
    WHERE provider = p_provider
      AND (consultant_id = p_consultant_id OR provider_user_id = v_provider_user_id);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('wearable_events', v_n);
  END IF;

  RETURN jsonb_build_object('found', true, 'consents_withdrawn', (v_counts->>'consents_withdrawn')::int,
                            'deleted', v_counts - 'consents_withdrawn');
END;
$$;

REVOKE ALL ON FUNCTION public.wearable_disconnect(UUID, public.wearable_provider, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_disconnect(UUID, public.wearable_provider, BOOLEAN) TO service_role;
