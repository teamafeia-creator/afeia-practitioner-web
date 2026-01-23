BEGIN;

CREATE TABLE IF NOT EXISTS public.patient_anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id)
);

CREATE TABLE IF NOT EXISTS public.practitioner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, practitioner_id)
);

ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners access own patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Practitioners access own patient anamnesis" ON public.patient_anamnesis
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients access own patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Patients access own patient anamnesis" ON public.patient_anamnesis
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships
      WHERE patient_user_id = auth.uid()
    )
  ) WITH CHECK (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships
      WHERE patient_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Practitioners manage own notes" ON public.practitioner_notes;
CREATE POLICY "Practitioners manage own notes" ON public.practitioner_notes
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

COMMIT;
