'use client';

import { useMemo, useState } from 'react';
import { buildPhaseMap } from '@/lib/cycle-utils';
import { SYMPTOM_KEYS, SYMPTOM_LABELS } from '@/lib/cycle-constants';
import type { CycleEntry, CyclePhase, CycleProfile, WearableSummary } from '@/lib/types';

type Metric = 'sleep' | 'hrv' | 'activity';
type Phase4 = 'm' | 'f' | 'o' | 'l';

const PC: Record<Phase4, string> = { m: '#E57B7B', f: '#6DD4B8', o: '#D4A574', l: '#B89FD9' };
const PHASE_LABEL: Record<Phase4, string> = { m: 'Menstruelle', f: 'Folliculaire', o: 'Ovulatoire', l: 'Lutéale' };
const to4 = (p: CyclePhase): Phase4 => (p === 'menstrual' ? 'm' : p === 'follicular' ? 'f' : p === 'ovulation' ? 'o' : 'l');

const M: Record<Metric, { label: string; title: string; key: 'sleep_duration' | 'hrv_avg' | 'activity_level'; color: string; fmt: (v: number) => string; lowIsBad: boolean }> = {
  sleep: { label: 'Sommeil', title: 'Durée de sommeil par nuit', key: 'sleep_duration', color: '#6DD4B8', fmt: (v) => fmtH(v), lowIsBad: true },
  hrv: { label: 'VFC', title: 'Variabilité cardiaque nocturne', key: 'hrv_avg', color: '#7B93DB', fmt: (v) => `${Math.round(v)} ms`, lowIsBad: true },
  activity: { label: 'Activité', title: 'Niveau d’activité', key: 'activity_level', color: '#E8A87C', fmt: (v) => `${Math.round(v)} / 100`, lowIsBad: false },
};

function fmtH(v: number) {
  const total = Math.round(v * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

type Props = {
  firstName: string;
  summaries: WearableSummary[];
  cycleProfile: CycleProfile | null;
  cycleStarts: Date[];
  cycleEntries: CycleEntry[];
  cycle: { phase: CyclePhase; cycleDay: number } | null;
};

export function ConnectedObjectPanel({ firstName, summaries, cycleProfile, cycleStarts, cycleEntries, cycle }: Props) {
  const [metric, setMetric] = useState<Metric>('sleep');
  const [days, setDays] = useState<14 | 30>(30);
  const m = M[metric];
  const tracking = !!cycleProfile?.is_tracking && cycleStarts.length > 0;

  const byDate = useMemo(() => new Map(summaries.map((s) => [s.date.slice(0, 10), s])), [summaries]);
  const lastSync = useMemo(() => summaries.reduce<string | null>((acc, s) => (!acc || s.created_at > acc ? s.created_at : acc), null), [summaries]);

  const range = useMemo(() => {
    const end = new Date();
    const out: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      out.push(iso(d));
    }
    return out;
  }, [days]);

  const phaseMap = useMemo(() => {
    if (!tracking || !cycleProfile) return new Map<string, { phase: CyclePhase }>();
    return buildPhaseMap(cycleStarts, cycleProfile.average_cycle_length, cycleProfile.average_period_length, range[0], range[range.length - 1]);
  }, [tracking, cycleProfile, cycleStarts, range]);

  const values = range.map((d) => {
    const v = byDate.get(d)?.[m.key];
    return typeof v === 'number' ? v : null;
  });
  const present = values.filter((v): v is number => v !== null);
  const mean = avg(present);
  const last5 = avg(values.slice(-5).filter((v): v is number => v !== null));
  const lo = present.length ? Math.min(...present) * 0.85 : 0;
  const hi = present.length ? Math.max(...present) * 1.05 : 1;

  // Graphique
  const x0 = 40;
  const W = 860;
  const top = 26;
  const H = 200;
  const step = W / range.length;
  const bw = Math.max(4, step * 0.62);
  const yOf = (v: number) => top + H - ((v - lo) / Math.max(1e-6, hi - lo)) * H;
  const bands: { p: Phase4; start: number; end: number }[] = [];
  range.forEach((d, i) => {
    const ph = phaseMap.get(d);
    if (!ph) return;
    const p = to4(ph.phase);
    const last = bands[bands.length - 1];
    if (last && last.p === p && last.end === i - 1) last.end = i;
    else bands.push({ p, start: i, end: i });
  });
  const tickIdx = days === 30 ? [0, 9, 19, 29] : [0, 6, 13];
  const tickLabel = (i: number) => {
    const back = range.length - 1 - i;
    return back === 0 ? 'cette nuit' : `J−${back}`;
  };

  // Indicateurs
  const kpi = (k: Metric) => {
    const vals = summaries
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => s[M[k].key])
      .filter((v): v is number => typeof v === 'number');
    const recent = avg(vals.slice(0, 5));
    const ref = avg(vals.slice(0, 30));
    if (recent === null) return null;
    const diff = ref ? (recent - ref) / ref : 0;
    const flat = Math.abs(diff) < 0.04;
    const bad = M[k].lowIsBad ? diff < 0 : diff > 0;
    let delta = 'stable';
    if (!flat) {
      const gap = Math.abs(recent - (ref ?? recent));
      const sleepGap = gap >= 1 ? fmtH(gap) : `${Math.round(gap * 60)} min`;
      delta = `${diff > 0 ? '+' : '−'}${k === 'sleep' ? sleepGap : `${Math.round(Math.abs(diff) * 100)} %`} vs moyenne`;
    }
    return { v: M[k].fmt(recent), d: delta, c: flat ? '#8B95A5' : bad ? '#E8A87C' : '#6DD4B8' };
  };
  const kpis = [
    { l: 'Sommeil · 5 dernières nuits', ...(kpi('sleep') ?? { v: '—', d: 'pas de donnée', c: '#8B95A5' }) },
    { l: 'VFC nocturne', ...(kpi('hrv') ?? { v: '—', d: 'pas de donnée', c: '#8B95A5' }) },
    { l: 'Activité', ...(kpi('activity') ?? { v: '—', d: 'pas de donnée', c: '#8B95A5' }) },
    cycle && cycleProfile
      ? { l: 'Cycle', v: `J${cycle.cycleDay}`, d: `Phase ${PHASE_LABEL[to4(cycle.phase)].toLowerCase()} · cycle de ${cycleProfile.average_cycle_length} j`, c: '#D9C9F0' }
      : { l: 'Cycle', v: '—', d: 'Non suivi', c: '#8B95A5' },
  ];

  const insight = (() => {
    if (mean === null || last5 === null) return 'Pas assez de données sur la période pour dégager une tendance.';
    const diff = (last5 - mean) / mean;
    const phaseTxt = cycle ? ` La phase actuelle est ${PHASE_LABEL[to4(cycle.phase)].toLowerCase()} (J${cycle.cycleDay}).` : '';
    if (Math.abs(diff) < 0.05) return `${m.label} stable : les 5 dernières nuits sont proches de la moyenne (${m.fmt(last5)}).${phaseTxt}`;
    const word = diff < 0 ? 'en dessous' : 'au-dessus';
    return `Les 5 dernières nuits sont ${word} de la moyenne de la période (${m.fmt(last5)} contre ${m.fmt(mean)}).${phaseTxt} À mettre en regard du journal.`;
  })();

  // Ressentis × phase sur les 3 derniers cycles
  const corr = useMemo(() => {
    if (!tracking || !cycleProfile || !cycleEntries.length) return null;
    const starts = [...cycleStarts].sort((a, b) => a.getTime() - b.getTime());
    const from = starts[Math.max(0, starts.length - 3)];
    const pm = buildPhaseMap(cycleStarts, cycleProfile.average_cycle_length, cycleProfile.average_period_length, from, new Date());
    const daysPer: Record<Phase4, number> = { m: 0, f: 0, o: 0, l: 0 };
    pm.forEach((v) => (daysPer[to4(v.phase)] += 1));
    const counts: Record<string, Record<Phase4, number>> = {};
    for (const e of cycleEntries) {
      const ph = pm.get(e.date.slice(0, 10));
      if (!ph) continue;
      const p = to4(ph.phase);
      for (const k of SYMPTOM_KEYS) {
        if ((e as unknown as Record<string, unknown>)[`symptom_${k}`] === true) {
          counts[k] ??= { m: 0, f: 0, o: 0, l: 0 };
          counts[k][p] += 1;
        }
      }
    }
    const top4 = Object.entries(counts)
      .sort((a, b) => Object.values(b[1]).reduce((s, x) => s + x, 0) - Object.values(a[1]).reduce((s, x) => s + x, 0))
      .slice(0, 4);
    if (!top4.length) return null;
    return top4.map(([k, c]) => ({
      label: SYMPTOM_LABELS[k as keyof typeof SYMPTOM_LABELS] ?? k,
      cells: (['m', 'f', 'o', 'l'] as Phase4[]).map((p) => {
        const r = daysPer[p] ? c[p] / daysPer[p] : 0;
        return r === 0
          ? { l: '—', bg: '#1C2230', fg: '#8B95A5' }
          : r < 0.2
            ? { l: 'léger', bg: '#2A2E3A', fg: '#C9CFDA' }
            : r < 0.5
              ? { l: 'net', bg: '#3D3346', fg: '#D9C9F0' }
              : { l: 'fort', bg: '#B89FD9', fg: '#0A0E14' };
      }),
    }));
  }, [tracking, cycleProfile, cycleEntries, cycleStarts]);

  const syncAgo = (() => {
    if (!lastSync) return null;
    const h = Math.round((Date.now() - new Date(lastSync).getTime()) / 3_600_000);
    if (h < 1) return 'à l’instant';
    if (h < 24) return `il y a ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'hier' : `il y a ${d} jours`;
  })();

  const pill = (on: boolean) => ({ background: on ? '#23383B' : 'transparent', color: on ? '#6DD4B8' : '#E8EDF4' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {syncAgo ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-sage">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Objet connecté synchronisé {syncAgo}
            </span>
          ) : null}
          <h2 className="font-serif text-[26px] font-medium">Objet connecté{tracking ? ' & cycle' : ''}</h2>
          <span className="text-sm text-stone">{tracking ? `Les nuits de ${firstName}, lues au regard de son cycle.` : `Les nuits de ${firstName} entre deux séances.`}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Indicateur" className="flex gap-1 rounded-[10px] border border-divider p-1">
            {(Object.keys(M) as Metric[]).map((k) => (
              <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)} className="h-9 rounded-lg px-3 text-sm font-medium" style={pill(metric === k)}>
                {M[k].label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Période" className="flex gap-1 rounded-[10px] border border-divider p-1">
            {([14, 30] as const).map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className="h-9 rounded-lg px-3 text-sm font-medium" style={pill(days === d)}>
                {d} jours
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        {kpis.map((k) => (
          <div key={k.l} className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-surface p-4">
            <span className="text-[13px] text-stone">{k.l}</span>
            <span className="font-serif text-[26px] tabular-nums">{k.v}</span>
            <span className="text-xs font-medium" style={{ color: k.c }}>
              {k.d}
            </span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">
            {m.title} · {days} jours
          </h3>
          {tracking ? (
            <div className="flex flex-wrap gap-3 text-xs text-stone">
              {(['m', 'f', 'o', 'l'] as Phase4[]).map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: PC[p] }} />
                  {PHASE_LABEL[p]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {present.length ? (
          <svg viewBox="0 0 920 256" className="h-auto w-full" role="img" aria-label={`${m.title} sur ${days} jours${last5 !== null ? `, moyenne des 5 dernières nuits ${m.fmt(last5)}` : ''}`}>
            {bands.map((b, i) => (
              <rect key={i} x={x0 + b.start * step + 1} y={6} width={(b.end - b.start + 1) * step - 2} height={8} rx={3} fill={PC[b.p]} opacity={0.85} />
            ))}
            {[hi, (lo + hi) / 2, lo].map((v, i) => (
              <g key={i}>
                <line x1={x0} x2={x0 + W} y1={yOf(v)} y2={yOf(v)} stroke="#2A3140" strokeWidth={1} />
                <text x={x0 - 8} y={yOf(v) + 4} textAnchor="end" fontSize={11} fill="#8B95A5">
                  {metric === 'sleep' ? v.toFixed(1) : Math.round(v)}
                </text>
              </g>
            ))}
            {values.map((v, i) =>
              v === null ? null : (
                <rect
                  key={i}
                  x={x0 + i * step + (step - bw) / 2}
                  y={yOf(v)}
                  width={bw}
                  height={Math.max(2, top + H - yOf(v))}
                  rx={2}
                  fill={mean !== null && m.lowIsBad && v < mean * 0.9 ? '#E8A87C' : m.color}
                >
                  <title>{`${tickLabel(i)} : ${m.fmt(v)}`}</title>
                </rect>
              )
            )}
            {mean !== null ? (
              <g>
                <line x1={x0} x2={x0 + W} y1={yOf(mean)} y2={yOf(mean)} stroke="#E8EDF4" strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
                <text x={x0 + W} y={yOf(mean) - 6} textAnchor="end" fontSize={11} fill="#C9CFDA">
                  moyenne {days} j · {m.fmt(mean)}
                </text>
              </g>
            ) : null}
            {tickIdx.map((i) => (
              <text key={i} x={x0 + i * step + step / 2} y={top + H + 20} textAnchor="middle" fontSize={11} fill="#8B95A5">
                {tickLabel(i)}
              </text>
            ))}
          </svg>
        ) : (
          <p className="py-10 text-center text-sm text-stone">Aucune donnée sur cette période.</p>
        )}
        <p className="rounded-xl bg-surface-raised px-3.5 py-3 text-sm leading-relaxed text-[#C9CFDA]">{insight}</p>
      </section>

      {corr ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">Ressentis déclarés × phase</h3>
            <span className="text-xs text-stone">3 derniers cycles</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm">
              <thead>
                <tr className="text-left text-xs text-stone">
                  <th scope="col" className="font-medium">Ressenti</th>
                  {(['m', 'f', 'o', 'l'] as Phase4[]).map((p) => (
                    <th key={p} scope="col" className="text-center font-medium">
                      {PHASE_LABEL[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="pr-2 text-left font-medium">
                      {r.label}
                    </th>
                    {r.cells.map((c, i) => (
                      <td key={i} className="h-9 rounded-lg text-center text-xs font-medium" style={{ background: c.bg, color: c.fg }}>
                        {c.l}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5 rounded-2xl border border-dashed border-divider p-4">
        <h3 className="text-sm font-semibold">Cadre d&apos;usage</h3>
        <p className="text-[13px] leading-relaxed text-stone">
          Indicateurs de bien-être issus d&apos;un objet grand public. Ils éclairent l&apos;accompagnement ; ils ne posent aucun diagnostic et ne servent ni à la contraception ni à la prédiction de fertilité.
        </p>
        {tracking ? <p className="text-[13px] text-stone">La phase affichée est estimée à partir des dates de règles saisies par {firstName}.</p> : null}
      </section>
    </div>
  );
}
