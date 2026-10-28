'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { submitPreliminaryQuestionnaire } from '@/services/preliminary-questionnaire';
import { PUBLIC_SECTIONS as SECTIONS } from '@/lib/questionnaire/sections';

type Practitioner = { id: string; name: string; city: string | null; bookingEnabled: boolean };
type Contact = { first: string; last: string; email: string; phone: string };
type Draft = { step: number; c: Contact; r: Record<string, string>; skipped: Record<string, boolean> };

const N = SECTIONS.length; // 13
const REVIEW = N + 1;
const DONE = N + 2;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function QuestionnaireFlow({ slug, practitioner }: { slug: string; practitioner: Practitioner }) {
  const KEY = `afeia.questionnaire.${slug}`;
  const [step, setStep] = useState(0);
  const [c, setC] = useState<Contact>({ first: '', last: '', email: '', phone: '' });
  const [r, setR] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const pName = practitioner.name;
  const pFirst = pName.split(' ')[0];

  // Brouillon local
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        setC(d.c);
        setR(d.r ?? {});
        setSkipped(d.skipped ?? {});
        setStep(Math.min(d.step ?? 0, REVIEW));
      }
    } catch {
      /* pas de brouillon */
    }
    setRestored(true);
  }, [KEY]);

  useEffect(() => {
    if (!restored || step === DONE) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ step, c, r, skipped } satisfies Draft));
    } catch {
      /* stockage indisponible */
    }
  }, [KEY, restored, step, c, r, skipped]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c.email.trim());
  const phoneDigits = c.phone.replace(/\D/g, '').replace(/^33(?=\d{9}$)/, '0');
  const phoneOk = phoneDigits.length === 10;
  const introOk = !!(c.first.trim() && c.last.trim() && emailOk && phoneOk);

  const go = (n: number) => {
    setStep(n);
    setTried(false);
    setError(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const answered = (i: number) => {
    const s = SECTIONS[i];
    return !skipped[s.id] && s.questions.some((q) => (r[q.key] ?? '').trim());
  };
  const status = (i: number): 'done' | 'skip' | 'empty' | 'todo' =>
    skipped[SECTIONS[i].id] ? 'skip' : answered(i) ? 'done' : i + 1 < step ? 'empty' : 'todo';
  const doneCount = SECTIONS.filter((_, i) => status(i) === 'done').length;

  const setV = (sectionId: string, key: string, v: string) => {
    setR((x) => ({ ...x, [key]: v }));
    setSkipped((x) => ({ ...x, [sectionId]: false }));
  };

  async function submit() {
    if (!consent) {
      setTried(true);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const responses: Record<string, Record<string, string>> = {};
      SECTIONS.forEach((s) => {
        if (skipped[s.id]) return;
        const vals: Record<string, string> = {};
        s.questions.forEach((q) => {
          const v = (r[q.key] ?? '').trim();
          if (v) vals[q.key] = v;
        });
        if (Object.keys(vals).length) responses[s.id] = vals;
      });
      await submitPreliminaryQuestionnaire({
        naturopathId: practitioner.id,
        firstName: c.first.trim(),
        lastName: c.last.trim(),
        email: c.email.trim().toLowerCase(),
        phone: phoneDigits.replace(/(\d{2})(?=\d)/g, '$1 '),
        responses,
      });
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* ignoré */
      }
      go(DONE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’envoi a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      setSending(false);
    }
  }

  const navItems = useMemo(
    () => [{ t: 'Vos coordonnées', n: 0 }, ...SECTIONS.map((s, i) => ({ t: s.title, n: i + 1 })), { t: 'Vérification', n: REVIEW }],
    []
  );

  const input = 'h-12 rounded-xl border bg-cream px-3.5 text-[15px] text-charcoal outline-none placeholder:text-mist focus:border-sage';
  const bad = (cond: boolean) => ({ borderColor: cond ? '#E8A87C' : '#2A3140' });
  const sec = step >= 1 && step <= N ? SECTIONS[step - 1] : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream text-charcoal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/afeia_symbol_white.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-[120px] top-[90px] z-0 h-[900px] w-auto select-none opacity-[0.035]"
      />

      <header className="relative z-[1] flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#1F2533] px-4 py-[18px] sm:px-8">
        <span className="text-sm font-medium text-[#B8C1CF]">Questionnaire préliminaire</span>
        <span className="flex-1" />
        <div className="flex items-center gap-2.5 rounded-full border border-divider bg-surface py-1.5 pl-1.5 pr-3.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-terracotta text-xs font-semibold text-ink">{initials(pName)}</span>
          <span className="text-[13px] text-[#B8C1CF]">
            Pour <strong className="font-semibold text-charcoal">{pName}</strong>
            {practitioner.city ? `, à ${practitioner.city}` : ''}
          </span>
        </div>
        {step > 0 && step < DONE && <span className="text-xs text-sage">✓ Brouillon enregistré sur cet appareil</span>}
      </header>

      <div ref={topRef} className="relative z-[1] flex flex-1 flex-wrap justify-center gap-8 p-4 sm:p-8">
        {step < DONE && (
          <nav aria-label="Sommaire du questionnaire" className="hidden min-w-[220px] flex-[0_1_250px] flex-col gap-0.5 self-start lg:flex">
            <span className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone">Sommaire</span>
            {navItems.map((it) => {
              const cur = it.n === step;
              const s = it.n >= 1 && it.n <= N ? status(it.n - 1) : null;
              const done = (it.n === 0 && step > 0) || s === 'done';
              const locked = step === 0 && it.n > 0 && !introOk;
              return (
                <button
                  key={it.n}
                  type="button"
                  aria-current={cur ? 'step' : undefined}
                  onClick={() => !locked && go(it.n)}
                  disabled={locked}
                  className="flex min-h-[36px] items-center gap-2.5 rounded-[9px] px-3 text-left text-[13px]"
                  style={{ background: cur ? '#23383B' : 'transparent', color: cur ? '#6DD4B8' : locked ? '#5C6573' : '#B8C1CF', fontWeight: cur ? 600 : 400 }}
                >
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] font-bold text-ink"
                    style={{
                      borderColor: cur ? '#6DD4B8' : done ? '#6DD4B8' : s === 'skip' ? '#2A3140' : '#3A4252',
                      background: done ? '#6DD4B8' : s === 'skip' ? '#2A3140' : 'transparent',
                    }}
                  >
                    {done ? '✓' : s === 'skip' ? '–' : ''}
                  </span>
                  <span className="flex-1">{it.t}</span>
                </button>
              );
            })}
          </nav>
        )}

        <main className="flex min-w-0 max-w-[720px] flex-[1_1_520px] flex-col gap-[18px]">
          {step < DONE && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-2 text-[13px] text-stone">
                <span>{step === 0 ? 'Vos coordonnées' : step <= N ? `Rubrique ${step} sur ${N}` : 'Vérification'}</span>
                <span>{step === 0 ? 'environ 15 min au total' : step <= N ? `encore environ ${Math.max(1, Math.round((N - step) * 1.1))} min` : 'presque fini'}</span>
              </div>
              <div aria-hidden="true" className="flex gap-[3px]">
                {Array.from({ length: N + 2 }, (_, i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-[3px]" style={{ background: i < step ? '#6DD4B8' : i === step ? '#3E7D6D' : '#2A3140' }} />
                ))}
              </div>
            </div>
          )}

          {step === 0 && (
            <section className="flex flex-col gap-[22px] rounded-[20px] border border-divider bg-surface p-6 sm:p-8">
              <div className="flex flex-col gap-2">
                <h1 className="font-serif text-[34px] font-medium leading-[1.2]">Préparons votre première séance</h1>
                <p className="max-w-[58ch] text-base leading-relaxed text-[#B8C1CF]">
                  {pName} lira vos réponses avant de vous rencontrer : la séance commencera directement par l’essentiel.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[['◷', 'environ 15 minutes'], ['☰', '13 rubriques courtes'], ['✎', 'tout est facultatif, sauf vos coordonnées'], ['↺', 'brouillon gardé si vous quittez la page']].map(([i, t]) => (
                  <span key={t} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-raised px-3 text-[13px] text-[#B8C1CF]">
                    <span className="text-sage" aria-hidden="true">{i}</span>
                    {t}
                  </span>
                ))}
              </div>
              <div className="h-px bg-divider" />
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Vos coordonnées</h2>
                <span className="text-sm text-stone">Pour que {pFirst} puisse vous recontacter.</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-sm font-medium">
                  Prénom
                  <input value={c.first} onChange={(e) => setC({ ...c, first: e.target.value })} autoComplete="given-name" placeholder="Ex. Nadia" className={input} style={bad(tried && !c.first.trim())} />
                  {tried && !c.first.trim() && <span className="text-[13px] font-normal text-terracotta">Indiquez votre prénom.</span>}
                </label>
                <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-sm font-medium">
                  Nom
                  <input value={c.last} onChange={(e) => setC({ ...c, last: e.target.value })} autoComplete="family-name" placeholder="Ex. Lefort" className={input} style={bad(tried && !c.last.trim())} />
                  {tried && !c.last.trim() && <span className="text-[13px] font-normal text-terracotta">Indiquez votre nom.</span>}
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                E-mail
                <input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} autoComplete="email" placeholder="vous@exemple.fr" className={input} style={bad((tried || c.email.length > 8) && !emailOk)} />
                {(tried || c.email.length > 8) && !emailOk && <span className="text-[13px] font-normal text-terracotta">Vérifiez l’adresse e-mail, elle semble incomplète.</span>}
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Téléphone
                <input type="tel" required value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} autoComplete="tel" placeholder="06 12 34 56 78" className={input} style={bad((tried || phoneDigits.length > 0) && !phoneOk)} />
                {(tried || phoneDigits.length > 0) && !phoneOk && (
                  <span className="text-[13px] font-normal text-terracotta">Indiquez un numéro à 10 chiffres pour que {pFirst} puisse vous appeler.</span>
                )}
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => (introOk ? go(1) : setTried(true))}
                  className="h-[50px] rounded-xl px-6 text-[15px] font-semibold"
                  style={introOk ? { background: '#6DD4B8', color: '#0A0E14' } : { background: '#2A3140', color: '#8B95A5' }}
                >
                  Commencer le questionnaire →
                </button>
              </div>
            </section>
          )}

          {sec && (
            <section className="flex flex-col gap-[22px] rounded-[20px] border border-divider bg-surface p-6 sm:p-8">
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold tracking-[0.04em] text-sage">
                  Rubrique {step} sur {N} · {sec.questions.length >= 3 ? 'environ 2 min' : 'environ 1 min'}
                </span>
                <h1 className="font-serif text-[32px] font-medium leading-[1.2]">{sec.title}</h1>
                <p className="max-w-[58ch] text-[15px] leading-relaxed text-[#B8C1CF]">{sec.desc}</p>
              </div>
              <div role="note" className="flex items-start gap-2.5 rounded-xl bg-sage-light px-3.5 py-3">
                <Info className="mt-0.5 h-4 w-4 flex-none text-sage" aria-hidden="true" />
                <span className="text-sm leading-normal text-[#CFEFE5]">
                  Les questions sont facultatives, mais plus vos réponses sont précises, mieux {pName} pourra préparer votre séance. Répondez avec vos mots, sans chercher la bonne réponse.
                </span>
              </div>
              {sec.questions.map((q) => {
                const value = r[q.key] ?? '';
                const id = `q-${q.key}`;
                return (
                  <div key={q.key} className="flex flex-col gap-2">
                    <label htmlFor={q.options ? undefined : id} id={`${id}-label`} className="text-[15px] font-medium">
                      {q.label}
                    </label>
                    <span id={`${id}-help`} className="-mt-1 text-[13px] leading-normal text-stone">{q.help}</span>
                    {q.options ? (
                      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className="flex flex-wrap gap-2">
                        {q.options.map((o) => {
                          const on = value === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setV(sec.id, q.key, on ? '' : o)}
                              className="h-11 min-w-[96px] rounded-full border px-[18px] text-sm font-medium"
                              style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' }}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        id={id}
                        aria-describedby={`${id}-help`}
                        rows={3}
                        value={value}
                        onChange={(e) => setV(sec.id, q.key, e.target.value)}
                        placeholder={q.placeholder}
                        className="min-h-[96px] w-full resize-y rounded-xl border border-divider bg-cream px-3.5 py-3 text-[15px] leading-[1.55] text-charcoal outline-none placeholder:text-mist focus:border-sage"
                      />
                    )}
                    {q.key === 'general_traitements' && (
                      <div role="note" className="flex items-start gap-2 rounded-[10px] border border-[#5C4F1E] bg-[#332D17] px-3 py-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#F2C94C]" aria-hidden="true" />
                        <span className="text-[13px] leading-[1.45] text-[#F5E3A8]">
                          Indiquez tous vos traitements en cours. Votre praticien n’intervient pas sur un traitement médical : vérifiez toujours avec votre médecin que ses recommandations sont compatibles, et ne modifiez jamais un traitement sans son avis.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-2.5 border-t border-divider pt-1.5">
                <button type="button" onClick={() => go(step - 1)} className="h-12 rounded-xl border border-divider px-[18px] text-[15px]">← Précédent</button>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => {
                    setSkipped((x) => ({ ...x, [sec.id]: true }));
                    go(step + 1);
                  }}
                  className="h-12 px-3 text-sm text-stone hover:text-charcoal"
                >
                  Passer
                </button>
                <button type="button" onClick={() => go(step + 1)} className="h-12 rounded-xl bg-sage px-[22px] text-[15px] font-semibold text-ink">
                  {step === N ? 'Vérifier mes réponses →' : `Suivant : ${SECTIONS[step].title} →`}
                </button>
              </div>
            </section>
          )}

          {step === REVIEW && (
            <section className="flex flex-col gap-5 rounded-[20px] border border-divider bg-surface p-6 sm:p-8">
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-sage">Dernière étape</span>
                <h1 className="font-serif text-[32px] font-medium">Vérifiez avant d’envoyer</h1>
                <p className="text-[15px] text-[#B8C1CF]">{doneCount} rubrique{doneCount > 1 ? 's' : ''} remplie{doneCount > 1 ? 's' : ''} sur {N}. Vous pouvez encore compléter ou modifier chaque rubrique.</p>
              </div>
              <div className="flex flex-wrap items-start gap-3 rounded-[14px] bg-surface-raised px-[18px] py-4">
                <div className="flex flex-[1_1_260px] flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-stone">Vos coordonnées</span>
                  <span className="text-[15px] font-medium">{c.first} {c.last}</span>
                  <span className="text-sm text-[#B8C1CF]">{c.email} · {c.phone}</span>
                </div>
                <button type="button" onClick={() => go(0)} className="h-9 rounded-[9px] border border-divider px-3 text-[13px]">Modifier</button>
              </div>
              <div className="flex flex-col">
                {SECTIONS.map((s, i) => {
                  const st = status(i);
                  const first = s.questions.map((q) => (r[q.key] ?? '').trim()).find(Boolean);
                  return (
                    <div key={s.id} className="flex min-h-[56px] items-center gap-3 border-b border-divider py-2">
                      <span
                        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border text-xs font-bold text-ink"
                        style={{ background: st === 'done' ? '#6DD4B8' : st === 'skip' ? '#2A3140' : 'transparent', borderColor: st === 'done' ? '#6DD4B8' : st === 'skip' ? '#2A3140' : '#3A4252' }}
                      >
                        {st === 'done' ? '✓' : st === 'skip' ? '–' : ''}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium">{s.title}</span>
                        <span className="truncate text-[13px]" style={{ color: st === 'done' ? '#B8C1CF' : '#5C6573' }}>
                          {st === 'skip' ? 'Passée' : first || 'Pas de réponse'}
                        </span>
                      </span>
                      <button type="button" onClick={() => go(i + 1)} className="h-[34px] flex-none px-2.5 text-[13px] text-sage">
                        {st === 'done' ? 'Modifier' : 'Compléter'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border bg-surface-raised p-4" style={bad(tried && !consent)}>
                <input type="checkbox" checked={consent} onChange={() => setConsent((v) => !v)} className="mt-0.5 h-5 w-5 flex-none accent-sage" />
                <span className="text-sm leading-[1.55]">
                  J’accepte que ces réponses, qui contiennent des informations sur ma santé, soient transmises à {pName} pour préparer mon accompagnement. Je peux demander leur suppression à tout moment.
                </span>
              </label>
              {tried && !consent && <span role="alert" className="-mt-2 text-[13px] text-terracotta">Cochez la case pour accepter la transmission de vos réponses.</span>}
              {error && <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-4 py-3 text-sm text-[#F2D2BB]">{error}</div>}
              <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={() => go(N)} className="h-12 rounded-xl border border-divider px-[18px] text-[15px]">← Précédent</button>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => void submit()}
                  aria-disabled={!consent}
                  disabled={sending}
                  className="flex h-[50px] items-center gap-2 rounded-xl px-6 text-[15px] font-semibold"
                  style={consent ? { background: '#6DD4B8', color: '#0A0E14' } : { background: '#2A3140', color: '#8B95A5' }}
                >
                  {sending && <Spinner size="sm" />}
                  Envoyer à {pName}
                </button>
              </div>
            </section>
          )}

          {step === DONE && (
            <section className="flex flex-col items-center gap-[18px] rounded-[20px] border border-divider bg-surface px-6 py-12 text-center sm:px-8">
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sage-light">
                <Check className="h-[34px] w-[34px] text-sage" aria-hidden="true" />
              </span>
              <h1 className="font-serif text-[34px] font-medium">Merci {c.first}, c’est envoyé</h1>
              <p className="max-w-[50ch] text-base leading-relaxed text-[#B8C1CF]">
                {pName} lira vos réponses avant votre première séance. Vous pourrez être recontacté·e à l’adresse {c.email}.
              </p>
              {practitioner.bookingEnabled && (
                <div className="flex w-full max-w-[520px] flex-wrap items-center justify-center gap-3 rounded-[14px] bg-surface-raised p-[18px] text-left">
                  <span className="flex flex-[1_1_240px] flex-col gap-[3px]">
                    <span className="text-[15px] font-semibold">Pas encore de rendez-vous ?</span>
                    <span className="text-[13px] text-stone">Choisissez un créneau en ligne, au cabinet ou en visio.</span>
                  </span>
                  <a href={`/rdv/${slug}`} className="inline-flex h-11 items-center rounded-[11px] bg-sage px-[18px] text-sm font-semibold text-ink">Réserver une séance</a>
                </div>
              )}
              <span className="text-[13px] text-stone">Vous pouvez fermer cette page. Votre brouillon a été effacé de cet appareil.</span>
            </section>
          )}

          <p className="text-center text-xs leading-normal text-mist">
            Vos données sont hébergées dans l’Union européenne et ne sont transmises qu’à votre praticien. Afeia ne remplace jamais un médecin.
          </p>
        </main>
      </div>
    </div>
  );
}
