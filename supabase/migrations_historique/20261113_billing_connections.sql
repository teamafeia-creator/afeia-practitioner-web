-- Facturation · Connexion aux outils de facturation externes (Pennylane, Abby).
--
-- Le praticien qui garde son outil peut le connecter avec une clé API personnelle :
-- Afeia crée alors, à sa demande, un brouillon de facture dans son outil pour une
-- séance terminée. Le brouillon reste à valider par le praticien dans son outil.
--
-- Indy, Tiime et Freebe n'offrent pas d'API publique (nov. 2026) : ils restent en
-- suivi manuel (lien, « Marquer comme facturée », export CSV).
--
-- Sécurité (même modèle que wearable_connections, migration 20261101) :
--  * la clé API est stockée dans Supabase Vault, la table ne garde que l'id du secret ;
--  * seul service_role lit ou écrit la clé, via des fonctions SECURITY DEFINER ;
--  * le praticien lit l'état de ses connexions (sans la clé) grâce à la RLS.
-- Idempotent : oui

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ---------------------------------------------------------------------------
-- Connexions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_connections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id    UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL CHECK (provider IN ('pennylane', 'abby')),
  api_key_secret_id  UUID,
  -- Nom du compte côté outil (raison sociale), affiché « Connecté à … ».
  account_label      TEXT,
  -- Régime de TVA appliqué aux lignes créées : franchise en base (art. 293 B) ou TVA à 20 %.
  vat_mode           TEXT NOT NULL DEFAULT 'franchise' CHECK (vat_mode IN ('franchise', 'tva_20')),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  last_error         TEXT,
  connected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_connections_practitioner_provider_key UNIQUE (practitioner_id, provider),
  CONSTRAINT billing_connections_active_has_key CHECK (status <> 'active' OR api_key_secret_id IS NOT NULL)
);

COMMENT ON TABLE public.billing_connections IS
  'Connexions aux outils de facturation externes. Clé API dans Vault ; lecture/écriture de la clé réservée à service_role.';

ALTER TABLE public.billing_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_connections FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, practitioner_id, provider, account_label, vat_mode, status, last_error, connected_at, last_used_at)
  ON public.billing_connections TO authenticated;
GRANT ALL ON public.billing_connections TO service_role;

DROP POLICY IF EXISTS billing_connections_owner_select ON public.billing_connections;
CREATE POLICY billing_connections_owner_select ON public.billing_connections
  FOR SELECT TO authenticated
  USING (practitioner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Correspondance consultant Afeia ↔ client dans l'outil (évite les doublons)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_external_customers (
  practitioner_id  UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  consultant_id    UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('pennylane', 'abby')),
  external_id      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (practitioner_id, consultant_id, provider)
);
ALTER TABLE public.billing_external_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_external_customers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_external_customers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.billing_external_customers TO service_role;

-- ---------------------------------------------------------------------------
-- Séance → brouillon créé dans l'outil
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS invoiced_externally_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS external_invoice_provider TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS external_invoice_id TEXT;
COMMENT ON COLUMN public.appointments.external_invoice_id IS
  'Id du brouillon de facture créé par Afeia dans l''outil externe (external_invoice_provider). Sert aussi d''anti-doublon.';

-- ---------------------------------------------------------------------------
-- Fonctions (service_role uniquement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.billing_save_connection(
  p_practitioner_id UUID,
  p_provider        TEXT,
  p_api_key         TEXT,
  p_account_label   TEXT,
  p_vat_mode        TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id        UUID;
  v_secret_id UUID;
BEGIN
  IF coalesce(p_api_key, '') = '' THEN
    RAISE EXCEPTION 'api key is required';
  END IF;

  SELECT id, api_key_secret_id INTO v_id, v_secret_id
  FROM public.billing_connections
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider
  FOR UPDATE;

  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_api_key);
  ELSE
    v_secret_id := vault.create_secret(
      p_api_key,
      'billing:' || p_provider || ':' || p_practitioner_id || ':' || gen_random_uuid(),
      'Clé API outil de facturation'
    );
  END IF;

  INSERT INTO public.billing_connections AS bc (
    practitioner_id, provider, api_key_secret_id, account_label, vat_mode,
    status, connected_at, last_error, updated_at
  ) VALUES (
    p_practitioner_id, p_provider, v_secret_id, p_account_label, coalesce(p_vat_mode, 'franchise'),
    'active', now(), NULL, now()
  )
  ON CONFLICT (practitioner_id, provider) DO UPDATE SET
    api_key_secret_id = EXCLUDED.api_key_secret_id,
    account_label     = EXCLUDED.account_label,
    vat_mode          = EXCLUDED.vat_mode,
    status            = 'active',
    connected_at      = now(),
    last_error        = NULL,
    updated_at        = now()
  RETURNING bc.id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_get_api_key(
  p_practitioner_id UUID,
  p_provider        TEXT
) RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.decrypted_secret
  FROM public.billing_connections bc
  JOIN vault.decrypted_secrets s ON s.id = bc.api_key_secret_id
  WHERE bc.practitioner_id = p_practitioner_id
    AND bc.provider = p_provider
    AND bc.status IN ('active', 'error');
$$;

CREATE OR REPLACE FUNCTION public.billing_revoke_connection(
  p_practitioner_id UUID,
  p_provider        TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT api_key_secret_id INTO v_secret_id
  FROM public.billing_connections
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider
  FOR UPDATE;

  UPDATE public.billing_connections
  SET status = 'revoked', api_key_secret_id = NULL, updated_at = now()
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_connections_delete_secret()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.api_key_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.api_key_secret_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS billing_connections_delete_secret ON public.billing_connections;
CREATE TRIGGER billing_connections_delete_secret
  AFTER DELETE ON public.billing_connections
  FOR EACH ROW EXECUTE FUNCTION public.billing_connections_delete_secret();

REVOKE ALL ON FUNCTION public.billing_save_connection(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.billing_get_api_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.billing_revoke_connection(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.billing_connections_delete_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_save_connection(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_get_api_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_revoke_connection(UUID, TEXT) TO service_role;
