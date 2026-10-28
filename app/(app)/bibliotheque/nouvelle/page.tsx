'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/Toaster';
import { FicheEditor } from '@/components/library/FicheEditor';
import { supabase } from '@/lib/supabase';

export default function NouvelleFichePage() {
  const { user, loading } = useRequireAuth('/login');
  const [themes, setThemes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('educational_resources')
      .select('theme_label')
      .eq('practitioner_id', user.id)
      .not('theme_label', 'is', null)
      .then(({ data }) => setThemes(Array.from(new Set((data ?? []).map((r: { theme_label: string }) => r.theme_label)))));
  }, [user]);

  if (loading || !user || themes === null) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <>
      <Toaster />
      <FicheEditor practitionerId={user.id} fiche={null} customThemes={themes} />
    </>
  );
}
