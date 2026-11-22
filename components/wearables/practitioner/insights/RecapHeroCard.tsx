'use client';

import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { computeRecap, recapHeroPeriod, type Insights, type RecapFrequency, type Who } from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import type { RecapRow } from '@/lib/wearables/insights/queries';

/**
 * Encart « Message à … » : le récap des points importants à relire avant l'envoi.
 * Toujours visible en tête de l'onglet Objet connecté (quel que soit l'écran de la lecture guidée).
 * Le même contenu est proposé dans la Revue du matin les jours prévus par le praticien.
 */
export function RecapHeroCard({
  input,
  insights,
  who,
  draft,
  sent,
  onOpenRecap,
}: {
  input: LoadedInsights;
  insights: Insights;
  who: Who;
  draft: RecapRow | null;
  sent: boolean;
  onOpenRecap: () => void;
}) {
  // Le brouillon préparé par le job quotidien, sinon le calcul en direct.
  const hero = useMemo(() => {
    if (draft) {
      const freq = draft.frequency as RecapFrequency;
      const items = draft.options.filter((o) => draft.points.includes(o.id) && o.id !== 'wear');
      const live = computeRecap(input, freq);
      return { period: recapHeroPeriod(freq, { from: draft.period_from, to: draft.period_to }), items, none: draft.status === 'draft' ? null : live.noneText };
    }
    const r = insights.recap;
    const items = r.options.filter((o) => o.checked && o.id !== 'wear');
    return { period: recapHeroPeriod(r.frequency, r.period), items, none: r.status === 'ok' ? null : r.noneText };
  }, [draft, input, insights.recap]);

  return (
    <section aria-labelledby="hero-t" className="flex flex-col gap-4 rounded-2xl border border-[#2F5A50] bg-[#16201F] p-[22px]">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sage/15 text-sage">
          <MessageSquare className="h-4.5 w-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-sage">Message à {who.first} · {hero.period.toLowerCase()}</span>
          <h3 id="hero-t" className="font-serif text-[22px] font-medium leading-tight">
            {hero.items.length ? `Le récap ${who.first.match(/^[aeiouyhàâéèêîïôû]/i) ? 'd’' : 'de '}${who.first}, à relire avant l’envoi` : `Un mot pour ${who.first} ?`}
          </h3>
          <p className="text-[13px] text-stone">
            AFEIA prépare un récap des points positifs à partir de ses nuits. Vous le relisez, l’ajustez ou écrivez le vôtre, puis il part dans sa messagerie AFEIA. Rien n’est envoyé sans vous.
          </p>
        </div>
      </div>
      {hero.items.length ? (
        <ul className="flex flex-col gap-2 pl-12">
          {hero.items.map((h) => (
            <li key={h.id} className="flex gap-2.5 text-[15px] leading-snug">
              <span aria-hidden className="mt-[7px] h-2 w-2 flex-none rounded-full bg-sage" />
              <span title={h.why}>{h.label}</span>
            </li>
          ))}
        </ul>
      ) : hero.none ? (
        <p className="pl-12 text-sm text-stone">{hero.none.replace(/ Vous pouvez écrire un message libre\.?$/, '')}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pl-12">
        <button type="button" onClick={onOpenRecap} className="h-11 rounded-[10px] bg-sage px-4 text-sm font-semibold text-ink">
          {sent ? `✓ Envoyé à ${who.first}` : hero.items.length ? `Relire et envoyer à ${who.first}` : `Écrire un message à ${who.first}`}
        </button>
        <span className="text-xs text-stone">{sent ? 'Visible dans sa messagerie et dans « Mes nuits ».' : 'Vous pourrez modifier le texte avant l’envoi.'}</span>
      </div>
    </section>
  );
}
