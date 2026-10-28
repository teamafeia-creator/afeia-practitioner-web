'use client';

import { CONSTITUTION_MAP, DIATHESE_MAP, EMUNCTORIES, SURCHARGE_TYPES } from '@/lib/terrain-constants';
import type { ConsultantTerrain, ConstitutionType, DiatheseType } from '@/lib/types';

type Props = {
  terrain: Partial<ConsultantTerrain>;
  onEdit: () => void;
  onToConseillancier: () => void;
};

const VITAL: { value: string; label: string }[] = [
  { value: 'epuisee', label: 'Épuisée' },
  { value: 'basse', label: 'Basse' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
];
const SURCHARGE: Record<string, { n: number; label: string }> = {
  absent: { n: 0, label: 'Absente' },
  leger: { n: 1, label: 'Légère' },
  modere: { n: 2, label: 'Modérée' },
  important: { n: 3, label: 'Marquée' },
};
const TONE = {
  ok: { dot: '#6DD4B8', bg: '#23383B', fg: '#6DD4B8' },
  slow: { dot: '#D4A574', bg: '#373131', fg: '#E8A87C' },
  over: { dot: '#E8A87C', bg: '#373131', fg: '#E8A87C' },
  ko: { dot: '#E57B7B', bg: '#3A2224', fg: '#F2A3A3' },
  na: { dot: '#5C6573', bg: '#1C2230', fg: '#C9CFDA' },
};
const STATUS: Record<string, { tone: keyof typeof TONE; label: string }> = {
  fonctionnel: { tone: 'ok', label: 'Fonctionnel' },
  ralenti: { tone: 'slow', label: 'Ralenti' },
  reactif: { tone: 'slow', label: 'Réactif' },
  sous_exploite: { tone: 'slow', label: 'Sous-exploité' },
  surcharge: { tone: 'over', label: 'Surchargé' },
  bloque: { tone: 'ko', label: 'Bloqué' },
};

const card = 'flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5';

export function TerrainSummary({ terrain, onEdit, onToConseillancier }: Props) {
  const t = terrain as Record<string, string | null | undefined>;
  const evaluated = [
    !!terrain.force_vitale,
    !!(terrain.constitution || terrain.temperament_description || terrain.diathese_menetrier),
    SURCHARGE_TYPES.some((s) => !!t[s.key]),
    EMUNCTORIES.some((e) => !!t[e.fieldStatus]),
  ].filter(Boolean).length;
  const date = terrain.bilan_date ? new Date(terrain.bilan_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const consti = [
    { l: 'Constitution', v: terrain.constitution ? CONSTITUTION_MAP[terrain.constitution as ConstitutionType]?.label : null },
    { l: 'Secondaire', v: terrain.constitution_secondary ? CONSTITUTION_MAP[terrain.constitution_secondary as ConstitutionType]?.label : null },
    { l: 'Tempérament', v: terrain.temperament_description || null },
    { l: 'Diathèse', v: terrain.diathese_menetrier ? DIATHESE_MAP[terrain.diathese_menetrier as DiatheseType]?.label : null },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[26px] font-medium">Bilan de terrain</h2>
          <span className="text-sm text-stone">
            {evaluated} rubrique{evaluated > 1 ? 's' : ''} sur 4 évaluée{evaluated > 1 ? 's' : ''}
            {date ? ` · bilan du ${date}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="h-10 rounded-[10px] border border-divider px-3.5 text-sm hover:border-sage">
            Modifier
          </button>
          <button type="button" onClick={onToConseillancier} className="h-10 rounded-[10px] bg-sage-light px-3.5 text-sm font-semibold text-sage hover:bg-sage/20">
            Reporter dans le conseillancier →
          </button>
        </div>
      </div>

      <section className={card}>
        <h3 className="text-base font-semibold">Force vitale</h3>
        <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-divider bg-cream p-1" role="img" aria-label={`Force vitale : ${VITAL.find((v) => v.value === terrain.force_vitale)?.label ?? 'non évaluée'}`}>
          {VITAL.map((v) => {
            const on = v.value === terrain.force_vitale;
            return (
              <span key={v.value} className="flex h-11 items-center justify-center rounded-lg text-sm font-medium" style={{ background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#8B95A5' }}>
                {v.label}
              </span>
            );
          })}
        </div>
        <p className="text-sm text-stone">{terrain.force_vitale_notes?.trim() || (terrain.force_vitale ? 'Pas de note.' : 'À évaluer en séance.')}</p>
      </section>

      <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <section className={card}>
          <h3 className="text-base font-semibold">Constitution & tempérament</h3>
          <dl className="grid grid-cols-2 gap-x-[18px] gap-y-3.5">
            {consti.map((c) => (
              <div key={c.l} className="flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">{c.l}</dt>
                <dd className="text-[15px]" style={{ color: c.v ? '#E8EDF4' : '#8B95A5' }}>
                  {c.v || 'Non renseignée'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={card}>
          <h3 className="text-base font-semibold">Surcharges</h3>
          {SURCHARGE_TYPES.map((s) => {
            const lvl = t[s.key] ? SURCHARGE[t[s.key] as string] : null;
            const n = lvl?.n ?? 0;
            return (
              <div key={s.key} className="grid grid-cols-[90px_minmax(0,1fr)_80px] items-center gap-3">
                <span className="text-sm">{s.label}</span>
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-2.5 rounded-[3px]" style={{ background: lvl && i < n ? (n >= 2 ? '#E8A87C' : '#6DD4B8') : '#2A3140' }} />
                  ))}
                </div>
                <span className="text-right text-[13px] text-stone">{lvl?.label ?? 'Non évaluée'}</span>
              </div>
            );
          })}
          {terrain.surcharges_notes?.trim() ? <p className="text-[13px] text-stone">{terrain.surcharges_notes}</p> : null}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Émonctoires</h3>
          <div className="flex flex-wrap gap-3 text-xs text-stone">
            {(['ok', 'slow', 'over', 'na'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: TONE[k].dot }} />
                {k === 'ok' ? 'Fonctionnel' : k === 'slow' ? 'Ralenti' : k === 'over' ? 'Surchargé' : 'Non évalué'}
              </span>
            ))}
          </div>
        </div>
        {EMUNCTORIES.map((e) => {
          const st = t[e.fieldStatus] ? STATUS[t[e.fieldStatus] as string] : null;
          const tone = TONE[st?.tone ?? 'na'];
          const note = (t[e.fieldNotes] ?? '').trim();
          return (
            <div key={e.key} className="flex flex-wrap items-center gap-3 border-t border-divider py-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
              <span className="flex-[0_1_180px] text-[15px] font-medium">{e.label}</span>
              <span className="flex-[1_1_240px] text-sm" style={{ color: note ? '#C9CFDA' : '#8B95A5' }}>
                {note || (st ? 'Pas de note.' : 'À évaluer en séance')}
              </span>
              <span className="rounded-full px-2.5 py-[3px] text-xs font-medium" style={{ background: tone.bg, color: tone.fg }}>
                {st?.label ?? 'Non évalué'}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
