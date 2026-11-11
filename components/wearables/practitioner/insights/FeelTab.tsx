'use client';

import { useMemo } from 'react';
import { ENERGY_MAX, addDays, chartData, dayDate, dayRange, shortDate, type Insights, type Phase, type Who } from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import { BarChart } from './BarChart';

const PHASE_COLOR: Record<Phase, string> = { m: '#E57B7B', f: '#6DD4B8', o: '#D4A574', l: '#B89FD9' };

/** Onglet « Ressenti & cycle » (maquette 19e). */
export function FeelTab({ input, insights, who, onOpenCycle }: { input: LoadedInsights; insights: Insights; who: Who; onOpenCycle: () => void }) {
  const f = insights.feel;
  const y = addDays(input.today, -1);
  const hrv = useMemo(() => chartData(input, insights.series, 'hrv', dayRange(addDays(y, -13), y)), [input, insights.series, y]);
  const step = 856 / 14;
  const fx = (i: number) => 44 + (i + 0.5) * step;
  const ey = (e: number) => 84 - (e / ENERGY_MAX) * 70;
  const refLabel = input.lastSessionDate ? `avant la séance du ${shortDate(input.lastSessionDate)}` : 'sur les 28 nuits précédentes';

  return (
    <>
      <section className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Ce {who.que} ressent, ce que l’objet mesure</h3>
          <span className="text-xs text-stone">Énergie notée dans le journal et VFC de la nuit · 14 derniers jours, même axe de dates</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">
            Énergie notée par {who.first} <span className="font-normal text-stone">· 1 (bas) à {ENERGY_MAX} (haut)</span>
          </span>
          <svg viewBox="0 0 900 110" width="100%" role="img" aria-label={`Énergie notée par ${who.first} sur 14 jours`} className="block overflow-visible">
            {[ENERGY_MAX, ENERGY_MAX / 2, 1].map((v) => (
              <g key={v}>
                <line x1={44} y1={ey(v)} x2={900} y2={ey(v)} stroke="#1F2633" strokeWidth={1} />
                <text x={38} y={ey(v) + 4} textAnchor="end" fill="#8B95A5" fontSize={11}>
                  {v}
                </text>
              </g>
            ))}
            {f.feel.map((d, i) =>
              d.energy === null ? (
                <text key={d.day} x={fx(i)} y={96} textAnchor="middle" fill="#5C6573" fontSize={11}>
                  rien noté
                </text>
              ) : (
                <rect key={d.day} x={fx(i) - 13} y={ey(d.energy)} width={26} height={(d.energy / ENERGY_MAX) * 70} rx={4} fill={d.gap ? '#E8A87C' : '#7B93DB'}>
                  <title>{`${dayDate(d.day)} · énergie ${d.energy} / ${ENERGY_MAX}`}</title>
                </rect>
              )
            )}
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">
            VFC de la nuit <span className="font-normal text-stone">· en millisecondes</span>
          </span>
          <BarChart metric="hrv" data={hrv} />
        </div>
        <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-[#B8C1CF]">
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-2.5 rounded-[3px] bg-[#E8A87C]" />
            En orange, en haut : jour où ce {who.que} ressent ne colle pas avec la mesure
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-2.5 rounded-[3px] bg-[#E8A87C]" />
            En orange, en bas : nuit en dessous de son habituel
          </span>
          {f.hrvBand ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-[22px] rounded-sm bg-[rgba(232,237,244,0.14)]" />
              Bande grise = sa VFC habituelle {refLabel} ({f.hrvBand.label})
            </span>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-5">
          <h3 className="text-base font-semibold">Décalages à explorer en séance</h3>
          {f.gaps.map((g, i) => (
            <div key={i} className="flex gap-2.5 border-t border-[#1F2633] py-2.5">
              <span className="w-[62px] flex-none text-[13px] font-semibold">{g.date}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm leading-snug">{g.text}</span>
                {g.sub ? <span className="text-xs text-stone">{g.sub}</span> : null}
              </span>
            </div>
          ))}
          <span className="text-xs leading-normal text-stone">Un décalage n’est pas une erreur : c’est souvent là que la discussion est la plus utile.</span>
        </section>

        {f.phaseRows ? (
          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold">Selon la phase du cycle</h3>
              <button type="button" onClick={onOpenCycle} className="text-[13px] text-sage">
                Onglet Cycle →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th scope="col" className="py-1.5 text-left font-medium text-stone">Phase</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium text-stone">Sommeil</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium text-stone">VFC</th>
                    <th scope="col" className="py-1.5 pl-2 text-right font-medium text-stone">FC de la nuit</th>
                  </tr>
                </thead>
                <tbody>
                  {f.phaseRows.map((r) => (
                    <tr key={r.phase} className="border-t border-[#1F2633]">
                      <th scope="row" className="py-2.5 text-left font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PHASE_COLOR[r.phase] }} />
                          {r.label}
                          <span className="font-normal text-stone">· {r.nights}</span>
                        </span>
                      </th>
                      {r.cells.map((c) => (
                        <td key={c.metric} className="py-2.5 pl-2 text-right tabular-nums">
                          <span className={c.value === '—' ? 'text-stone' : c.strong ? 'font-semibold' : ''}>{c.value}</span>
                          <span className="block text-[11px] text-stone">{c.delta}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="text-xs leading-normal text-stone">
              Moyennes par phase sur 28 nuits, comparées à sa moyenne générale. Une phase n’est affichée qu’à partir de 3 nuits mesurées. Phases estimées à partir des dates de règles saisies par {who.first}.
            </span>
          </section>
        ) : null}
      </div>
    </>
  );
}
