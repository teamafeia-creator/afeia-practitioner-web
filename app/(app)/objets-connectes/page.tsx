'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/hooks/useAuth';
import { useWearableSignals, type ConsultantSignalRow } from '@/hooks/useWearableSignals';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { SIGNAL_CTA, SIGNAL_LABEL, signalMessage, type SignalKind } from '@/lib/wearables/insights';
import { loadPractitionerName } from '@/lib/wearables/insights/load';
import { reviewSignal, sendPractitionerMessage } from '@/lib/wearables/insights/queries';

const COL: Record<SignalKind, string> = { gap: '#E8A87C', wear: '#8B95A5', good: '#6DD4B8', ok: '#5C6573' };
type Filter = 'all' | 'gap' | 'wear' | 'good';

function Spark({ row }: { row: ConsultantSignalRow }) {
  const c = row.signal;
  const pv = c.values.filter((x): x is number => x !== null);
  if (!pv.length) return <svg viewBox="0 0 150 40" width="150" height="40" aria-hidden />;
  const lo = Math.min(...pv, c.band?.[0] ?? Infinity);
  const hi = Math.max(...pv, c.band?.[1] ?? -Infinity);
  const y = (v: number) => 36 - ((v - lo) / (hi - lo || 1)) * 32;
  const x = (i: number) => 4 + (i / 13) * 142;
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  const gaps: { start: number; end: number }[] = [];
  let g: { start: number; end: number } | null = null;
  const out: { x: number; y: number; c: string }[] = [];
  c.values.forEach((v, i) => {
    if (v === null) {
      if (cur.length) segs.push(cur), (cur = []);
      if (g) g.end = i;
      else gaps.push((g = { start: i, end: i }));
      return;
    }
    g = null;
    cur.push([x(i), y(v)]);
    const o = c.band ? (v < c.band[0] ? -1 : v > c.band[1] ? 1 : 0) : 0;
    if (o !== 0) out.push({ x: x(i), y: y(v), c: o * c.better > 0 ? '#6DD4B8' : '#E8A87C' });
  });
  if (cur.length) segs.push(cur);
  return (
    <svg viewBox="0 0 150 40" width="150" height="40" role="img" aria-label={`${row.signal.metric === 'sleep' ? 'Sommeil' : row.signal.metric === 'hrv' ? 'VFC' : row.signal.metric === 'hr' ? 'FC de la nuit' : 'Pas'} de ${row.name} sur 14 nuits`} className="block overflow-visible">
      {c.band ? <rect x="0" y={y(c.band[1])} width="150" height={Math.max(0, y(c.band[0]) - y(c.band[1]))} fill="#6DD4B8" opacity="0.1" /> : null}
      {gaps.map((q, i) => (
        <rect key={i} x={x(q.start) - 5} y="2" width={x(q.end) - x(q.start) + 10} height="36" fill="#1C2230" />
      ))}
      {segs.map((s, i) => (
        <path key={i} d={s.map((q, j) => `${j ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ')} fill="none" stroke="#6DD4B8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {out.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3.5" fill={d.c} stroke="#151A23" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

const ML = { sleep: 'Sommeil', hrv: 'VFC', hr: 'FC de la nuit', steps: 'Pas' } as const;

/** Page « Objets connectés » (menu Suivi), reprise de la maquette ObjetTri. */
export default function ObjetsConnectesPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const { data, isLoading } = useWearableSignals(isAuthenticated);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<ConsultantSignalRow | null>(null);
  const [text, setText] = useState('');
  const [practitioner, setPractitioner] = useState('');
  const [status, setStatus] = useState<Record<string, 'seen' | 'sent'>>({});

  useEffect(() => {
    loadPractitionerName(supabase).then((p) => setPractitioner(p.first)).catch(() => undefined);
  }, []);

  if (authLoading || isLoading) return <SkeletonDashboard />;
  if (!isAuthenticated) return null;

  const C = data ?? [];
  const st = (r: ConsultantSignalRow) => status[r.consultantId] ?? r.status;
  const cnt = (k: SignalKind) => C.filter((c) => c.signal.kind === k).length;
  const open = C.filter((c) => (c.signal.kind === 'gap' || c.signal.kind === 'wear') && !st(c)).length;
  const good = cnt('good');
  const ok = cnt('ok');
  const summary = `${open ? `${open} consultant${open > 1 ? 's' : ''} à regarder` : 'Personne à regarder'} · ${good} ${good > 1 ? 'bonnes nouvelles' : 'bonne nouvelle'} · ${ok} sans signal · ${C.length} ${C.length > 1 ? 'objets connectés' : 'objet connecté'}`;
  const shown = C.filter((c) => filter === 'all' || c.signal.kind === filter);

  async function mark(r: ConsultantSignalRow, s: 'seen' | 'sent') {
    setStatus((m) => ({ ...m, [r.consultantId]: s }));
    try {
      await reviewSignal(supabase, r.consultantId, r.signal.key, s);
      void queryClient.invalidateQueries({ queryKey: ['wearable-signals'] });
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action non enregistrée.');
    }
  }

  async function send() {
    if (!modal || !text.trim()) return;
    try {
      await sendPractitionerMessage(supabase, modal.consultantId, text.trim());
      await mark(modal, 'sent');
      showToast.success(`Message envoyé à ${modal.firstName}.`);
      setModal(null);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Message non envoyé.');
    }
  }

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[32px] font-medium leading-tight">Objets connectés</h1>
          <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-sage">À regarder cette semaine</span>
          <p className="text-[15px] text-stone">{summary}</p>
        </div>
        <div role="group" aria-label="Filtrer" className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', `Tous (${C.length})`],
              ['gap', `Écart durable (${cnt('gap')})`],
              ['wear', `Objet non porté (${cnt('wear')})`],
              ['good', `Bonnes nouvelles (${good})`],
            ] as [Filter, string][]
          ).map(([id, l]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`h-9 rounded-full border px-3 text-[13px] font-medium ${filter === id ? 'border-sage bg-[#23383B] text-sage' : 'border-divider text-charcoal'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-divider bg-surface">
        {!shown.length ? <p className="p-5 text-sm text-stone">Aucun consultant avec un objet connecté pour l’instant.</p> : null}
        {shown.map((r) => {
          const s = st(r);
          const todo = r.signal.kind !== 'ok' && !s;
          return (
            <div key={r.consultantId} className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5 border-t border-[#1F2633] px-5 py-4 first:border-0" style={{ opacity: r.signal.kind === 'ok' || s ? 0.6 : 1 }}>
              <span aria-hidden className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-[#23383B] text-[13px] font-semibold text-sage">
                {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-[3px]">
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/consultants/${r.consultantId}?tab=Objet%20connect%C3%A9`} className="text-[15px] font-semibold text-charcoal">
                    {r.name}
                  </Link>
                  <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#1C2230] px-2.5 text-xs font-medium text-[#B8C1CF]">
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: COL[r.signal.kind] }} />
                    {SIGNAL_LABEL[r.signal.kind]}
                  </span>
                </span>
                <span className="text-sm leading-snug">{r.signal.text}</span>
                <span className="text-xs text-stone">{r.signal.meta}</span>
              </div>
              <div className="flex flex-none flex-col items-end gap-0.5">
                <Spark row={r} />
                <span className="text-[11px] text-stone">{ML[r.signal.metric]} · 14 nuits</span>
              </div>
              <div className="flex flex-[0_0_216px] flex-col items-stretch gap-1.5">
                {todo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setModal(r);
                        setText(signalMessage(r.signal.kind, r.firstName, practitioner));
                      }}
                      className="h-9 rounded-[9px] border border-[#2F5A50] bg-[#1C2E2A] px-3 text-[13px] font-semibold text-sage"
                    >
                      {SIGNAL_CTA[r.signal.kind]}
                    </button>
                    <button type="button" onClick={() => void mark(r, 'seen')} className="h-[30px] rounded-lg px-3 text-xs text-stone">
                      Vu, rien à faire
                    </button>
                  </>
                ) : s ? (
                  <span className="text-right text-[13px] text-stone">{s === 'sent' ? '✓ Message envoyé' : '✓ Vu'}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>
      <p className="text-xs leading-relaxed text-stone">
        Un signal apparaît quand une mesure sort de la plage habituelle du consultant au moins 4 nuits sur 7, ou quand l’objet n’a pas synchronisé depuis 5 jours. Chaque consultant est comparé à lui-même, jamais à une norme. Ce sont des repères de bien-être, pas des alertes médicales. Aucun message ne part sans votre validation.
      </p>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,12,0.72)] p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="tm-t" className="flex w-full max-w-[560px] flex-col gap-3.5 rounded-[18px] border border-divider bg-surface p-[22px] shadow-2xl">
            <div className="flex items-start gap-2.5">
              <div className="flex flex-1 flex-col gap-[3px]">
                <h3 id="tm-t" className="text-[17px] font-semibold">
                  Message à {modal.firstName}
                </h3>
                <span className="text-[13px] text-stone">{modal.signal.text}</span>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Fermer" className="h-9 w-9 flex-none rounded-[9px] border border-divider text-lg">
                ×
              </button>
            </div>
            <textarea aria-label="Message" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="w-full resize-y rounded-[10px] border border-divider bg-ink p-3 text-sm leading-relaxed" />
            <span className="text-xs leading-normal text-stone">Brouillon préparé à partir du signal, sans chiffre ni terme médical. Relisez et adaptez avant d’envoyer.</span>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="h-10 rounded-[10px] border border-divider px-3.5 text-sm">
                Annuler
              </button>
              <button type="button" onClick={() => void send()} className="h-10 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
