'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { listOpenTopics, markTopicDone, type SessionTopic } from '@/lib/wearables/insights/queries';

/** « À aborder » à la prochaine séance : points épinglés depuis l'onglet Objet connecté. */
export function SessionTopicsCard({ consultantId, nextSessionLabel }: { consultantId: string; nextSessionLabel?: string | null }) {
  const [topics, setTopics] = useState<SessionTopic[] | null>(null);

  useEffect(() => {
    listOpenTopics(supabase, consultantId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [consultantId]);

  if (!topics?.length) return null;

  async function done(id: string) {
    try {
      await markTopicDone(supabase, id);
      setTopics((ts) => (ts ?? []).filter((t) => t.id !== id));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-divider bg-surface p-5" data-testid="session-topics">
      <h3 className="text-sm font-semibold">À aborder{nextSessionLabel ? ` le ${nextSessionLabel}` : ' à la prochaine séance'}</h3>
      {topics.map((t) => (
        <div key={t.id} className="flex items-start gap-3 border-t border-divider pt-2 first-of-type:border-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm">{t.text}</span>
            {t.detail ? <span className="text-xs text-stone">{t.detail}</span> : null}
          </div>
          <button type="button" onClick={() => void done(t.id)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs text-stone hover:text-charcoal">
            <Check className="h-3.5 w-3.5" aria-hidden /> Abordé
          </button>
        </div>
      ))}
    </section>
  );
}
