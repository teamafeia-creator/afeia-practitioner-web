'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Lightbulb, MessageSquare } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useMorningReview } from '@/hooks/useMorningReview';
import { useReviewActivity } from '@/hooks/useReviewActivity';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import {
  sendMessageFromReview,
  saveObservationNote,
  remindTomorrow,
  markReviewSeen,
  markReviewCompleted,
  undoReviewAction,
  type ReviewAction,
} from '@/lib/morning-review/queries';
import {
  FACE_COLORS,
  REVIEW_MAX,
  REVIEW_THRESHOLD,
  SIGNAL_TAGS,
  displayName,
  firstNameOf,
  initialsOf,
} from '@/lib/morning-review/queue';
import { contextFor, sparkFor } from '@/lib/morning-review/presentation';
import type { ConsultantSummary } from '@/lib/morning-review/types';

const FIRST_SEEN_KEY = 'afeia.review.firstSeen';

const ACTION_LABEL: Record<ReviewAction['type'], string> = {
  send_message: 'Message envoyé',
  note_observation: '🔒 Ajouté aux notes privées',
  remind_tomorrow: '🔔 Rappel demain',
  review_seen: 'Vu',
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/** Date à laquelle chaque consultant est apparu dans la revue (confort local, par navigateur). */
function useFirstSeen(ids: string[]): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  const key = ids.join(',');
  useEffect(() => {
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(window.localStorage.getItem(FIRST_SEEN_KEY) || '{}');
    } catch {
      stored = {};
    }
    const now = new Date().toISOString();
    const next: Record<string, string> = {};
    for (const id of ids) next[id] = stored[id] ?? now;
    try {
      window.localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible : l'ancienneté repartira de ce matin */
    }
    setMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

export default function MorningReviewPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const queryClient = useQueryClient();
  const review = useMorningReview();
  const activity = useReviewActivity();
  const [composing, setComposing] = useState<{ id: string; kind: 'message' | 'note' } | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const completedLogged = useRef(false);

  const summaries = useMemo(() => review.data?.consultantsSummary ?? [], [review.data]);
  const today = useMemo(() => activity.data?.today ?? [], [activity.data]);
  const remindCounts = useMemo(() => activity.data?.remindCounts ?? {}, [activity.data]);
  const firstRemind = useMemo(() => activity.data?.firstRemind ?? {}, [activity.data]);

  // Consultants du jour : ceux au-dessus du seuil + ceux déjà traités ce matin
  const treatedIds = useMemo(() => new Set(today.map((a) => a.consultant_id)), [today]);
  const byId = useMemo(() => new Map(summaries.map((s) => [s.consultant.id, s])), [summaries]);
  const candidates = useMemo(
    () => summaries.filter((s) => s.attentionScore >= REVIEW_THRESHOLD).sort((a, b) => b.attentionScore - a.attentionScore).slice(0, REVIEW_MAX),
    [summaries]
  );
  const queueIds = candidates.map((s) => s.consultant.id).filter((id) => !treatedIds.has(id));
  const firstSeen = useFirstSeen(queueIds);

  const queue = useMemo(() => {
    const now = new Date();
    return candidates
      .filter((s) => !treatedIds.has(s.consultant.id))
      .map((s) => {
        const id = s.consultant.id;
        const seen = firstSeen[id] ? new Date(firstSeen[id]) : now;
        const remindStart = firstRemind[id] ? new Date(firstRemind[id]) : now;
        const days = daysBetween(seen < remindStart ? seen : remindStart, now);
        return { s, days, snoozes: remindCounts[id] ?? 0 };
      })
      .sort((a, b) => b.days - a.days || b.s.attentionScore - a.s.attentionScore);
  }, [candidates, treatedIds, firstSeen, firstRemind, remindCounts]);

  const log = today
    .slice()
    .reverse()
    .filter((a, i, arr) => arr.findIndex((b) => b.consultant_id === a.consultant_id) === i)
    .map((a) => ({ action: a, summary: byId.get(a.consultant_id) }));

  const doneCount = log.length;
  const total = queue.length + doneCount;
  const allDone = total > 0 && queue.length === 0;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  useEffect(() => {
    if (allDone && !completedLogged.current) {
      completedLogged.current = true;
      void markReviewCompleted();
    }
  }, [allDone]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['review-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['morning-review'] }),
    ]);
  };

  const run = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(id);
    try {
      await fn();
      setComposing(null);
      if (ok) showToast.success(ok);
      await refresh();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(null);
    }
  };

  const undo = (a: ReviewAction, name: string) =>
    run(a.id, () => undoReviewAction(a), a.type === 'send_message' ? `Le message reste envoyé. ${name} revient dans la file.` : a.type === 'note_observation' && a.appended ? `Note retirée. ${name} revient dans la file.` : `${name} revient dans la file.`);

  const resetAll = async () => {
    setBusy('all');
    try {
      for (const { action } of log) await undoReviewAction(action);
      completedLogged.current = false;
      await refresh();
    } catch {
      showToast.error('Impossible de tout remettre dans la file');
    } finally {
      setBusy(null);
    }
  };

  // Vue d'ensemble · 7 derniers jours
  const panorama = useMemo(() => {
    const active = summaries.filter((s) => s.attentionLevel !== 'insufficient');
    const n = active.length;
    const cutoff = Date.now() - 14 * 86400000;
    const silent = active.filter((s) => !s.consultant.journalEntries.some((e) => new Date(e.date).getTime() >= cutoff)).length;
    const withJournal = active.filter((s) => s.lastWeekStats.journalEntriesCount > 0);
    const fill = n ? active.reduce((acc, s) => acc + Math.min(1, s.lastWeekStats.journalEntriesCount / 7), 0) / n : null;
    const adherence = withJournal.length ? withJournal.reduce((acc, s) => acc + s.lastWeekStats.averageAdherence, 0) / withJournal.length : null;
    const pctLabel = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`);
    return [
      { l: 'Consultants silencieux depuis 14 j', v: n ? `${silent} / ${n}` : '—', w: n ? (silent / n) * 100 : 0, c: '#E8A87C' },
      { l: 'Journaux remplis', v: pctLabel(fill), w: (fill ?? 0) * 100, c: '#7B93DB' },
      { l: 'Recommandations suivies', v: pctLabel(adherence), w: (adherence ?? 0) * 100, c: '#6DD4B8' },
    ];
  }, [summaries]);

  if (authLoading || review.isLoading || activity.isLoading) {
    return <SkeletonDashboard />;
  }
  if (!isAuthenticated) return null;
  if (review.error) {
    return (
      <div className="rounded-2xl border border-divider bg-surface p-8 text-center">
        <p className="mb-4 text-stone">La revue du matin n’a pas pu être chargée.</p>
        <button type="button" onClick={() => review.refetch()} className="text-sm font-medium text-sage hover:text-sage-dark">
          Réessayer
        </button>
      </div>
    );
  }

  const sent = log.filter((l) => l.action.type === 'send_message').length;
  const summaryLine = `${sent} message${sent > 1 ? 's' : ''} envoyé${sent > 1 ? 's' : ''}, ${doneCount - sent} suivi${doneCount - sent > 1 ? 's' : ''} consigné${doneCount - sent > 1 ? 's' : ''}. Bonne journée.`;

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <Toaster />
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <Link href="/dashboard" className="text-sm text-sage hover:text-sage-dark">← Tableau de bord</Link>
          <h1 className="font-serif text-[36px] font-medium leading-tight text-charcoal">Revue du matin</h1>
          <p className="text-[15px] text-stone">Ce qui a bougé depuis hier soir chez vos consultants. Indicateurs de bien-être, non médicaux.</p>
        </div>
        {total > 0 && (
          <div className="flex min-w-[240px] flex-col gap-2">
            <div className="flex justify-between text-[13px] text-stone">
              <span>Progression</span>
              <span className="font-semibold text-charcoal">{doneCount} / {total}</span>
            </div>
            <div role="progressbar" aria-label="Consultants traités" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} className="h-2 overflow-hidden rounded bg-divider">
              <div className="h-full rounded bg-sage transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="File d'attention" className="flex min-w-0 flex-[2_1_560px] flex-col gap-3.5">
          {(allDone || total === 0) && (
            <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-divider bg-surface px-8 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-light text-sage">
                <Check className="h-[30px] w-[30px]" />
              </span>
              <h2 className="font-serif text-[26px] font-medium text-charcoal">{total === 0 ? 'Rien à regarder ce matin' : 'Revue terminée'}</h2>
              <p className="max-w-[420px] text-[15px] text-stone">
                {total === 0 ? 'Aucun consultant ne montre de signal particulier depuis hier. Bonne journée.' : summaryLine}
              </p>
              <Link href="/dashboard" className="inline-flex h-11 items-center rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep">
                Retour au tableau de bord
              </Link>
            </div>
          )}

          {queue.map(({ s, days, snoozes }, idx) => (
            <ReviewCard
              key={s.consultant.id}
              summary={s}
              color={FACE_COLORS[idx % FACE_COLORS.length]}
              days={days}
              snoozes={snoozes}
              busy={busy === s.consultant.id}
              composing={composing?.id === s.consultant.id ? composing.kind : null}
              draft={draft}
              onDraft={setDraft}
              onCompose={() => {
                setComposing({ id: s.consultant.id, kind: 'message' });
                setDraft(s.suggestedActions.find((a) => a.templateMessage)?.templateMessage ?? `Bonjour ${firstNameOf(s)}, `);
              }}
              onCancel={() => setComposing(null)}
              onSend={() => {
                if (!draft.trim()) {
                  showToast.error('Le message est vide.');
                  return;
                }
                void run(s.consultant.id, () => sendMessageFromReview(s.consultant.id, draft.trim()), `Message envoyé à ${firstNameOf(s)}`);
              }}
              onNote={() => {
                setComposing({ id: s.consultant.id, kind: 'note' });
                setDraft(`Revue du matin du ${dateFmt.format(new Date())} : ${s.primarySignal?.message ?? 'signal à surveiller'}. `);
              }}
              onSaveNote={() => {
                if (!draft.trim()) {
                  showToast.error('La note est vide.');
                  return;
                }
                void run(s.consultant.id, () => saveObservationNote(s.consultant.id, draft.trim()), `Ajouté aux notes privées de ${firstNameOf(s)}`);
              }}
              onSnooze={() => run(s.consultant.id, () => remindTomorrow(s.consultant.id))}
              onSeen={() => run(s.consultant.id, () => markReviewSeen(s.consultant.id))}
            />
          ))}
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
            <h2 className="text-base font-semibold text-charcoal">Vue d’ensemble · 7 derniers jours</h2>
            {panorama.map((p) => (
              <div key={p.l} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone">{p.l}</span>
                  <span className="font-semibold tabular-nums text-charcoal">{p.v}</span>
                </div>
                <div className="h-1.5 rounded-[3px] bg-divider">
                  <div className="h-full rounded-[3px]" style={{ width: `${Math.round(p.w)}%`, background: p.c }} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-divider bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-charcoal">Traités ce matin</h2>
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={busy === 'all'}
                  className="h-8 rounded-lg border border-divider px-2.5 text-[13px] text-stone hover:text-charcoal disabled:opacity-60"
                >
                  Tout remettre
                </button>
              )}
            </div>
            {doneCount === 0 && <p className="text-sm text-stone">Rien pour l’instant. Chaque action apparaîtra ici.</p>}
            {log.map(({ action, summary }, i) => {
              const name = summary ? displayName(summary) : 'Consultant';
              return (
                <div key={action.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-divider py-2 text-sm">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: FACE_COLORS[i % FACE_COLORS.length] }} />
                  <span className="flex min-w-0 flex-[1_1_120px] flex-col gap-0.5">
                    <span className="font-medium text-charcoal">{name}</span>
                    <span className="text-xs text-stone">{ACTION_LABEL[action.type]}</span>
                  </span>
                  <Link
                    href={`/consultants/${action.consultant_id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-divider px-2.5 text-[13px] text-charcoal hover:border-sage"
                  >
                    Dossier ↗
                  </Link>
                  <button
                    type="button"
                    onClick={() => undo(action, name)}
                    disabled={busy === action.id}
                    aria-label={`Remettre ${name} dans la file`}
                    className="h-8 px-2.5 text-[13px] text-sage hover:text-sage-dark disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewCard(props: {
  summary: ConsultantSummary;
  color: string;
  days: number;
  snoozes: number;
  busy: boolean;
  composing: 'message' | 'note' | null;
  draft: string;
  onDraft: (v: string) => void;
  onCompose: () => void;
  onCancel: () => void;
  onSend: () => void;
  onNote: () => void;
  onSaveNote: () => void;
  onSnooze: () => void;
  onSeen: () => void;
}) {
  const { summary: s, color, days, snoozes, busy } = props;
  const id = s.consultant.id;
  const name = displayName(s);
  const first = firstNameOf(s);
  const signal = s.primarySignal;
  const tag = signal ? SIGNAL_TAGS[signal.category] : null;
  const spark = sparkFor(s);
  const context = contextFor(s);
  const hint = s.suggestedActions.find((a) => a.type !== 'open_dossier')?.description;

  const rep = snoozes > 0 ? ` · reporté ${snoozes} fois` : '';
  const hot = snoozes >= 2;
  const age = days === 0 && snoozes === 0 ? 'Nouveau ce matin' : `Depuis ${Math.max(1, days)} jour${days > 1 ? 's' : ''}${rep}`;
  const ageTitle = days === 0 && snoozes === 0 ? 'Apparu dans la revue ce matin' : `Dans la revue du matin ${age.toLowerCase()}`;

  const secondary =
    'flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-divider bg-surface-raised px-3.5 py-2 text-sm font-medium text-charcoal hover:border-sage disabled:opacity-60';

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-divider bg-surface p-5">
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold text-ink" style={{ background: color }}>
          {initialsOf(name)}
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/consultants/${id}`} className="text-base font-semibold text-charcoal hover:text-sage">{name}</Link>
            {tag && (
              <span className="rounded-full px-2.5 py-[3px] text-xs font-medium" style={{ background: tag.bg, color: tag.fg }}>
                {signal?.iconName === 'MessageSquare' ? 'Message en attente' : tag.label}
              </span>
            )}
            <span
              title={ageTitle}
              className="inline-flex items-center gap-[5px] rounded-full border px-2.5 py-[3px] text-xs font-medium"
              style={{ borderColor: hot ? '#5A4636' : '#2A3140', color: days === 0 && snoozes === 0 ? '#8B95A5' : hot ? '#E8A87C' : '#C9CFDA' }}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {age}
            </span>
          </div>
          {signal && <span className="text-[15px] text-charcoal">{signal.message}.</span>}
          {context && <span className="text-[13px] text-stone">{context}</span>}
        </div>
        {spark && (
          <div className="flex flex-col items-end gap-1">
            <svg width="140" height="44" viewBox="0 0 140 44" role="img" aria-label={spark.label}>
              <line x1="0" y1={spark.baseY} x2="140" y2={spark.baseY} stroke="#2A3140" strokeDasharray="3 3" />
              <polyline points={spark.points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-stone">{spark.caption}</span>
          </div>
        )}
      </div>

      {hint && (
        <div className="flex gap-2.5 rounded-[10px] bg-surface-raised px-3.5 py-3 text-sm leading-normal text-charcoal">
          <Lightbulb className="mt-[3px] h-4 w-4 flex-none text-sage" aria-hidden="true" />
          <span><strong className="font-semibold">Piste :</strong> {hint.charAt(0).toLowerCase() + hint.slice(1)}.</span>
        </div>
      )}

      {props.composing === 'note' ? (
        <div className="flex flex-col gap-2.5">
          <label htmlFor={`note-${id}`} className="flex items-center gap-1.5 text-[13px] text-stone">
            <span aria-hidden="true">🔒</span> Note privée sur {first}, ajoutée à la suite de vos notes · invisible pour {first}
          </label>
          <textarea
            id={`note-${id}`}
            rows={3}
            autoFocus
            value={props.draft}
            onChange={(e) => props.onDraft(e.target.value)}
            className="w-full resize-y rounded-[10px] border border-divider bg-surface-raised px-3.5 py-3 text-sm leading-normal text-charcoal outline-none focus:border-sage"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={props.onCancel} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
              Annuler
            </button>
            <button
              type="button"
              onClick={props.onSaveNote}
              disabled={busy}
              className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep disabled:opacity-70"
            >
              {busy && <Spinner size="sm" />}
              Ajouter aux notes
            </button>
          </div>
        </div>
      ) : props.composing === 'message' ? (
        <div className="flex flex-col gap-2.5">
          <label htmlFor={`msg-${id}`} className="text-[13px] text-stone">Message à {first}</label>
          <textarea
            id={`msg-${id}`}
            rows={3}
            value={props.draft}
            onChange={(e) => props.onDraft(e.target.value)}
            className="w-full resize-y rounded-[10px] border border-divider bg-surface-raised px-3.5 py-3 text-sm leading-normal text-charcoal outline-none focus:border-sage"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={props.onCancel} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">
              Annuler
            </button>
            <button
              type="button"
              onClick={props.onSend}
              disabled={busy}
              className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep disabled:opacity-70"
            >
              {busy && <Spinner size="sm" />}
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(max(200px,calc((100%-24px)/4)),1fr))] gap-2">
          <button
            type="button"
            onClick={props.onCompose}
            disabled={busy}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#2F5A50] bg-sage-light px-3.5 py-2 text-sm font-semibold text-sage disabled:opacity-60"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Écrire à {first}
          </button>
          <button type="button" onClick={props.onNote} disabled={busy} className={secondary}>
            <span aria-hidden="true">🔒</span> Ajouter aux notes privées
          </button>
          <button type="button" onClick={props.onSnooze} disabled={busy} className={secondary}>
            <span aria-hidden="true">🔔</span> Me le rappeler demain
          </button>
          <button type="button" onClick={props.onSeen} disabled={busy} className={secondary}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Vu, rien à faire
          </button>
        </div>
      )}
    </article>
  );
}
