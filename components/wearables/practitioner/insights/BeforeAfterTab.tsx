'use client';

import { shortDate, type Insights } from '@/lib/wearables/insights';
import { Empty } from './OverviewTab';

const VERDICT_COLOR = { fav: '#6DD4B8', watch: '#E8A87C', flat: '#8B95A5' } as const;

/** Onglet « Avant / après le conseillancier » (maquette 19c). */
export function BeforeAfterTab({ insights, onOpenPlan }: { insights: Insights; onOpenPlan: () => void }) {
  const r = insights.beforeAfter;
  if (r.status === 'no_plan') return <Empty title="Aucun conseillancier partagé pour l’instant." text="La comparaison commencera au premier partage." />;
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Avant et depuis le {shortDate(r.shareDate)}</h3>
          <span className="text-xs text-stone">
            Conseillancier v{r.version} partagé ce jour-là · {r.subtitle}
          </span>
        </div>
        <button type="button" onClick={onOpenPlan} className="text-[13px] text-sage">
          Voir le conseillancier v{r.version} →
        </button>
      </div>
      {r.rows.map((row) => {
        const mx = Math.max(row.before ?? 0, row.after ?? 0) || 1;
        return (
          <div key={row.metric} className="flex flex-col gap-2 border-t border-[#1F2633] pt-3.5" aria-label={row.status === 'ok' ? `${row.label} : ${row.beforeText} en moyenne avant, ${row.afterText} depuis` : undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{row.label}</span>
              <span className="text-xs font-semibold" style={{ color: row.verdict ? VERDICT_COLOR[row.verdict] : '#8B95A5' }}>
                {row.verdictLabel}
              </span>
            </div>
            {row.status === 'ok' ? (
              <>
                {[
                  { l: `Avant le ${shortDate(r.shareDate)}`, v: row.before!, t: row.beforeText!, c: '#5C6573' },
                  { l: 'Depuis', v: row.after!, t: row.afterText!, c: '#6DD4B8' },
                ].map((b) => (
                  <div key={b.l} className="grid grid-cols-[120px_1fr_90px] items-center gap-3 text-xs">
                    <span className="text-stone">{b.l}</span>
                    <span className="h-2.5 rounded-full bg-[#1C2230]">
                      <span className="block h-full rounded-full" style={{ width: `${Math.round((b.v / mx) * 100)}%`, background: b.c }} />
                    </span>
                    <span className="text-right tabular-nums">{b.t}</span>
                  </div>
                ))}
              </>
            ) : null}
            <span className="text-sm text-[#C9CFDA]">{row.sentence}</span>
          </div>
        );
      })}
      <p className="border-t border-[#1F2633] pt-3 text-xs text-stone">Une observation, pas une preuve : d’autres choses ont pu changer.</p>
    </section>
  );
}
