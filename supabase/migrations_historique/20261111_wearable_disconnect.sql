-- POL-17 · Déconnexion de l'objet connecté par le patient.
--
-- wearable_disconnect(consultant, fournisseur, supprimer_les_données), en UNE transaction :
--  1. connexion → revoked, jeton effacé (access_token_secret_id = NULL + secret Vault supprimé),
--     interrupted_at renseigné (première fois) ;
--  2. si p_delete_data : suppression des données du consultant pour ce fournisseur dans
--     sleep_sessions, hrv_nightly, hr_samples, daily_activity, wearable_raw et wearable_events
--     (événements rattachés au consultant ou à son identifiant chez le fournisseur).
-- Appelée par le serveur (service_role) APRÈS la tentative de désinscription chez Polar :
-- la révocation côté Afeia a lieu quelle que soit la réponse de Polar.
-- Renvoie le nombre de lignes supprimées par table. Rejouable (connexion déjà révoquée :
-- seules les suppressions éventuelles ont lieu).

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

  IF v_found IS NULL THEN
    RETURN jsonb_build_object('found', false);
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

  RETURN jsonb_build_object('found', true, 'deleted', v_counts);
END;
$$;

REVOKE ALL ON FUNCTION public.wearable_disconnect(UUID, public.wearable_provider, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_disconnect(UUID, public.wearable_provider, BOOLEAN) TO service_role;
