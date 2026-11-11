'use client';

import { useEffect, useState } from 'react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { longDate, parisDay, shortDate } from '@/lib/wearables/insights';
import { addTopic, deleteTopic, listTopics, setTopicDone, type SessionTopic } from '@/lib/wearables/insights/queries';

/**
 * « À aborder le 12 novembre » (onglet Rendez-vous, maquette DossierRdv) : points épinglés depuis
 * l'objet connecté et points ajoutés par le praticien.
 */
export function SessionTopicsCard({
  consultantId,
  nextSessionDate,
  lastSessionAt,
  onOpenWearable,
}: {
  consultantId: string;
  nextSessionDate: string | null;
  /** Début de la dernière séance : les points abordés depuis restent visibles, barrés. */
  lastSessionAt: string | null;
  onOpenWearable: () => void;
}) {
  const [topics, setTopics] = useState<SessionTopic[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    listTopics(supabase, consultantId, lastSessionAt)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [consultantId, lastSessionAt]);

  const today = parisDay(new Date());
  const src = (t: SessionTopic) => {
    const d = parisDay(t.created_at);
    const when = d === today ? 'aujourd’hui' : shortDate(d);
    return t.source === 'wearable' ? `Objet connecté · épinglé le ${shortDate(d)}` : `Ajouté par vous · ${when}`;
  };
  const n = topics.length;
  const done = topics.filter((t) => t.done_at).length;

  async function run(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <section aria-labelledby="todo-t" className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5" data-testid="session-topics">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 id="todo-t" className="text-base font-semibold">
            {nextSessionDate ? `À aborder le ${longDate(nextSessionDate)}` : 'À aborder à la prochaine séance'}
          </h3>
          <span className="text-xs text-stone">{n ? `${n} ${n > 1 ? 'points' : 'point'} · ${done} ${done > 1 ? 'abordés' : 'abordé'}` : 'Aucun point pour l’instant.'}</span>
        </div>
        <button type="button" onClick={onOpenWearable} className="text-[13px] text-sage">
          Épingler d’autres points depuis l’objet connecté →
        </button>
      </div>
      <div className="flex flex-col">
        {topics.map((t) => {
          const on = Boolean(t.done_at);
          return (
            <div key={t.id} className="flex items-start gap-3 border-t border-[#1F2633] py-[11px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`Abordé : ${t.text}`}
                onClick={() =>
                  void run(async () => {
                    await setTopicDone(supabase, t.id, !on);
                    setTopics((ts) => ts.map((x) => (x.id === t.id ? { ...x, done_at: on ? null : new Date().toISOString() } : x)));
                  })
                }
                className={`mt-px h-5 w-5 flex-none rounded-md border-2 p-0 text-xs font-extrabold leading-4 text-ink ${on ? 'border-sage bg-sage' : 'border-[#3A4252]'}`}
              >
                {on ? '✓' : ''}
              </button>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-sm leading-snug ${on ? 'text-stone line-through' : ''}`}>{t.text}</span>
                <span className="text-xs text-stone">{src(t)}</span>
              </span>
              <button
                type="button"
                aria-label={`Retirer : ${t.text}`}
                title="Retirer"
                onClick={() =>
                  void run(async () => {
                    await deleteTopic(supabase, t.id);
                    setTopics((ts) => ts.filter((x) => x.id !== t.id));
                  })
                }
                className="h-[30px] w-[30px] flex-none rounded-lg text-base text-stone"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          void run(async () => {
            const t = await addTopic(supabase, consultantId, v);
            setTopics((ts) => [...ts, t]);
            setDraft('');
          });
        }}
      >
        <input
          type="text"
          aria-label="Ajouter un point à aborder"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter un point à aborder…"
          className="h-[38px] min-w-0 flex-[1_1_260px] rounded-[9px] border border-divider bg-ink px-3 text-sm"
        />
        <button type="submit" className="h-[38px] rounded-[9px] border border-[#2F5A50] bg-[#1C2E2A] px-3.5 text-[13px] font-semibold text-sage">
          Ajouter
        </button>
      </form>
      <span className="text-xs text-stone">Liste visible de vous seule. Les points cochés « abordés » sont repris en tête des notes de séance.</span>
    </section>
  );
}

/** En tête des notes de séance : les points cochés « abordés » depuis la dernière séance. */
export function DiscussedTopics({ consultantId, since }: { consultantId: string; since: string | null }) {
  const [topics, setTopics] = useState<SessionTopic[]>([]);
  useEffect(() => {
    listTopics(supabase, consultantId, since)
      .then((ts) => setTopics(ts.filter((t) => t.done_at)))
      .catch(() => setTopics([]));
  }, [consultantId, since]);
  if (!topics.length) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-surface p-4">
      <h3 className="text-sm font-semibold">Points abordés</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {topics.map((t) => (
          <li key={t.id}>{t.text}</li>
        ))}
      </ul>
    </section>
  );
}
