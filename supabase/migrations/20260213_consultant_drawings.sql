-- Migration: consultant_drawings table for body diagram tool
-- Stores Excalidraw JSON data and metadata for anatomical drawings

CREATE TABLE IF NOT EXISTS public.consultant_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  title TEXT NOT NULL,
  template_type TEXT NOT NULL,
  excalidraw_data JSONB NOT NULL,
  snapshot_path TEXT,
  appointment_id UUID REFERENCES public.appointments(id),
  version INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consultant_drawings_consultant_created_idx
  ON public.consultant_drawings (consultant_id, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_on_consultant_drawings ON public.consultant_drawings;
CREATE TRIGGER set_updated_at_on_consultant_drawings
  BEFORE UPDATE ON public.consultant_drawings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.consultant_drawings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultant_drawings'
      AND policyname = 'consultant_drawings_select_own'
  ) THEN
    CREATE POLICY consultant_drawings_select_own
      ON public.consultant_drawings
      FOR SELECT
      USING (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultant_drawings'
      AND policyname = 'consultant_drawings_insert_own'
  ) THEN
    CREATE POLICY consultant_drawings_insert_own
      ON public.consultant_drawings
      FOR INSERT
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultant_drawings'
      AND policyname = 'consultant_drawings_update_own'
  ) THEN
    CREATE POLICY consultant_drawings_update_own
      ON public.consultant_drawings
      FOR UPDATE
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultant_drawings'
      AND policyname = 'consultant_drawings_delete_own'
  ) THEN
    CREATE POLICY consultant_drawings_delete_own
      ON public.consultant_drawings
      FOR DELETE
      USING (practitioner_id = auth.uid());
  END IF;
END
$$;

-- NOTE: Le bucket Supabase Storage 'consultant-drawings' doit être créé manuellement :
-- 1. Aller dans le dashboard Supabase > Storage > New bucket
-- 2. Nom : consultant-drawings
-- 3. Public : non (privé)
-- 4. Ajouter les policies RLS suivantes sur le bucket :
--    - SELECT : authenticated, path starts with auth.uid()::text
--    - INSERT : authenticated, path starts with auth.uid()::text
--    - UPDATE : authenticated, path starts with auth.uid()::text
--    - DELETE : authenticated, path starts with auth.uid()::text
