'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/Toaster';
import { FicheEditor } from '@/components/library/FicheEditor';
import { supabase } from '@/lib/supabase';
import { getResourceById, getResourceBySlug } from '@/lib/queries/resources';
import type { EducationalResource } from '@/lib/types';

type Fiche = EducationalResource & { theme_label?: string | null };

export default function ModifierFichePage() {
  const { user, loading } = useRequireAuth('/login');
  const params = useParams();
  const slug = params.slug as string;
  const [fiche, setFiche] = useState<Fiche | null | undefined>(undefined);
  const [themes, setThemes] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const f = ((await getResourceBySlug(slug)) ?? (await getResourceById(slug))) as Fiche | null;
      setFiche(f && f.practitioner_id === user.id ? f : null);
      const { data } = await supabase.from('educational_resources').select('theme_label').eq('practitioner_id', user.id).not('theme_label', 'is', null);
      setThemes(Array.from(new Set((data ?? []).map((r: { theme_label: string }) => r.theme_label))));
    })();
  }, [user, slug]);

  if (loading || !user || fiche === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!fiche) {
    return (
      <div className="rounded-2xl border border-divider bg-surface p-8 text-center text-stone">
        Cette fiche n’existe pas ou ne peut pas être modifiée. <Link href="/bibliotheque" className="text-sage">Retour à la bibliothèque</Link>
      </div>
    );
  }
  return (
    <>
      <Toaster />
      <FicheEditor practitionerId={user.id} fiche={fiche} customThemes={themes} />
    </>
  );
}
