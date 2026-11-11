'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Lightbulb } from 'lucide-react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { RECAP_PERIOD, listFr, parisDay, scheduleShort, type RecapSettings } from '@/lib/wearables/insights';
import { listPendingRecaps, sendRecap, skipRecap, type PendingRecap } from '@/lib/wearables/insights/queries';

type Row = PendingRecap & { settings: RecapSettings | null };

/**
 * Revue du matin : carte « Récap à valider » de la maquette (RevueMatin, consultant Amina).
 * Rien ne part sans « Envoyer ».
 */
export function PendingRecapsCard({ onDone }: { onDone?: (what: string, name: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [composing, setComposing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const recaps = await listPendingRecaps(supabase);
      if (!recaps.length) return setRows([]);
      const { data } = await supabase.from('wearable_recap_settings').select('*').in('consultant_id', recaps.map((r) => r.consultant_id));
      const byId = new Map(((data ?? []) as (RecapSettings & { consultant_id: string })[]).map((s) => [s.consultant_id, s]));
      setRows(recaps.map((r) => ({ ...r, settings: byId.get(r.consultant_id) ?? null })));
    })().catch(() => setRows([]));
  }, []);

  if (!rows.length) return null;
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const today = parisDay(new Date());

  async function send(r: Row) {
    setBusy(true);
    try {
      await sendRecap(supabase, { consultantId: r.consultant_id, recapId: r.id, text: text.trim(), points: r.points, variants: r.variants, frequency: r.frequency, period: { from: r.period_from, to: r.period_to }, options: r.options });
      showToast.success(`Récap envoyé à ${r.consultantName}, avec une notification dans l’app.`);
      remove(r.id);
      setComposing(null);
      onDone?.('Récap envoyé', r.consultantName);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function skip(r: Row) {
    try {
      await skipRecap(supabase, r.id);
      remove(r.id);
      onDone?.('Récap non envoyé cette fois', r.consultantName);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  const secondary = 'flex min-h-[44px] flex-1 items-center justify-center rounded-[10px] border border-divider bg-surface-raised px-3.5 py-2 text-sm text-charcoal';

  return (
    <>
      {rows.map((r) => {
        const P = RECAP_PERIOD[r.frequency];
        const labels = r.options.filter((o) => r.points.includes(o.id)).map((o) => o.label.charAt(0).toLowerCase() + o.label.slice(1));
        const isNothing = r.status === 'nothing';
        const signal = isNothing
          ? 'Pas de récap cette fois : rien de nouveau à encourager.'
          : r.status === 'not_enough'
            ? `Pas assez de nuits mesurées pour son récap ${P.queue} : un rappel de porter l’objet est proposé.`
            : `Son récap ${P.queue} est prêt : ${listFr(labels)}.`;
        const isNew = r.prepared_for === today;
        return (
          <article key={r.id} className="flex flex-col gap-4 rounded-2xl border border-divider bg-surface p-5" data-testid="pending-recap">
            <div className="flex flex-wrap items-start gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sage text-sm font-semibold text-ink">
                {r.consultantFullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/consultants/${r.consultant_id}?tab=Objet%20connect%C3%A9`} className="text-base font-semibold text-charcoal hover:text-sage">
                    {r.consultantFullName}
                  </Link>
                  <span className="rounded-full bg-[#23383B] px-2.5 py-[3px] text-xs font-medium text-sage">Récap à valider</span>
                  <span className="inline-flex items-center gap-[5px] rounded-full border border-[#2A3140] px-2.5 py-[3px] text-xs font-medium text-stone">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {isNew ? 'Nouveau ce matin' : `Préparé le ${r.prepared_for.slice(8, 10)}/${r.prepared_for.slice(5, 7)}`}
                  </span>
                </div>
                <span className="text-[15px] text-charcoal">{signal}</span>
                <span className="text-[13px] text-stone">
                  Proposé {r.settings ? scheduleShort(r.settings) : 'régulièrement'} depuis sa page Objet connecté · sans chiffres · rien ne part sans votre validation.
                </span>
              </div>
            </div>
            {!isNothing ? (
              <div className="flex gap-2.5 rounded-[10px] bg-surface-raised px-3.5 py-3 text-sm leading-normal text-charcoal">
                <Lightbulb className="mt-[3px] h-4 w-4 flex-none text-sage" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Piste :</strong> relisez le message, ajustez si besoin, puis envoyez. Il arrive dans sa messagerie avec une notification.
                </span>
              </div>
            ) : null}
            {composing === r.id ? (
              <div className="flex flex-col gap-2.5">
                <label htmlFor={`recap-${r.id}`} className="text-[13px] text-stone">
                  Récap {P.queue} pour {r.consultantName}
                </label>
                <textarea id={`recap-${r.id}`} rows={9} value={text} onChange={(e) => setText(e.target.value)} className="w-full resize-y rounded-[10px] border border-divider bg-surface-raised px-3.5 py-3 text-sm leading-normal text-charcoal" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setComposing(null)} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
                    Annuler
                  </button>
                  <button type="button" onClick={() => void send(r)} disabled={busy || !text.trim()} className="h-11 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-70">
                    Envoyer
                  </button>
                </div>
              </div>
            ) : isNothing ? (
              <div className="flex">
                <button type="button" onClick={() => void skip(r)} className={secondary}>
                  Vu
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposing(r.id);
                    setText(r.body ?? '');
                  }}
                  className="min-h-[44px] flex-[1_1_220px] rounded-[10px] bg-sage px-3.5 py-2 text-sm font-semibold text-ink"
                >
                  Relire et envoyer à {r.consultantName}
                </button>
                <Link href={`/consultants/${r.consultant_id}?tab=Objet%20connect%C3%A9&recap=1`} className={`${secondary} flex-[1_1_200px]`}>
                  Modifier les points
                </Link>
                <button type="button" onClick={() => void skip(r)} className={`${secondary} flex-[1_1_160px]`}>
                  Pas cette fois
                </button>
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}
