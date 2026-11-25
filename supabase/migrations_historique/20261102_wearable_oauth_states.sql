-- POL-05 · Usage unique du paramètre `state` OAuth des objets connectés.
--
-- Polar supprime TOUS les jetons déjà émis si un code d'autorisation est échangé deux
-- fois (docs/wearables/polar.md §4). Un rafraîchissement ou un double clic sur le
-- callback ne doit donc jamais rééchanger le code : chaque nonce de state est
-- inséré ici une seule fois, AVANT l'échange. Un second INSERT échoue (clé primaire),
-- et le callback s'arrête.
--
-- Table interne au serveur : écrite et lue uniquement par service_role.

CREATE TABLE IF NOT EXISTS public.wearable_oauth_states (
  nonce          TEXT PRIMARY KEY,
  consultant_id  UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider       public.wearable_provider NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wearable_oauth_states_expires_at
  ON public.wearable_oauth_states (expires_at);

COMMENT ON TABLE public.wearable_oauth_states IS
  'Nonces de state OAuth déjà consommés (usage unique). Purgeables après expires_at.';

ALTER TABLE public.wearable_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_oauth_states FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.wearable_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.wearable_oauth_states TO service_role;
-- Aucune policy : anon et authenticated n'ont ni droit ni ligne visible.
