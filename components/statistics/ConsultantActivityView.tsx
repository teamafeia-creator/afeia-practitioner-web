'use client';

import { useState, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import {
  CAUSES,
  DOMAINS,
  DOMAIN_COLORS,
  DOMAIN_LABELS,
  DOMAIN_SHORT,
  INACTIVE_DAYS,
  SIGNAL_SOURCES,
  STEP_LABELS,
  STEP_SHORT,
  type ActivityResult,
  type Domain,
  type InactiveRow,
} from '@/lib/statistics/activity';
import { AnswerModal, RelanceModal, SurveyModal } from './DropoutModals';

export type ActivityTab = 'actifs' | 'inactifs';

function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
function ago(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n = Math.round((a - b) / 86400000);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'hier' : `il y a ${n} jours`;
}
const fr1 = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const card = 'rounded-2xl border border-divider bg-surface';

function Avatar({ id, name }: { id: string; name: string }) {
  return (
    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-ink" style={{ background: colorOf(id) }}>
      {initialsOf(name)}
    </span>
  );
}

function Bar({ l, v, w, c }: { l: string; v: string; w: number; c: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex justify-between text-sm text-charcoal">
        <span>{l}</span>
        <span className="tabular-nums text-stone">{v}</span>
      </div>
      <span className="h-2 overflow-hidden rounded bg-surface-raised">
        <span className="block h-full rounded" style={{ width: `${Math.max(0, Math.min(100, w))}%`, background: c }} />
      </span>
    </div>
  );
}

/** Drill-down « Activité des consultants » (clic sur Consultants actifs / Fidélisation). */
export function ConsultantActivityView({
  result,
  loading,
  error,
  sentence,
  periods,
  tab,
  onTab,
  onBack,
  onChanged,
  signature,
  bookingUrl,
}: {
  result: ActivityResult | null;
  loading: boolean;
  error: string | null;
  sentence: string;
  periods: ReactNode;
  tab: ActivityTab;
  onTab: (t: ActivityTab) => void;
  onBack: () => void;
  onChanged: () => void;
  signature: string;
  bookingUrl: string | null;
}) {
  const [domain, setDomain] = useState<'all' | Domain>('all');
  const [sur, setSur] = useState<InactiveRow | null>(null);
  const [ans, setAns] = useState<InactiveRow | null>(null);
  const [rel, setRel] = useState<InactiveRow | null>(null);

  const header = (
    <>
      <nav className="flex items-center gap-2 text-sm">
        <button type="button" onClick={onBack} className="text-sage hover:text-sage-dark">← Statistiques</button>
        <span className="text-mist">/</span>
        <span className="text-stone">Activité des consultants</span>
      </nav>
      <section className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-medium text-charcoal">Activité des consultants</h1>
          <p className="text-[15px] text-stone">{sentence} Actif : au moins une séance, un message, une saisie de journal ou une case cochée.</p>
        </div>
        {periods}
      </section>
    </>
  );

  if (!result) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16">{loading ? <Spinner size="lg" /> : <p className="text-sm text-stone">{error ? 'L’activité n’a pas pu être chargée.' : 'Aucune donnée.'}</p>}</div>
      </>
    );
  }

  const r = result;
  const withSurvey = r.inactive.filter((x) => x.survey).length;
  const kpis = [
    { l: 'Consultants actifs', v: String(r.active.length), s: `sur ${r.followed} consultant${r.followed > 1 ? 's' : ''} suivi${r.followed > 1 ? 's' : ''}`, c: '#E8EDF4' },
    {
      l: 'Jours actifs en moyenne',
      v: r.avgDays === null ? '—' : `${fr1(r.avgDays)} / 30`,
      s: r.medianDays === null ? 'Sur les 30 derniers jours' : `Médiane ${fr1(r.medianDays)} jour${r.medianDays >= 2 ? 's' : ''} · 30 derniers jours`,
      c: '#E8EDF4',
    },
    { l: 'Devenus inactifs', v: String(r.inactive.length), s: r.inactive.length ? `Dont ${withSurvey} avec questionnaire envoyé` : `Aucun consultant sans activité depuis ${INACTIVE_DAYS} jours`, c: r.inactive.length ? '#E8A87C' : '#E8EDF4' },
    {
      l: 'Durée médiane de suivi',
      v: r.medianFollowMonths === null ? '—' : r.medianFollowMonths < 1 ? `${Math.max(1, Math.round(r.medianFollowMonths * 30.4))} j` : `${fr1(r.medianFollowMonths)} mois`,
      s: 'Avant arrêt ou fin d’accompagnement',
      c: '#E8EDF4',
    },
  ];
  const shownActive = r.active.filter((a) => domain === 'all' || a.domains.includes(domain));
  const maxBucket = Math.max(1, ...r.dayBuckets.map((b) => b.n));
  const pillCls = (on: boolean) => `h-8 rounded-lg px-3 text-[13px] font-medium ${on ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`;

  // Étapes du parcours
  const answered = r.inactive.filter((x) => x.survey?.answer).length;
  const todo = r.inactive.filter((x) => x.survey && !x.relancedAt && !x.closedAt).length;
  const flow = [
    { n: '1', t: 'Détecter', d: 'Afeia repère le décrochage dans vos données : séances, rendez-vous annulés, journal, cases cochées, messages.', k: `${r.inactive.length} consultant${r.inactive.length > 1 ? 's' : ''} concerné${r.inactive.length > 1 ? 's' : ''}`, c: '#E8A87C' },
    { n: '2', t: 'Demander', d: 'Vous envoyez un questionnaire de 2 questions (30 secondes) pour connaître la raison. Vous le validez avant l’envoi.', k: `${withSurvey} questionnaire${withSurvey > 1 ? 's' : ''} envoyé${withSurvey > 1 ? 's' : ''}`, c: '#A9B8EC' },
    { n: '3', t: 'Comprendre', d: 'La réponse arrive dans vos messages et vous la classez. Sans réponse, la cause est supposée d’après les données.', k: `${answered} réponse${answered > 1 ? 's' : ''} classée${answered > 1 ? 's' : ''}`, c: '#D9C9F0' },
    { n: '4', t: 'Agir', d: 'Un message adapté à la cause, que vous relisez, ou la clôture de l’accompagnement si tout va bien.', k: `${todo} action${todo > 1 ? 's' : ''} à faire`, c: '#6DD4B8' },
  ];
  const maxReason = Math.max(1, ...r.reasons.map((x) => x.n));
  const maxStep = Math.max(1, ...r.steps.map((s) => s.n));
  const topStep = [...r.steps].sort((a, b) => b.n - a.n)[0];
  const stepsInsight =
    topStep && r.inactive.length >= 3
      ? `${STEP_LABELS[topStep.key]} : ${topStep.n} décrochage${topStep.n > 1 ? 's' : ''} sur ${r.inactive.length}.${
          topStep.key === 'apres1' ? ' Proposer la 2e séance dès la fin de la 1re pourrait réduire ce chiffre.' : ''
        }`
      : null;

  return (
    <>
      {header}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {kpis.map((k) => (
          <div key={k.l} className={`flex flex-col gap-1.5 p-[18px] ${card}`}>
            <span className="text-[13px] text-stone">{k.l}</span>
            <span className="font-serif text-[32px] tabular-nums" style={{ color: k.c }}>{k.v}</span>
            <span className="text-xs leading-[1.45] text-stone">{k.s}</span>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Consultants" className="flex gap-1 border-b border-divider">
        {(
          [
            ['actifs', 'Actifs', r.active.length],
            ['inactifs', 'Inactifs', r.inactive.length],
          ] as const
        ).map(([k, l, n]) => {
          const on = tab === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => onTab(k)} className="-mb-px h-11 border-b-2 px-4 text-[15px] font-medium" style={{ borderColor: on ? '#6DD4B8' : 'transparent', color: on ? '#E8EDF4' : '#8B95A5' }}>
              {l} <span className="text-stone">{n}</span>
            </button>
          );
        })}
      </div>

      {tab === 'actifs' && (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex-[1_1_200px] text-base font-semibold text-charcoal">Qui est actif</h2>
              <div role="group" aria-label="Domaine" className="flex flex-wrap gap-1 rounded-xl border border-divider bg-surface p-1">
                <button type="button" aria-pressed={domain === 'all'} onClick={() => setDomain('all')} className={pillCls(domain === 'all')}>Tous</button>
                {DOMAINS.map((d) => (
                  <button key={d} type="button" aria-pressed={domain === d} onClick={() => setDomain(d)} className={pillCls(domain === d)}>{DOMAIN_SHORT[d]}</button>
                ))}
              </div>
            </div>
            <div className={`overflow-x-auto ${card}`}>
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone">
                    <th scope="col" className="px-[18px] py-3.5 font-medium">Consultant</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">Jours actifs / 30</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">Domaines</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">Motif</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">Suivi depuis</th>
                    <th scope="col" className="py-3.5 pl-2 pr-[18px] font-medium">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {shownActive.map((a) => (
                    <tr key={a.id} className="border-t border-divider">
                      <td className="px-[18px] py-3">
                        <span className="flex items-center gap-2.5 text-charcoal"><Avatar id={a.id} name={a.name} />{a.name}</span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-[90px] overflow-hidden rounded bg-surface-raised">
                            <span className="block h-full" style={{ width: `${Math.round((a.days30 / 30) * 100)}%`, background: a.days30 >= 15 ? '#6DD4B8' : a.days30 >= 6 ? '#7B93DB' : '#E8A87C' }} />
                          </span>
                          <span className="tabular-nums text-[#B8C1CF]">{a.days30}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[13px] text-[#B8C1CF]">{a.domains.map((d) => DOMAIN_SHORT[d]).join(' · ')}</td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{a.concern ? cap(a.concern) : '—'}</td>
                      <td className="px-2 py-3 text-[#B8C1CF]">{a.since ? monthFmt.format(new Date(a.since)) : '—'}</td>
                      <td className="py-3 pl-2 pr-[18px] text-[#B8C1CF]">{ago(a.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shownActive.length === 0 && (
                <p className="p-7 text-center text-sm text-stone">{r.active.length ? 'Aucun consultant actif dans ce domaine sur la période.' : 'Aucun consultant actif sur la période.'}</p>
              )}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <section className={`flex flex-[1_1_320px] flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-base font-semibold text-charcoal">Par domaine</h2>
              <span className="text-xs text-stone">Part des consultants actifs qui utilisent chaque domaine sur la période.</span>
              {r.active.length === 0 ? (
                <span className="text-sm text-stone">Pas encore de consultant actif sur la période.</span>
              ) : (
                r.domainShare.map((d) => <Bar key={d.d} l={DOMAIN_LABELS[d.d]} v={`${d.pct} %`} w={d.pct} c={DOMAIN_COLORS[d.d]} />)
              )}
            </section>
            <section className={`flex flex-[1_1_320px] flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-base font-semibold text-charcoal">Jours d’activité</h2>
              <span className="text-xs text-stone">Nombre de jours avec au moins une action (journal, message, case cochée, séance, objet connecté) sur les 30 derniers jours.</span>
              {r.dayBuckets.map((b) => (
                <div key={b.l} className="grid grid-cols-[130px_minmax(0,1fr)_40px] items-center gap-2.5 text-sm text-charcoal">
                  <span>{b.l}</span>
                  <span className="h-[18px] overflow-hidden rounded-[5px] bg-surface-raised">
                    <span className="block h-full" style={{ width: `${Math.round((b.n / maxBucket) * 100)}%`, background: b.c }} />
                  </span>
                  <span className="text-right tabular-nums text-stone">{b.n}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {tab === 'inactifs' && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-charcoal">Consultants qui décrochent</h2>
            <div className={`overflow-x-auto ${card}`}>
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone">
                    <th scope="col" className="px-[18px] py-3.5 font-medium">Consultant</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">1 · Ce qu’Afeia a détecté</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">2 · Questionnaire</th>
                    <th scope="col" className="px-2 py-3.5 font-medium">3 · Cause</th>
                    <th scope="col" className="py-3.5 pl-2 pr-[18px] font-medium">4 · Action</th>
                  </tr>
                </thead>
                <tbody>
                  {r.inactive.map((x) => {
                    const first = x.name.split(' ')[0];
                    const s = x.survey;
                    const q = !s
                      ? { l: 'Pas encore envoyé', bg: '#2A3140', fg: '#C9CFDA' }
                      : s.answer
                        ? { l: 'Répondu', bg: '#23383B', fg: '#6DD4B8' }
                        : s.reply
                          ? { l: 'Réponse reçue · à classer', bg: '#2B2230', fg: '#D9B8E8' }
                          : { l: `Envoyé le ${dayFmt.format(new Date(s.sentAt))} · en attente`, bg: '#1F2640', fg: '#A9B8EC' };
                    const cause = s?.answer
                      ? { l: CAUSES[s.answer.cause], sub: `Réponse au questionnaire${s.answer.point ? ` · refaire le point : ${s.answer.point}` : ''}`, fg: '#E8EDF4' }
                      : s?.reply
                        ? { l: `« ${s.reply.text.slice(0, 60)}${s.reply.text.length > 60 ? '…' : ''} »`, sub: 'Réponse dans la messagerie, à classer', fg: '#E8EDF4' }
                        : s
                          ? { l: 'En attente de réponse', sub: 'Supposée d’après les données : ' + CAUSES[x.guessedCause].toLowerCase(), fg: '#8B95A5' }
                          : { l: `${CAUSES[x.guessedCause]} ?`, sub: 'Supposée d’après les données, à confirmer', fg: '#8B95A5' };
                    let btn: { l: string; on?: () => void; primary: boolean; done?: boolean };
                    if (x.closedAt) btn = { l: '✓ Accompagnement clôturé', primary: false, done: true };
                    else if (x.relancedAt) btn = { l: '✓ Message envoyé', primary: false, done: true };
                    else if (s?.answer) btn = { l: s.answer.cause === 'mieux' ? 'Clôturer l’accompagnement' : 'Envoyer le message adapté', on: () => setRel(x), primary: true };
                    else if (s?.reply) btn = { l: 'Classer la réponse', on: () => setAns(x), primary: true };
                    else if (s) btn = { l: 'Écrire sans attendre', on: () => setRel(x), primary: false };
                    else btn = { l: 'Envoyer le questionnaire', on: () => setSur(x), primary: true };
                    return (
                      <tr key={x.id} className="border-t border-divider align-top">
                        <td className="px-[18px] py-3.5">
                          <span className="flex items-center gap-2.5 text-charcoal">
                            <Avatar id={x.id} name={x.name} />
                            <span className="flex flex-col">
                              <span>{x.name}</span>
                              <span className="text-xs text-stone">{x.concern ? `${cap(x.concern)} · ` : ''}arrêt {STEP_SHORT[x.step]}</span>
                            </span>
                          </span>
                        </td>
                        <td className="max-w-[260px] px-2 py-3.5">
                          <span className="flex flex-col gap-0.5">
                            <span className="text-charcoal">{x.signalText}</span>
                            <span className="text-xs text-stone">Source : {SIGNAL_SOURCES[x.signal]}</span>
                          </span>
                        </td>
                        <td className="px-2 py-3.5">
                          <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold" style={{ background: q.bg, color: q.fg }}>{q.l}</span>
                        </td>
                        <td className="max-w-[220px] px-2 py-3.5">
                          <span className="flex flex-col gap-0.5">
                            <span style={{ color: cause.fg }}>{cause.l}</span>
                            <span className="text-xs text-stone">{cause.sub}</span>
                          </span>
                        </td>
                        <td className="py-3.5 pl-2 pr-[18px]">
                          <span className="flex flex-col items-start gap-1">
                            <button
                              type="button"
                              onClick={btn.on}
                              disabled={btn.done}
                              aria-label={`${btn.l} — ${first}`}
                              className="h-[34px] whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium"
                              style={{ borderColor: btn.primary ? '#6DD4B8' : '#2A3140', background: btn.primary ? '#6DD4B8' : 'transparent', color: btn.primary ? '#0A0E14' : btn.done ? '#6DD4B8' : '#E8EDF4' }}
                            >
                              {btn.l}
                            </button>
                            {s && !s.answer && !btn.done && (
                              <button type="button" onClick={() => (s.reply ? setRel(x) : setAns(x))} className="h-6 text-xs text-sage">
                                {s.reply ? 'Écrire sans attendre' : 'Saisir sa réponse'}
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {r.inactive.length === 0 && <p className="p-7 text-center text-sm text-stone">Aucun consultant ne décroche : tous ont eu une activité ces {INACTIVE_DAYS} derniers jours ou ont un rendez-vous prévu.</p>}
            </div>
          </section>

          <section aria-label="Comment ça marche" className={`flex flex-col gap-3.5 p-5 ${card}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-charcoal">Quand un consultant décroche</h2>
              <span className="text-[13px] text-stone">4 étapes, de la détection à l’action · chaque message est validé par vous</span>
            </div>
            <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5 p-0">
              {flow.map((w) => (
                <li key={w.n} className="flex flex-col gap-1.5 rounded-xl bg-surface-raised p-3.5">
                  <span className="flex items-center gap-2">
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-sage-light text-[13px] font-bold text-sage">{w.n}</span>
                    <span className="text-sm font-semibold text-charcoal">{w.t}</span>
                  </span>
                  <span className="text-[13px] leading-normal text-[#B8C1CF]">{w.d}</span>
                  <span className="text-xs font-semibold" style={{ color: w.c }}>{w.k}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-wrap gap-3">
            <section className={`flex flex-[1_1_340px] flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-base font-semibold text-charcoal">Pourquoi ils arrêtent</h2>
              <span className="text-xs leading-[1.45] text-stone">
                Réponses au questionnaire de décrochage · 12 derniers mois · {r.answers12m} réponse{r.answers12m > 1 ? 's' : ''} sur {r.surveysSent12m} envoyé{r.surveysSent12m > 1 ? 's' : ''}
                {r.surveysSent12m ? ` (${Math.round((r.answers12m / r.surveysSent12m) * 100)} %)` : ''}
              </span>
              {r.reasons.length === 0 ? (
                <span className="text-sm text-stone">Les raisons apparaîtront ici dès les premières réponses au questionnaire.</span>
              ) : (
                r.reasons.map((m) => (
                  <Bar
                    key={m.cause}
                    l={CAUSES[m.cause]}
                    v={`${m.n} · ${Math.round((m.n / Math.max(1, r.answers12m)) * 100)} %`}
                    w={(m.n / maxReason) * 100}
                    c={m.cause === 'mieux' ? '#6DD4B8' : m.cause === 'temps' || m.cause === 'cout' ? '#A9B8EC' : m.cause === 'autre' ? '#8B95A5' : '#E8A87C'}
                  />
                ))
              )}
            </section>
            <section className={`flex flex-[1_1_340px] flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-base font-semibold text-charcoal">À quel moment ils arrêtent</h2>
              <span className="text-xs leading-[1.45] text-stone">Dernière étape franchie avant le décrochage · {r.inactive.length} consultant{r.inactive.length > 1 ? 's' : ''} inactif{r.inactive.length > 1 ? 's' : ''}</span>
              {r.steps.length === 0 && <span className="text-sm text-stone">Aucun décrochage à analyser pour l’instant.</span>}
              {r.steps.map((s, i) => (
                <div key={s.key} className="grid grid-cols-[minmax(140px,200px)_minmax(0,1fr)_28px] items-center gap-2.5 text-sm text-charcoal">
                  <span>{STEP_LABELS[s.key]}</span>
                  <span className="h-2 overflow-hidden rounded bg-surface-raised">
                    <span className="block h-full" style={{ width: `${Math.round((s.n / maxStep) * 100)}%`, background: i === 0 && s.n === maxStep ? '#E8A87C' : '#7B93DB' }} />
                  </span>
                  <span className="text-right tabular-nums">{s.n}</span>
                </div>
              ))}
              {stepsInsight && <p className="rounded-[10px] bg-surface-raised px-3 py-2.5 text-[13px] leading-normal text-[#C9CFDA]">{stepsInsight}</p>}
            </section>
          </div>
        </>
      )}

      <p className="text-xs text-mist">
        Indicateurs d’usage, non médicaux. Un consultant est inactif après {INACTIVE_DAYS} jours sans séance, message, saisie de journal ni case cochée, et sans rendez-vous à venir.
      </p>

      <SurveyModal row={sur} onClose={() => setSur(null)} onDone={onChanged} />
      <AnswerModal row={ans} onClose={() => setAns(null)} onDone={onChanged} />
      <RelanceModal row={rel} onClose={() => setRel(null)} onDone={onChanged} signature={signature} bookingUrl={bookingUrl} />
    </>
  );
}
