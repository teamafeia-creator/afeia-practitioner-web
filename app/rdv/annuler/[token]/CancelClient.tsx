'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const eur = (c: number) => `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: c % 100 ? 2 : 0 })} €`;

export function CancelClient(props: {
  token: string;
  startsAt: string;
  alreadyCancelled: boolean;
  typeName: string;
  practitioner: string;
  slug: string | null;
  hours: number;
  depositCents: number;
  visio: boolean;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(props.alreadyCancelled ? 'done' : 'idle');
  const [result, setResult] = useState<{ refunded: boolean; kept: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = new Date(props.startsAt);
  const inTime = start.getTime() - Date.now() > props.hours * 3600000;
  const past = start.getTime() < Date.now();

  async function cancel() {
    setState('busy');
    try {
      const res = await fetch(`/api/booking/cancel/${props.token}`, { method: 'POST' });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error || 'L’annulation a échoué.');
      setResult({ refunded: !!b.refunded, kept: !!b.kept });
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’annulation a échoué.');
      setState('error');
    }
  }

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-[20px] border border-divider bg-surface p-6 sm:p-8">
      <h1 className="font-serif text-[28px] font-medium">{state === 'done' ? 'Rendez-vous annulé' : 'Annuler votre rendez-vous'}</h1>
      <div className="flex flex-col gap-1 rounded-[14px] bg-surface-raised p-4 text-sm">
        <span className="font-semibold first-letter:uppercase">{fmt.format(start)}</span>
        <span className="text-[#B8C1CF]">{props.typeName} avec {props.practitioner}{props.visio ? ' · en visio' : ''}</span>
      </div>
      {state === 'done' ? (
        <>
          <p className="text-[15px] text-[#B8C1CF]">
            {props.practitioner} a été prévenu·e.
            {result?.refunded ? ' Votre acompte vous sera remboursé sous quelques jours.' : ''}
            {result?.kept ? ' L’annulation intervient moins de ' + props.hours + ' h avant la séance : l’acompte est conservé.' : ''}
          </p>
          {props.slug && (
            <a href={`/rdv/${props.slug}`} className="inline-flex h-11 items-center justify-center rounded-[10px] bg-sage px-4 text-sm font-semibold text-ink">
              Reprendre un rendez-vous
            </a>
          )}
        </>
      ) : past ? (
        <p className="text-[15px] text-stone">Cette séance est déjà passée.</p>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed text-[#B8C1CF]">
            {props.depositCents > 0
              ? inTime
                ? `Vous annulez plus de ${props.hours} h avant la séance : votre acompte de ${eur(props.depositCents)} sera remboursé.`
                : `Vous annulez moins de ${props.hours} h avant la séance : votre acompte de ${eur(props.depositCents)} sera conservé.`
              : 'Le créneau sera libéré pour une autre personne.'}
          </p>
          {error && <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-4 py-3 text-sm text-[#F2D2BB]">{error}</div>}
          <button type="button" onClick={() => void cancel()} disabled={state === 'busy'} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E57B7B] text-[15px] font-semibold text-ink disabled:opacity-70">
            {state === 'busy' && <Spinner size="sm" />}
            Annuler le rendez-vous
          </button>
          {props.slug && <a href={`/rdv/${props.slug}`} className="text-center text-sm text-sage">Garder mon rendez-vous</a>}
        </>
      )}
    </div>
  );
}
