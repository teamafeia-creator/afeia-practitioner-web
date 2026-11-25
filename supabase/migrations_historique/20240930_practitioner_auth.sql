-- Migration safe : aligner practitioners.id avec auth.users.id
-- 1) Vérifier les doublons potentiels par email avant d'exécuter en prod.

BEGIN;

-- Ajouter une colonne temporaire si besoin pour aligner les IDs existants.
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Renseigner auth_user_id via l'email si possible.
UPDATE public.practitioners p
SET auth_user_id = u.id
FROM auth.users u
WHERE p.auth_user_id IS NULL
  AND p.email = u.email;

-- Si auth_user_id n'est pas encore rempli, il faut traiter ces lignes manuellement.

-- Mettre à jour les références patients avant de basculer l'ID (si nécessaire).
UPDATE public.patients pt
SET practitioner_id = p.auth_user_id
FROM public.practitioners p
WHERE p.auth_user_id IS NOT NULL
  AND pt.practitioner_id = p.id
  AND pt.practitioner_id <> p.auth_user_id;

-- Aligner la clé primaire sur auth_user_id quand elle est disponible.
UPDATE public.practitioners
SET id = auth_user_id
WHERE auth_user_id IS NOT NULL
  AND id <> auth_user_id;

ALTER TABLE public.practitioners
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.practitioners
  ADD CONSTRAINT IF NOT EXISTS practitioners_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Nettoyage optionnel une fois l'alignement validé.
-- ALTER TABLE public.practitioners DROP COLUMN auth_user_id;

-- RLS : policies séparées pour practitioners et patients.
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners see own data" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners see own patients" ON public.patients;

CREATE POLICY "Practitioners can select own profile" ON public.practitioners
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Practitioners can insert own profile" ON public.practitioners
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can update own profile" ON public.practitioners
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can delete own profile" ON public.practitioners
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Practitioners can select own patients" ON public.patients
  FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert own patients" ON public.patients
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update own patients" ON public.patients
  FOR UPDATE USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete own patients" ON public.patients
  FOR DELETE USING (practitioner_id = auth.uid());

-- Trigger de création du profil praticien à l'inscription.
CREATE OR REPLACE FUNCTION public.handle_new_practitioner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.practitioners (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_practitioner();

COMMIT;
