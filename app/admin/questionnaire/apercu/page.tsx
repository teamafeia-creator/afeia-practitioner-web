'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { QuestionnaireFlow } from '@/app/questionnaire/[slug]/QuestionnaireFlow';
import { toPublic, type EditorSection } from '@/lib/questionnaire/editor';
import type { PublicSection } from '@/lib/questionnaire/sections';

/** Aperçu du brouillon tel qu'un consultant le remplira. Rien n'est envoyé. */
export default function QuestionnairePreviewPage() {
  const [sections, setSections] = useState<PublicSection[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/questionnaire', { credentials: 'include' });
      if (!res.ok) return setSections([]);
      const data = (await res.json()) as { sections: EditorSection[] };
      setSections(toPublic(data.sections));
    })();
  }, []);

  if (!sections) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <div className="-m-6">
      <div role="note" className="bg-terracotta-light px-4 py-2 text-center text-sm text-terracotta">
        Aperçu du brouillon : les réponses ne sont pas envoyées.
      </div>
      <QuestionnaireFlow
        slug="apercu-admin"
        preview
        sections={sections}
        practitioner={{ id: '', name: 'Votre praticien', city: null, bookingEnabled: false }}
      />
    </div>
  );
}
