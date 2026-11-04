// Statistiques › Activité des consultants : qui est actif, sur combien de jours, dans quel domaine,
// et qui décroche (Détecter → Demander → Comprendre → Agir).
// Calcul pur à partir des données déjà présentes dans Afeia (séances, messages, journal,
// cases cochées du conseillancier, objet connecté) et des actions consignées du praticien.

export type Domain = 'seances' | 'journal' | 'cases' | 'messages' | 'objet';
export const DOMAINS: Domain[] = ['seances', 'journal', 'cases', 'messages', 'objet'];
export const DOMAIN_LABELS: Record<Domain, string> = {
  seances: 'Séances',
  journal: 'Journal',
  cases: 'Conseillancier (cases cochées)',
  messages: 'Messages',
  objet: 'Objet connecté',
};
export const DOMAIN_SHORT: Record<Domain, string> = { seances: 'Séances', journal: 'Journal', cases: 'Conseillancier', messages: 'Messages', objet: 'Objet connecté' };
export const DOMAIN_COLORS: Record<Domain, string> = { seances: '#6DD4B8', journal: '#7B93DB', cases: '#E8A87C', messages: '#A9B8EC', objet: '#E8A5C6' };

export type Signal = 'seance' | 'journal' | 'cases' | 'rdv' | 'msg';
export const SIGNAL_SOURCES: Record<Signal, string> = {
  seance: 'Rendez-vous et séances',
  journal: 'Journal',
  cases: 'Conseillancier (cases cochées)',
  rdv: 'Agenda',
  msg: 'Messages',
};

export type Cause = 'mieux' | 'temps' | 'cout' | 'conseils' | 'amelio' | 'rdv' | 'silence' | 'autre';
export const CAUSES: Record<Cause, string> = {
  mieux: 'Va mieux, objectif atteint',
  temps: 'Manque de temps',
  cout: 'Coût des séances',
  conseils: 'Conseils difficiles à suivre',
  amelio: 'Pas d’amélioration ressentie',
  rdv: 'Rendez-vous non reprogrammé',
  silence: 'Sans nouvelles',
  autre: 'Autre raison',
};
export const isCause = (v: unknown): v is Cause => typeof v === 'string' && v in CAUSES;

/** Questionnaire de décrochage : 2 questions. */
export const SURVEY_Q1: [Cause, string][] = [
  ['mieux', 'Je vais mieux, j’ai atteint mon objectif'],
  ['temps', 'Je manque de temps'],
  ['cout', 'Le coût est un frein'],
  ['conseils', 'Les conseils sont difficiles à suivre'],
  ['amelio', 'Je ne vois pas d’amélioration'],
  ['autre', 'Autre raison'],
];
export const SURVEY_Q2 = ['Oui', 'Plus tard', 'Non merci'] as const;
export const SURVEY_TITLE_1 = 'Où en êtes-vous de votre accompagnement ?';
export const SURVEY_TITLE_2 = 'Souhaitez-vous qu’on refasse le point ?';

/** Texte complet envoyé au consultant (message dans l'app ou e-mail). */
export function surveyMessage(intro: string) {
  const letters = 'abcdef';
  return [
    intro.trim(),
    '',
    `1. ${SURVEY_TITLE_1}`,
    ...SURVEY_Q1.map(([, l], i) => `   ${letters[i]}) ${l}`),
    '',
    `2. ${SURVEY_TITLE_2} ${SURVEY_Q2.join(' / ')}`,
    '',
    'Il vous suffit de répondre à ce message, par exemple « b, plus tard ».',
  ].join('\n');
}

export const INACTIVE_DAYS = 30;
const DAY = 86400000;

export type StepKey = 'avant1' | 'apres1' | 'plan' | 'apres2' | 'apres3' | 'plus';
export const STEP_LABELS: Record<StepKey, string> = {
  avant1: 'Avant la 1re séance',
  apres1: 'Après la 1re séance',
  plan: 'Après le conseillancier partagé',
  apres2: 'Après la 2e séance',
  apres3: 'Après la 3e séance',
  plus: 'Plus tard',
};
/** « arrêt après … » et « je n'ai pas eu de vos nouvelles depuis … ». */
export const STEP_SHORT: Record<StepKey, string> = {
  avant1: 'avant la 1re séance',
  apres1: 'après la 1re séance',
  plan: 'après le conseillancier',
  apres2: 'après la 2e séance',
  apres3: 'après la 3e séance',
  plus: 'après plusieurs séances',
};
export const STEP_SINCE: Record<StepKey, string> = {
  avant1: 'votre inscription',
  apres1: 'notre première séance',
  plan: 'l’envoi de votre conseillancier',
  apres2: 'notre deuxième séance',
  apres3: 'notre troisième séance',
  plus: 'notre dernière séance',
};

export type RawActivity = {
  consultants: { id: string; name: string; created_at: string; concern: string | null }[];
  appointments: { consultant_id: string; starts_at: string; status: string | null }[];
  messages: { consultant_id: string; sender: string | null; sent_at: string; text: string | null }[];
  journal: { consultant_id: string; date: string }[];
  cases: { consultant_id: string; date: string }[];
  objet: { consultant_id: string; date: string }[];
  plans: { consultant_id: string; shared_at: string | null }[];
  actions: { consultant_id: string | null; type: string; metadata: Record<string, unknown> | null; created_at: string }[];
};

export type ActiveRow = {
  id: string;
  name: string;
  concern: string | null;
  days30: number;
  domains: Domain[];
  since: string | null;
  last: string;
};

export type SurveyState = {
  sentAt: string;
  answer: { cause: Cause; point: string | null; at: string } | null;
  reply: { text: string; at: string } | null;
};

export type InactiveRow = {
  id: string;
  name: string;
  concern: string | null;
  step: StepKey;
  signal: Signal;
  signalText: string;
  lastActivity: string | null;
  inactiveDays: number;
  survey: SurveyState | null;
  relancedAt: string | null;
  closedAt: string | null;
  guessedCause: Cause;
};

export type ActivityResult = {
  followed: number;
  active: ActiveRow[];
  inactive: InactiveRow[];
  domainShare: { d: Domain; pct: number }[];
  dayBuckets: { l: string; n: number; c: string }[];
  avgDays: number | null;
  medianDays: number | null;
  medianFollowMonths: number | null;
  reasons: { cause: Cause; n: number }[];
  surveysSent12m: number;
  answers12m: number;
  steps: { key: StepKey; n: number }[];
};

const CANCELLED = new Set(['cancelled', 'canceled', 'rescheduled', 'no_show', 'noshow']);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const parse = (s: string) => (s.length === 10 ? new Date(`${s}T12:00:00`) : new Date(s));
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function computeActivity(raw: RawActivity, range: { start: Date; end: Date }, now = new Date()): ActivityResult {
  const nowT = now.getTime();
  const by = <T extends { consultant_id: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    xs.forEach((x) => {
      if (!x.consultant_id) return;
      const a = m.get(x.consultant_id);
      if (a) a.push(x);
      else m.set(x.consultant_id, [x]);
    });
    return m;
  };
  const apts = by(raw.appointments);
  const msgs = by(raw.messages);
  const journal = by(raw.journal);
  const cases = by(raw.cases);
  const objet = by(raw.objet);
  const plans = by(raw.plans);
  const actions = by(raw.actions);

  const active: ActiveRow[] = [];
  const inactive: InactiveRow[] = [];
  const follows: number[] = [];
  let followed = 0;
  const since30 = nowT - 30 * DAY;
  const startT = range.start.getTime();
  const endT = range.end.getTime();

  for (const c of raw.consultants) {
    const myApts = (apts.get(c.id) ?? []).map((a) => ({ ...a, t: new Date(a.starts_at).getTime() })).sort((a, b) => a.t - b.t);
    const sessions = myApts.filter((a) => a.t <= nowT && !CANCELLED.has((a.status ?? '').toLowerCase()));
    const upcoming = myApts.some((a) => a.t > nowT && !CANCELLED.has((a.status ?? '').toLowerCase()));
    const myActions = (actions.get(c.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastSurvey = [...myActions].reverse().find((a) => a.type === 'dropout_survey');
    const surveyT = lastSurvey ? new Date(lastSurvey.created_at).getTime() : Infinity;
    const myMsgs = (msgs.get(c.id) ?? []).map((m) => ({ ...m, t: new Date(m.sent_at).getTime() })).sort((a, b) => a.t - b.t);
    // Les messages du consultant dans les 21 jours qui suivent un questionnaire sont sa réponse,
    // pas un retour d'activité (sinon il quitterait la liste des inactifs en répondant).
    const isReply = (t: number) => t >= surveyT && t <= surveyT + 21 * DAY;
    const consultantMsgs = myMsgs.filter((m) => m.sender === 'consultant' && !isReply(m.t));

    const events: { t: number; d: Domain }[] = [
      ...sessions.map((a) => ({ t: a.t, d: 'seances' as Domain })),
      ...consultantMsgs.map((m) => ({ t: m.t, d: 'messages' as Domain })),
      ...(journal.get(c.id) ?? []).map((j) => ({ t: parse(j.date).getTime(), d: 'journal' as Domain })),
      ...(cases.get(c.id) ?? []).map((j) => ({ t: parse(j.date).getTime(), d: 'cases' as Domain })),
      ...(objet.get(c.id) ?? []).map((j) => ({ t: parse(j.date).getTime(), d: 'objet' as Domain })),
    ].filter((e) => Number.isFinite(e.t) && e.t <= nowT + DAY);
    if (!events.length) continue;
    followed += 1;
    events.sort((a, b) => a.t - b.t);
    const first = events[0].t;
    const last = events[events.length - 1].t;

    const inPeriod = events.filter((e) => e.t >= startT && e.t <= endT);
    if (inPeriod.length) {
      const days = new Set(events.filter((e) => e.t >= since30).map((e) => dayKey(new Date(e.t))));
      active.push({
        id: c.id,
        name: c.name,
        concern: c.concern,
        days30: Math.min(30, days.size),
        domains: DOMAINS.filter((d) => inPeriod.some((e) => e.d === d)),
        since: sessions[0]?.starts_at ?? c.created_at,
        last: new Date(last).toISOString(),
      });
    }

    if (last >= nowT - INACTIVE_DAYS * DAY || upcoming) continue;

    // --- Détecter ---
    const inactiveDays = Math.floor((nowT - last) / DAY);
    const lastSession = sessions[sessions.length - 1];
    const lastPastApt = [...myApts].reverse().find((a) => a.t <= nowT);
    const myPlans = (plans.get(c.id) ?? []).filter((p) => p.shared_at).map((p) => new Date(p.shared_at as string).getTime());
    const planAfter = myPlans.some((t) => t > (lastSession?.t ?? 0));
    const n = sessions.length;
    const step: StepKey = n === 0 ? 'avant1' : planAfter ? 'plan' : n === 1 ? 'apres1' : n === 2 ? 'apres2' : n === 3 ? 'apres3' : 'plus';

    const lastOf = (d: Domain) => [...events].reverse().find((e) => e.d === d)?.t ?? null;
    const lastPractMsg = [...myMsgs].reverse().find((m) => m.sender !== 'consultant' && !isReply(m.t) && m.t < surveyT);
    const lastConsMsg = consultantMsgs[consultantMsgs.length - 1];
    let signal: Signal;
    let signalText: string;
    if (lastPastApt && CANCELLED.has((lastPastApt.status ?? '').toLowerCase()) && (!lastSession || lastPastApt.t > lastSession.t)) {
      signal = 'rdv';
      signalText = `Rendez-vous du ${shortFmt.format(new Date(lastPastApt.t))} annulé, non reprogrammé`;
    } else if (lastPractMsg && (!lastConsMsg || lastPractMsg.t > lastConsMsg.t) && lastPractMsg.t < nowT - 7 * DAY) {
      signal = 'msg';
      signalText = `Votre message du ${shortFmt.format(new Date(lastPractMsg.t))} est resté sans réponse`;
    } else {
      const lj = lastOf('journal');
      const lc = lastOf('cases');
      const daysAgo = (t: number) => Math.floor((nowT - t) / DAY);
      if (lc !== null && (lj === null || lc >= lj)) {
        signal = 'cases';
        signalText = `Aucune case cochée depuis ${daysAgo(lc)} jours`;
      } else if (lj !== null) {
        signal = 'journal';
        signalText = `Journal : dernière saisie il y a ${daysAgo(lj)} jours`;
      } else {
        signal = 'seance';
        signalText = lastSession ? `Aucune séance depuis ${daysAgo(lastSession.t)} jours, aucun rendez-vous prévu` : `Aucune activité depuis ${inactiveDays} jours, aucun rendez-vous prévu`;
      }
    }

    // --- Demander / Comprendre / Agir : actions postérieures à la dernière activité ---
    const after = myActions.filter((a) => new Date(a.created_at).getTime() > last);
    const survey = [...after].reverse().find((a) => a.type === 'dropout_survey');
    let surveyState: SurveyState | null = null;
    if (survey) {
      const st = new Date(survey.created_at).getTime();
      const ans = [...after].reverse().find((a) => a.type === 'dropout_answer' && new Date(a.created_at).getTime() >= st);
      const reply = myMsgs.find((m) => m.sender === 'consultant' && m.t > st && m.t <= st + 21 * DAY);
      const cause = ans?.metadata?.cause;
      surveyState = {
        sentAt: survey.created_at,
        answer: ans && isCause(cause) ? { cause, point: typeof ans.metadata?.point === 'string' ? (ans.metadata.point as string) : null, at: ans.created_at } : null,
        reply: reply ? { text: reply.text ?? '', at: reply.sent_at } : null,
      };
    }
    const relance = [...after].reverse().find((a) => a.type === 'dropout_relance');
    const closed = [...after].reverse().find((a) => a.type === 'followup_closed');

    inactive.push({
      id: c.id,
      name: c.name,
      concern: c.concern,
      step,
      signal,
      signalText,
      lastActivity: new Date(last).toISOString(),
      inactiveDays,
      survey: surveyState,
      relancedAt: relance?.created_at ?? null,
      closedAt: closed?.created_at ?? null,
      guessedCause: signal === 'rdv' ? 'rdv' : signal === 'cases' ? 'conseils' : 'silence',
    });
    // Durée de suivi (pour la médiane) : de la première à la dernière activité.
    if (last > first) follows.push(last - first);
  }

  active.sort((a, b) => b.days30 - a.days30 || b.last.localeCompare(a.last));
  inactive.sort((a, b) => a.inactiveDays - b.inactiveDays);

  const domainShare = DOMAINS.map((d) => ({ d, pct: active.length ? Math.round((active.filter((a) => a.domains.includes(d)).length / active.length) * 100) : 0 })).sort((a, b) => b.pct - a.pct);
  const buckets: [string, (n: number) => boolean, string][] = [
    ['20 jours et +', (n) => n >= 20, '#6DD4B8'],
    ['10 à 19 jours', (n) => n >= 10 && n < 20, '#3E9C85'],
    ['3 à 9 jours', (n) => n >= 3 && n < 10, '#7B93DB'],
    ['1 ou 2 jours', (n) => n >= 1 && n < 3, '#E8A87C'],
    ['Aucun ces 30 jours', (n) => n === 0, '#5C6573'],
  ];
  const dayBuckets = buckets.map(([l, f, c]) => ({ l, n: active.filter((a) => f(a.days30)).length, c })).filter((b) => b.n > 0 || b.l !== 'Aucun ces 30 jours');

  const yearAgo = nowT - 365 * DAY;
  const recent = raw.actions.filter((a) => new Date(a.created_at).getTime() >= yearAgo);
  const reasonCounts = new Map<Cause, number>();
  recent.filter((a) => a.type === 'dropout_answer').forEach((a) => {
    const c = a.metadata?.cause;
    if (isCause(c)) reasonCounts.set(c, (reasonCounts.get(c) ?? 0) + 1);
  });

  const stepCounts = new Map<StepKey, number>();
  inactive.forEach((r) => stepCounts.set(r.step, (stepCounts.get(r.step) ?? 0) + 1));
  const med = median(follows);

  return {
    followed,
    active,
    inactive,
    domainShare,
    dayBuckets,
    avgDays: active.length ? active.reduce((s, a) => s + a.days30, 0) / active.length : null,
    medianDays: median(active.map((a) => a.days30)),
    medianFollowMonths: med === null ? null : med / (30.4 * DAY),
    reasons: [...reasonCounts.entries()].map(([cause, n]) => ({ cause, n })).sort((a, b) => b.n - a.n),
    surveysSent12m: recent.filter((a) => a.type === 'dropout_survey').length,
    answers12m: recent.filter((a) => a.type === 'dropout_answer').length,
    steps: (Object.keys(STEP_LABELS) as StepKey[]).map((key) => ({ key, n: stepCounts.get(key) ?? 0 })).filter((s) => s.n > 0),
  };
}

/** Brouillon du message adapté à la cause, que le praticien relit et modifie. */
export function draftFor(first: string, step: StepKey, cause: Cause, signature: string) {
  const end = `\n\nBelle journée,\n${signature}`.trimEnd();
  const T: Record<Cause, string> = {
    mieux: `Bonjour ${first},\n\nMerci pour votre réponse, c’est une très bonne nouvelle que vous alliez mieux. Je clôture votre accompagnement ; vous gardez l’accès à vos fiches et à votre journal. Si vous en ressentez le besoin, je serai ravie de vous revoir pour un point.`,
    rdv: `Bonjour ${first},\n\nNotre dernier rendez-vous a été annulé et je n’ai pas pu vous en reproposer un. Si vous souhaitez reprendre, je vous laisse choisir le créneau qui vous convient : en visio ou au cabinet, comme vous préférez.`,
    conseils: `Bonjour ${first},\n\nMerci pour votre réponse. S’il y a trop de conseils, ou si certains ne vous conviennent pas, on peut les simplifier ensemble et garder seulement l’essentiel.`,
    temps: `Bonjour ${first},\n\nMerci pour votre réponse, je comprends que vos semaines soient chargées. Je vous propose un point de 20 minutes en visio, quand cela vous arrange, pour ajuster vos conseils à votre rythme actuel.`,
    cout: `Bonjour ${first},\n\nMerci pour votre franchise. Nous pouvons espacer les séances ou faire un point plus court, à un tarif adapté. Dites-moi ce qui vous conviendrait.`,
    amelio: `Bonjour ${first},\n\nMerci pour votre réponse. Je préfère en parler avec vous : je vous propose un point pour revoir ensemble ce qui a été mis en place et ajuster l’accompagnement.`,
    silence: `Bonjour ${first},\n\nJe n’ai pas eu de vos nouvelles depuis ${STEP_SINCE[step]}. Comment allez-vous ? Si vous le souhaitez, nous pouvons faire le point sur vos conseils et les ajuster ensemble.`,
    autre: `Bonjour ${first},\n\nMerci pour votre réponse. Si vous le souhaitez, nous pouvons en parler lors d’un court point, pour adapter l’accompagnement à ce qui vous convient aujourd’hui.`,
  };
  return T[cause] + end;
}

export function surveyIntro(first: string, step: StepKey) {
  return `Bonjour ${first}, je n’ai pas eu de vos nouvelles depuis ${STEP_SINCE[step]}. Pouvez-vous me dire en 30 secondes où vous en êtes ? Cela m’aide à adapter votre accompagnement.`;
}
