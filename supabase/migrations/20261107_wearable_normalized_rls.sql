-- POL-12 · Accès en lecture aux données normalisées des objets connectés.
--
-- Relation déjà utilisée dans l'app (aucune nouvelle règle) :
--  * praticien → ses consultants : consultants.practitioner_id = auth.uid()
--    (même condition que les politiques existantes sur consultants, anamneses, messages…) ;
--  * consultant → lui-même : consultant_memberships.consultant_user_id = auth.uid()
--    (liens créés par /api/consultant/finalize-auth et /api/mobile/auth/register).
-- Les deux requêtes sont regroupées dans deux fonctions pour ne pas les recopier dans
-- chaque politique. SECURITY INVOKER : elles s'exécutent sous la RLS existante de
-- consultants et de consultant_memberships, sans élargir aucun accès.
--
-- Écriture : aucune pour anon/authenticated (service_role uniquement, comme avant).

CREATE OR REPLACE FUNCTION public.auth_practitioner_consultant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT c.id FROM public.consultants c WHERE c.practitioner_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_self_consultant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT m.consultant_id FROM public.consultant_memberships m WHERE m.consultant_user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.auth_practitioner_consultant_ids() IS
  'Consultants rattachés au praticien connecté (consultants.practitioner_id = auth.uid()).';
COMMENT ON FUNCTION public.auth_self_consultant_ids() IS
  'Fiche(s) consultant de l''utilisateur connecté (consultant_memberships.consultant_user_id = auth.uid()).';

REVOKE ALL ON FUNCTION public.auth_practitioner_consultant_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_self_consultant_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_practitioner_consultant_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_self_consultant_ids() TO authenticated, service_role;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sleep_sessions', 'hrv_nightly', 'hr_samples', 'daily_activity'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

    -- Lecture seule pour authenticated ; anon n'a aucun droit.
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_practitioner_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (consultant_id IN (SELECT public.auth_practitioner_consultant_ids()))',
      t || '_practitioner_select', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_consultant_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (consultant_id IN (SELECT public.auth_self_consultant_ids()))',
      t || '_consultant_select', t);
    -- Aucune policy INSERT/UPDATE/DELETE : refus pour tout rôle autre que service_role.
  END LOOP;
END $$;
