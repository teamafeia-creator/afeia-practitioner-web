'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { RECAP_PERIOD, shortDate } from '@/lib/wearables/insights';
import { listPendingRecaps, sendRecap, skipRecap, type PendingRecap } from '@/lib/wearables/insights/queries';

/**
 * Revue du matin : récaps préparés à 7 h, à relire et valider. Rien ne part sans « Envoyer ».
 */
export function PendingRecapsCard() {
  const [recaps, setRecaps] = useState<PendingRecap[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listPendingRecaps(supabase)
      .then(setRecaps)
      .catch(() => setRecaps([]));
  }, []);

  if (!recaps?.length) return null;

  const remove = (id: string) => setRecaps((rs) => (rs ?? []).filter((r) => r.id !== id));

  async function send(r: PendingRecap) {
    setSending(true);
    try {
      await sendRecap(supabase, {
        consultantId: r.consultant_id,
        recapId: r.id,
        text: text.trim(),
        points: r.points,
        variants: r.variants,
        frequency: r.frequency,
        period: { from: r.period_from, to: r.period_to },
        options: r.options,
      });
      showToast.success(`Récap envoyé à ${r.consultantName}.`);
      remove(r.id);
      setOpen(null);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  async function skip(r: PendingRecap) {
    try {
      await skipRecap(supabase, r.id);
      remove(r.id);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5" data-testid="pending-recaps">
      <h2 className="text-base font-semibold">Récaps à valider</h2>
      {recaps.map((r) => {
        const labels = r.options.filter((o) => r.points.includes(o.id)).map((o) => o.label);
        return (
          <div key={r.id} className="flex flex-col gap-2 border-t border-divider pt-3 first-of-type:border-0 first-of-type:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">
                  {RECAP_PERIOD[r.frequency].label} · {r.consultantName}
                </span>
                <span className="text-xs text-stone">
                  {r.status === 'nothing'
                    ? 'Pas de récap cette fois : rien de nouveau à encourager.'
                    : `${labels.join(' · ') || 'Rappel de porter l’objet'} · du ${shortDate(r.period_from)} au ${shortDate(r.period_to)}`}
                </span>
              </div>
              {r.status !== 'nothing' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(open === r.id ? null : r.id);
                      setText(r.body ?? '');
                    }}
                  >
                    Relire et envoyer
                  </Button>
                  <Link href={`/consultants/${r.consultant_id}?tab=Objet%20connect%C3%A9`} className="inline-flex h-8 items-center rounded-lg px-3 text-xs text-stone hover:text-charcoal">
                    Modifier les points
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => void skip(r)}>
                    Pas cette fois
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => void skip(r)}>
                  Masquer
                </Button>
              )}
            </div>
            {open === r.id ? (
              <div className="flex flex-col gap-2">
                <textarea aria-label={`Récap pour ${r.consultantName}`} value={text} onChange={(e) => setText(e.target.value)} rows={7} className="rounded-xl border border-divider bg-ink px-3 py-2.5 text-sm leading-relaxed" />
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void send(r)} loading={sending} disabled={!text.trim()}>
                    Envoyer à {r.consultantName}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
