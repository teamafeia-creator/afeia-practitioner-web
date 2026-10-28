'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { PractitionerPublicProfile } from '@/lib/queries/booking';

type Step = 'type' | 'date' | 'groupe' | 'contact' | 'done';
type Loc = 'in_person' | 'video';
type CT = PractitionerPublicProfile['consultation_types'][number];

type GroupSession = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_type: string;
  location_details: string | null;
  max_participants: number;
  available_spots: number;
};

type Done = {
  starts_at: string;
  ends_at: string;
  typeName: string;
  duration: number | null;
  priceCents: number | null;
  depositCents: number;
  visio: boolean;
  email: string;
  ics?: string;
  group: boolean;
};

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const hm = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
};
const eur = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function cityOf(address: string | null) {
  if (!address) return null;
  return address.match(/\b\d{5}\s+([^,\n]+)/)?.[1]?.trim() ?? null;
}

export function BookingPageClient({ practitioner, slug }: { practitioner: PractitionerPublicProfile; slug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('type');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>('in_person');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [days, setDays] = useState<Set<string>>(new Set());
  const [loadingDays, setLoadingDays] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [session, setSession] = useState<GroupSession | null>(null);
  const [waitOpen, setWaitOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [verifying, setVerifying] = useState(false);

  const type = practitioner.consultation_types.find((t) => t.id === typeId) ?? null;
  const isGroup = !!type?.is_group;
  const depositPercent = type?.deposit_percent ?? practitioner.deposit_percent;
  const depositCents = practitioner.online_payment && !isGroup && type?.price_cents && depositPercent > 0 ? Math.max(100, Math.round((type.price_cents * depositPercent) / 100)) : 0;
  const city = cityOf(practitioner.booking_address);

  const scrollTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const go = (s: Step) => {
    setStep(s);
    scrollTop();
  };

  // Retour de Stripe, ou lien de la liste d'attente
  useEffect(() => {
    const paiement = params.get('paiement');
    if (paiement === 'ok' && params.get('session_id')) {
      setVerifying(true);
      fetch(`/api/booking/${slug}/deposit?session_id=${encodeURIComponent(params.get('session_id') as string)}`)
        .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
        .then(({ ok, b }) => {
          if (!ok || !b.paid) {
            setNotice(b.error || 'Le paiement de l’acompte n’a pas abouti. Le créneau n’est pas réservé : vous pouvez recommencer.');
            setStep('type');
            return;
          }
          setDone({
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            typeName: b.consultation_type_name,
            duration: b.duration_minutes,
            priceCents: b.price_cents,
            depositCents: b.deposit_cents,
            visio: b.location_type === 'video',
            email: b.email ?? '',
            ics: b.ics_download_url,
            group: false,
          });
          setStep('done');
        })
        .catch(() => setNotice('Impossible de vérifier le paiement. Si vous avez été débité, la confirmation arrivera par e-mail.'))
        .finally(() => {
          setVerifying(false);
          router.replace(`/rdv/${slug}`, { scroll: false });
        });
      return;
    }
    if (paiement === 'annule' && params.get('rdv')) {
      fetch(`/api/booking/${slug}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointment_id: params.get('rdv') }) }).catch(() => undefined);
      setNotice('Paiement annulé : le créneau a été libéré. Choisissez à nouveau votre séance quand vous le souhaitez.');
      router.replace(`/rdv/${slug}`, { scroll: false });
      return;
    }
    const pd = params.get('date');
    const pt = params.get('time');
    const ptype = params.get('consultation_type_id');
    if (pd && pt && ptype && practitioner.consultation_types.some((t) => t.id === ptype)) {
      setTypeId(ptype);
      fetch(`/api/booking/${slug}/slots?date=${pd}&consultation_type_id=${ptype}`)
        .then((r) => (r.ok ? r.json() : { slots: [] }))
        .then((d: { slots?: string[] }) => {
          const [y, m] = pd.split('-').map(Number);
          setMonth(new Date(y, m - 1, 1));
          setDay(pd);
          if ((d.slots ?? []).includes(pt)) {
            setSlot(pt);
            setStep('contact');
          } else {
            setNotice('Ce créneau n’est malheureusement plus disponible. Choisissez-en un autre.');
            setStep('date');
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jours disponibles du mois
  useEffect(() => {
    if (step !== 'date' || !typeId) return;
    setLoadingDays(true);
    const m = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    fetch(`/api/booking/${slug}/available-days?month=${m}&consultation_type_id=${typeId}`)
      .then((r) => (r.ok ? r.json() : { available_days: [] }))
      .then((d: { available_days?: string[] }) => setDays(new Set(d.available_days ?? [])))
      .finally(() => setLoadingDays(false));
  }, [step, typeId, month, slug]);

  // Créneaux du jour
  useEffect(() => {
    if (!day || !typeId) return;
    setLoadingSlots(true);
    fetch(`/api/booking/${slug}/slots?date=${day}&consultation_type_id=${typeId}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d: { slots?: string[] }) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [day, typeId, slug]);

  // Séances de groupe
  useEffect(() => {
    if (step !== 'groupe' || !typeId) return;
    fetch(`/api/booking/${slug}/group-sessions?consultation_type_id=${typeId}`)
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((d: { sessions?: GroupSession[] }) => setSessions(d.sessions ?? []));
  }, [step, typeId, slug]);

  const today = ymd(new Date());
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const noSlotsAtAll = step === 'date' && !loadingDays && days.size === 0;

  const whenText = session
    ? `${longDay.format(new Date(session.starts_at))}, ${timeFmt.format(new Date(session.starts_at))} – ${timeFmt.format(new Date(session.ends_at))}`
    : day && slot
      ? `${longDay.format(new Date(`${day}T12:00:00`))} à ${hm(slot)}`
      : null;
  const visio = session ? session.location_type === 'video' : loc === 'video';

  const steps = ['Séance', isGroup ? 'Séance de groupe' : 'Date et heure', 'Coordonnées'];
  const stepIdx = { type: 0, date: 1, groupe: 1, contact: 2, done: 3 }[step];

  if (verifying) {
    return (
      <Shell practitioner={practitioner} city={city}>
        <div className="flex flex-col items-center gap-3 py-24 text-stone">
          <Spinner size="lg" />
          Vérification du paiement…
        </div>
      </Shell>
    );
  }

  return (
    <Shell practitioner={practitioner} city={city}>
      <div ref={topRef} className="relative z-[1] flex flex-1 flex-wrap justify-center gap-7 px-4 pb-10 pt-7 sm:px-8">
        <main className="flex min-w-0 max-w-[760px] flex-[1_1_560px] flex-col gap-[18px]">
          {step !== 'done' && (
            <ol aria-label="Étapes" className="flex gap-2">
              {steps.map((l, i) => (
                <li key={l} aria-current={i === stepIdx ? 'step' : undefined} className="flex flex-1 flex-col gap-1.5">
                  <span className="h-1.5 rounded-[3px]" style={{ background: i < stepIdx ? '#3E7D6D' : i === stepIdx ? '#6DD4B8' : '#2A3140' }} />
                  <span className="text-[13px]" style={{ color: i === stepIdx ? '#E8EDF4' : '#8B95A5', fontWeight: i === stepIdx ? 600 : 400 }}>
                    {i + 1}. {l}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {notice && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-[#5C4F1E] bg-[#332D17] px-4 py-3 text-sm text-[#F5E3A8]">
              <span className="flex-1">{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="text-[#F5E3A8]">×</button>
            </div>
          )}

          {step === 'type' && (
            <section className="flex flex-col gap-3.5">
              <h1 className="font-serif text-[30px] font-medium">Choisissez votre séance</h1>
              {practitioner.consultation_types.map((t) => {
                const dp = t.deposit_percent ?? practitioner.deposit_percent;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTypeId(t.id);
                      setLoc('in_person');
                      setDay(null);
                      setSlot(null);
                      setSession(null);
                      setWaitOpen(false);
                      setNotice(null);
                      go(t.is_group ? 'groupe' : 'date');
                    }}
                    className="flex w-full items-start gap-4 rounded-2xl border border-divider bg-surface px-5 py-[18px] text-left hover:border-sage"
                  >
                    <span className="w-1.5 flex-none self-stretch rounded-[3px]" style={{ background: t.color }} />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[17px] font-semibold">{t.name}</span>
                        {t.is_group && <span className="inline-flex h-[22px] items-center rounded-full bg-[#1F2640] px-2 text-[11px] font-semibold text-[#A9B8EC]">En groupe</span>}
                      </span>
                      <span className="text-sm text-[#B8C1CF]">{t.duration_minutes} min{t.is_group ? '' : ' · Au cabinet ou en visio'}</span>
                      {t.description && <span className="text-sm leading-normal text-stone">{t.description}</span>}
                    </span>
                    {t.price_cents != null && (
                      <span className="flex flex-none flex-col items-end gap-1">
                        <span className="font-serif text-[22px]">{eur(t.price_cents)}</span>
                        <span className="text-xs text-stone">
                          {t.is_group && t.price_per_participant ? 'par personne' : practitioner.online_payment && !t.is_group && dp > 0 ? `acompte ${dp} %` : ''}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          )}

          {step === 'date' && type && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => go('type')} aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-divider">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="font-serif text-[30px] font-medium">Choisissez une date</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span id="loc-label" className="text-sm text-[#B8C1CF]">Où souhaitez-vous faire la séance ?</span>
                <div role="radiogroup" aria-labelledby="loc-label" className="flex gap-1 rounded-xl border border-divider bg-surface p-1">
                  {([['in_person', 'Au cabinet'], ['video', 'En visio']] as const).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={loc === k}
                      onClick={() => setLoc(k)}
                      className="h-10 rounded-[9px] px-4 text-sm font-medium"
                      style={loc === k ? { background: '#6DD4B8', color: '#0A0E14' } : { color: '#E8EDF4' }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-[13px] text-stone">
                  {loc === 'video' ? 'Même tarif, depuis chez vous : le lien arrive par e-mail.' : practitioner.booking_address ?? ''}
                </span>
              </div>

              {noSlotsAtAll ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#5C4F1E] bg-[#332D17] p-6 text-center">
                  <span className="text-[26px]" aria-hidden="true">🔔</span>
                  <span className="text-[17px] font-semibold text-[#F5E3A8]">Plus de créneau libre ce mois-ci</span>
                  <span className="max-w-[48ch] text-sm leading-normal text-[#E6D49A]">
                    Regardez le mois suivant, ou inscrivez-vous : vous serez prévenu par e-mail dès qu’un créneau correspondant à vos préférences se libère.
                  </span>
                  <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="mt-1 h-10 rounded-[10px] border border-[#5C4F1E] px-4 text-sm text-[#F5E3A8]">
                    Voir {MONTHS[(month.getMonth() + 1) % 12].toLowerCase()}
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-start gap-5">
                <div className="flex flex-[1_1_300px] flex-col gap-3 rounded-2xl border border-divider bg-surface p-[18px]">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Mois précédent"
                      disabled={month <= thisMonth}
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-divider disabled:text-mist"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-base font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
                    <button type="button" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-divider">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={`grid grid-cols-7 gap-1 text-center ${loadingDays ? 'opacity-50' : ''}`}>
                    {DOW.map((d, i) => <span key={i} className="py-1 text-[11px] text-stone">{d}</span>)}
                    {Array.from({ length: (month.getDay() + 6) % 7 }, (_, i) => <span key={`e${i}`} />)}
                    {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => {
                      const d = ymd(new Date(month.getFullYear(), month.getMonth(), i + 1));
                      const a = days.has(d) && d >= today;
                      const on = day === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={!a}
                          aria-pressed={on}
                          aria-label={`${i + 1} ${MONTHS[month.getMonth()].toLowerCase()}${a ? ', créneaux libres' : ', complet'}`}
                          onClick={() => {
                            setDay(d);
                            setSlot(null);
                          }}
                          className="h-10 rounded-[10px] border text-sm disabled:cursor-not-allowed"
                          style={{
                            borderColor: on ? '#6DD4B8' : a ? '#2F5A50' : 'transparent',
                            background: on ? '#6DD4B8' : a ? '#23383B' : 'transparent',
                            color: on ? '#0A0E14' : a ? '#E8EDF4' : '#3A4252',
                            fontWeight: a ? 600 : 400,
                          }}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-stone">
                    <span className="h-2.5 w-2.5 rounded-[3px] border border-[#2F5A50] bg-sage-light" />
                    Jours avec des créneaux libres
                  </span>
                </div>

                <div className="flex flex-[1_1_260px] flex-col gap-3.5">
                  <span className="text-base font-semibold first-letter:uppercase">{day ? longDay.format(new Date(`${day}T12:00:00`)) : 'Aucun jour choisi'}</span>
                  {!day && <span className="text-sm text-stone">Choisissez un jour en vert dans le calendrier.</span>}
                  {day && loadingSlots && <Spinner size="sm" />}
                  {day && !loadingSlots && slots.length === 0 && <span className="text-sm text-stone">Plus de créneau ce jour-là.</span>}
                  {day &&
                    !loadingSlots &&
                    ([['Matin', (s: string) => s < '12:00'], ['Après-midi', (s: string) => s >= '12:00' && s < '17:30'], ['Soir', (s: string) => s >= '17:30']] as const).map(([l, f]) => {
                      const g = slots.filter(f);
                      if (!g.length) return null;
                      return (
                        <div key={l} className="flex flex-col gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-stone">{l}</span>
                          <div className="flex flex-wrap gap-2">
                            {g.map((s) => (
                              <button
                                key={s}
                                type="button"
                                aria-pressed={slot === s}
                                onClick={() => setSlot(s)}
                                className="h-[42px] min-w-[76px] rounded-[10px] border px-3 text-[15px] font-medium"
                                style={slot === s ? { borderColor: '#6DD4B8', background: '#6DD4B8', color: '#0A0E14' } : { borderColor: '#3A4252' }}
                              >
                                {hm(s)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => (slot ? go('contact') : setNotice('Choisissez un jour puis un horaire pour continuer.'))}
                    className="h-12 rounded-xl text-[15px] font-semibold"
                    style={slot ? { background: '#6DD4B8', color: '#0A0E14' } : { background: '#2A3140', color: '#8B95A5' }}
                  >
                    Continuer
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setWaitOpen((v) => !v)} className="inline-flex h-10 items-center gap-2 self-center rounded-[10px] px-3.5 text-sm text-[#B8C1CF] hover:text-charcoal">
                🔔 Aucun créneau ne vous convient ? Être prévenu si un créneau se libère
              </button>
              {waitOpen && <WaitlistBox slug={slug} typeId={type.id} onClose={() => setWaitOpen(false)} />}
            </section>
          )}

          {step === 'groupe' && type && (
            <section className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => go('type')} aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-divider">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="font-serif text-[30px] font-medium">Choisissez une séance de groupe</h1>
              </div>
              {sessions.length === 0 && <p className="text-sm text-stone">Aucune séance de groupe programmée pour le moment.</p>}
              {sessions.map((s) => {
                const full = s.available_spots <= 0;
                const few = !full && s.available_spots <= 3;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-disabled={full}
                    onClick={() => {
                      if (full) return;
                      setSession(s);
                      go('contact');
                    }}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-divider px-5 py-4 text-left"
                    style={{ background: full ? '#10141B' : '#151A23', color: full ? '#5C6573' : '#E8EDF4', cursor: full ? 'not-allowed' : 'pointer' }}
                  >
                    <span className="flex flex-[1_1_260px] flex-col gap-1">
                      <span className="text-base font-semibold">{s.title}</span>
                      <span className="text-sm text-[#B8C1CF] first-letter:uppercase">
                        {longDay.format(new Date(s.starts_at))}, {timeFmt.format(new Date(s.starts_at))} – {timeFmt.format(new Date(s.ends_at))} · {s.location_type === 'video' ? 'En visio' : 'Au cabinet'}
                      </span>
                    </span>
                    <span
                      className="inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold"
                      style={full ? { background: '#2A3140', color: '#8B95A5' } : few ? { background: '#373131', color: '#E8A87C' } : { background: '#23383B', color: '#6DD4B8' }}
                    >
                      {full ? 'Complet' : `${s.available_spots} place${s.available_spots > 1 ? 's' : ''} restante${s.available_spots > 1 ? 's' : ''}`}
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {step === 'contact' && type && (
            <ContactStep
              slug={slug}
              practitioner={practitioner}
              type={type}
              day={day}
              slot={slot}
              session={session}
              loc={loc}
              depositCents={depositCents}
              onBack={() => go(session ? 'groupe' : 'date')}
              onSlotTaken={() => {
                setSlot(null);
                setNotice('Ce créneau vient d’être réservé. Choisissez-en un autre.');
                go('date');
              }}
              onDone={(d) => {
                setDone(d);
                go('done');
              }}
            />
          )}

          {step === 'done' && done && <DoneStep practitioner={practitioner} slug={slug} done={done} />}

          <p className="text-center text-xs leading-normal text-mist">
            Vos données sont hébergées dans l’Union européenne et ne sont transmises qu’à votre praticien. Afeia ne remplace jamais un médecin.
          </p>
        </main>

        {step !== 'done' && (
          <aside aria-label="Votre rendez-vous" className="flex min-w-[260px] flex-[0_1_300px] flex-col gap-3 self-start rounded-[18px] border border-divider bg-surface p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-stone">Votre rendez-vous</span>
            <div className="flex flex-col gap-2.5 text-sm">
              <Row i="◉" ic={type?.color ?? '#8B95A5'} t={type ? `${type.name} · ${type.duration_minutes} min` : 'Choisissez une séance'} muted={!type} />
              <Row i="◷" t={whenText ?? 'Date à choisir'} muted={!whenText} />
              <Row i="⌖" t={!type ? 'Lieu selon la séance' : visio ? 'En visio' : `Au cabinet${city ? `, ${city}` : ''}`} muted={!type} />
              <Row
                i="€"
                t={
                  !type || type.price_cents == null
                    ? '—'
                    : `${eur(type.price_cents)}${isGroup && type.price_per_participant ? ' par personne' : ''}${depositCents ? ` · acompte de ${eur(depositCents)} à la réservation` : ''}`
                }
                muted={!type}
              />
            </div>
            <div className="h-px bg-divider" />
            <span className="text-xs leading-normal text-stone">
              {depositCents ? 'Rendez-vous confirmé dès le paiement de l’acompte, sans attendre de validation.' : 'Rendez-vous confirmé immédiatement, sans attendre de validation.'}
            </span>
          </aside>
        )}
      </div>
    </Shell>
  );
}

function Row({ i, t, muted, ic }: { i: string; t: string; muted?: boolean; ic?: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="w-5 flex-none" style={{ color: ic ?? '#8B95A5' }} aria-hidden="true">{i}</span>
      <span className="first-letter:uppercase" style={{ color: muted ? '#5C6573' : '#E8EDF4' }}>{t}</span>
    </div>
  );
}

function Shell({ practitioner, city, children }: { practitioner: PractitionerPublicProfile; city: string | null; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream text-charcoal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/afeia_symbol_white.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-[120px] top-[90px] z-0 h-[900px] w-auto select-none opacity-[0.035]" />
      <header className="relative z-[1] flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-[#1F2533] px-4 py-6 sm:px-8">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-terracotta text-xl font-semibold text-ink">{initials(practitioner.full_name)}</span>
        <div className="flex flex-[1_1_280px] flex-col gap-1">
          <span className="font-serif text-[26px] font-medium">{practitioner.full_name}</span>
          <span className="text-sm text-[#B8C1CF]">
            {[practitioner.booking_address ?? (city ? city : null), practitioner.booking_phone].filter(Boolean).join(' · ')}
          </span>
        </div>
        {practitioner.booking_intro_text && (
          <p className="max-w-[460px] flex-[1_1_320px] text-sm italic leading-[1.55] text-stone">« {practitioner.booking_intro_text} »</p>
        )}
      </header>
      {children}
    </div>
  );
}

function WaitlistBox({ slug, typeId, onClose }: { slug: string; typeId: string; onClose: () => void }) {
  const [first, setFirst] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tod, setTod] = useState<'morning' | 'afternoon' | 'evening' | 'any'>('any');
  const [wdays, setWdays] = useState<number[]>([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());
  const TOD = [['morning', 'Matin'], ['afternoon', 'Après-midi'], ['evening', 'Soir'], ['any', 'Peu importe']] as const;
  const WD = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam']] as const;
  const field = 'h-11 rounded-[10px] border bg-cream px-3 text-[15px] text-charcoal outline-none focus:border-sage';
  const pill = (on: boolean) => (on ? { borderColor: '#6DD4B8', background: '#6DD4B8', color: '#0A0E14' } : { borderColor: '#3A4252' });

  async function join() {
    if (!first.trim() || !emailOk) {
      setTried(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${slug}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: first.trim(), email: email.trim(), phone: phone.trim() || undefined, consultation_type_id: typeId, preferred_time_of_day: tod, preferred_days: wdays }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error === 'DUPLICATE' ? 'Vous êtes déjà inscrit·e sur la liste d’attente.' : b.message || b.error || 'L’inscription a échoué.');
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’inscription a échoué.');
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    const days = wdays.length ? WD.filter(([k]) => wdays.includes(k)).map(([, l]) => l.toLowerCase()).join(', ') : 'tous les jours';
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-divider bg-surface p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-light text-[22px] text-sage">✓</span>
        <span className="text-[17px] font-semibold">C’est noté, {first}</span>
        <span className="max-w-[46ch] text-sm text-[#B8C1CF]">
          Vous recevrez un e-mail « Réserver ce créneau » dès qu’une place se libère ({days}, {TOD.find(([k]) => k === tod)?.[1].toLowerCase()}). Le premier qui réserve obtient la séance. Votre inscription dure 30 jours.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-[22px]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Liste d’attente</h2>
        <button type="button" onClick={onClose} className="text-[13px] text-stone">Fermer</button>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[1_1_200px] flex-col gap-1.5 text-[13px] text-stone">
          Prénom
          <input value={first} onChange={(e) => setFirst(e.target.value)} className={field} style={{ borderColor: tried && !first.trim() ? '#E8A87C' : '#2A3140' }} />
          {tried && !first.trim() && <span className="text-terracotta">Indiquez votre prénom.</span>}
        </label>
        <label className="flex flex-[1_1_240px] flex-col gap-1.5 text-[13px] text-stone">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} style={{ borderColor: tried && !emailOk ? '#E8A87C' : '#2A3140' }} />
          {tried && !emailOk && <span className="text-terracotta">Indiquez une adresse e-mail valide : l’alerte y sera envoyée.</span>}
        </label>
        <label className="flex flex-[1_1_200px] flex-col gap-1.5 text-[13px] text-stone">
          Téléphone <span className="text-mist">facultatif</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} style={{ borderColor: '#2A3140' }} />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-stone">Moment préféré</span>
        <div role="radiogroup" aria-label="Moment préféré" className="flex flex-wrap gap-1.5">
          {TOD.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={tod === k} onClick={() => setTod(k)} className="h-[38px] rounded-full border px-3.5 text-[13px] font-medium" style={pill(tod === k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-stone">Jours possibles <span className="text-mist">· aucun choix = tous les jours</span></span>
        <div className="flex flex-wrap gap-1.5">
          {WD.map(([k, l]) => {
            const on = wdays.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setWdays((x) => (on ? x.filter((y) => y !== k) : [...x, k]))} className="h-[38px] rounded-full border px-3.5 text-[13px] font-medium" style={pill(on)}>
                {l}
              </button>
            );
          })}
        </div>
      </div>
      {error && <span role="alert" className="text-[13px] text-terracotta">{error}</span>}
      <button type="button" onClick={() => void join()} disabled={busy} className="flex h-[46px] items-center gap-2 self-end rounded-xl bg-sage px-5 text-[15px] font-semibold text-ink disabled:opacity-70">
        {busy && <Spinner size="sm" />}
        M’inscrire sur la liste d’attente
      </button>
    </div>
  );
}

function ContactStep({
  slug,
  practitioner,
  type,
  day,
  slot,
  session,
  loc,
  depositCents,
  onBack,
  onSlotTaken,
  onDone,
}: {
  slug: string;
  practitioner: PractitionerPublicProfile;
  type: CT;
  day: string | null;
  slot: string | null;
  session: GroupSession | null;
  loc: Loc;
  depositCents: number;
  onBack: () => void;
  onSlotTaken: () => void;
  onDone: (d: Done) => void;
}) {
  const [c, setC] = useState({ first: '', last: '', email: '', phone: '', reason: '' });
  const [cancelOk, setCancelOk] = useState(false);
  const [rgpd, setRgpd] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c.email.trim());
  const phoneDigits = c.phone.replace(/\D/g, '').replace(/^33(?=\d{9}$)/, '0');
  const phoneOk = /^0\d{9}$/.test(phoneDigits);
  const balance = type.price_cents != null ? Math.max(0, type.price_cents - depositCents) : null;
  const hours = practitioner.cancellation_policy_hours ?? 24;

  const missing = useMemo(
    () =>
      [
        !(c.first.trim() && c.last.trim()) && 'indiquer votre prénom et votre nom',
        !emailOk && 'renseigner une adresse e-mail valide',
        !phoneOk && 'renseigner un numéro de téléphone à 10 chiffres',
        !session && !cancelOk && 'cocher la case sur les conditions d’annulation',
        !rgpd && 'accepter le traitement de vos données',
      ].filter(Boolean) as string[],
    [c, emailOk, phoneOk, cancelOk, rgpd, session]
  );

  const msg = {
    first: 'Indiquez votre prénom.',
    last: 'Indiquez votre nom.',
    email: c.email.trim() ? 'Cette adresse e-mail semble incomplète, par exemple nom@exemple.fr.' : 'Indiquez votre adresse e-mail : la confirmation y sera envoyée.',
    phone: c.phone.trim() ? 'Le numéro doit compter 10 chiffres.' : 'Indiquez votre téléphone, pour être joint en cas d’imprévu.',
  };
  const field = 'h-[46px] rounded-[10px] border bg-cream px-3 text-[15px] text-charcoal outline-none focus:border-sage';
  const b = (ok: boolean) => ({ borderColor: tried && !ok ? '#E8A87C' : '#2A3140' });

  const submit = useCallback(async () => {
    if (missing.length) {
      setTried(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (session) {
        const res = await fetch(`/api/booking/${slug}/group-sessions/${session.id}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c.last.trim(), first_name: c.first.trim(), email: c.email.trim(), phone: phoneDigits, reason: c.reason.trim() || null }),
        });
        const r = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(r.error === 'FULL' ? 'Cette séance est complète. Choisissez-en une autre.' : r.message || r.error || 'L’inscription a échoué.');
        onDone({ starts_at: session.starts_at, ends_at: session.ends_at, typeName: session.title, duration: null, priceCents: type.price_cents, depositCents: 0, visio: session.location_type === 'video', email: c.email.trim(), group: true });
        return;
      }
      if (!day || !slot) throw new Error('Choisissez un créneau.');
      const res = await fetch(`/api/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_type_id: type.id,
          starts_at: new Date(`${day}T${slot}:00`).toISOString(),
          name: c.last.trim(),
          first_name: c.first.trim(),
          email: c.email.trim(),
          phone: phoneDigits,
          reason: c.reason.trim() || null,
          consent_rgpd: rgpd,
          consent_cancellation: cancelOk,
          location_type: loc,
        }),
      });
      const r = await res.json().catch(() => ({}));
      if (res.status === 409 || r.error === 'SLOT_CONFLICT') {
        onSlotTaken();
        return;
      }
      if (!res.ok) throw new Error(r.message || r.error || 'La réservation a échoué.');
      if (r.checkout_url) {
        window.location.href = r.checkout_url as string;
        return;
      }
      onDone({
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        typeName: r.consultation_type_name,
        duration: r.duration_minutes,
        priceCents: type.price_cents,
        depositCents: 0,
        visio: r.location_type === 'video',
        email: c.email.trim(),
        ics: r.ics_download_url,
        group: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessayez.');
    } finally {
      setBusy(false);
    }
  }, [missing, session, slug, c, phoneDigits, type, day, slot, rgpd, cancelOk, loc, onDone, onSlotTaken]);

  return (
    <section className="flex flex-col gap-4 rounded-[18px] border border-divider bg-surface p-5 sm:p-[26px]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-divider">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-serif text-[28px] font-medium">Vos coordonnées</h1>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-sm font-medium">
          Prénom
          <input value={c.first} onChange={(e) => setC({ ...c, first: e.target.value })} autoComplete="given-name" className={field} style={b(!!c.first.trim())} />
          {tried && !c.first.trim() && <span role="alert" className="text-[13px] font-normal text-terracotta">{msg.first}</span>}
        </label>
        <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-sm font-medium">
          Nom
          <input value={c.last} onChange={(e) => setC({ ...c, last: e.target.value })} autoComplete="family-name" className={field} style={b(!!c.last.trim())} />
          {tried && !c.last.trim() && <span role="alert" className="text-[13px] font-normal text-terracotta">{msg.last}</span>}
        </label>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <label className="flex flex-[1_1_260px] flex-col gap-1.5 text-sm font-medium">
          E-mail
          <input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} autoComplete="email" className={field} style={b(emailOk)} />
          {tried && !emailOk && <span role="alert" className="text-[13px] font-normal text-terracotta">{msg.email}</span>}
        </label>
        <label className="flex flex-[1_1_200px] flex-col gap-1.5 text-sm font-medium">
          Téléphone
          <input type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} autoComplete="tel" placeholder="06 12 34 56 78" className={field} style={b(phoneOk)} />
          {tried && !phoneOk && <span role="alert" className="text-[13px] font-normal text-terracotta">{msg.phone}</span>}
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        <span>Ce qui vous amène <span className="font-normal text-stone">facultatif, en une phrase</span></span>
        <textarea rows={2} value={c.reason} onChange={(e) => setC({ ...c, reason: e.target.value })} placeholder="Ex. fatigue depuis l’hiver, sommeil léger" className="resize-y rounded-[10px] border border-divider bg-cream px-3 py-2.5 text-[15px] leading-normal text-charcoal outline-none placeholder:text-mist focus:border-sage" />
      </label>

      {!session && (
        <div className="flex flex-col gap-3.5 rounded-[14px] border border-divider bg-[#10141B] p-[18px]">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold">Paiement</h2>
            {depositCents > 0 && <span className="text-xs text-stone">🔒 Paiement sécurisé par Stripe</span>}
          </div>
          {depositCents > 0 ? (
            <>
              <div className="flex flex-wrap gap-2.5">
                <div className="flex flex-[1_1_200px] flex-col gap-1 rounded-xl border border-[#2F5A50] bg-sage-light p-3.5">
                  <span className="text-[13px] text-sage-dark">Acompte à régler maintenant</span>
                  <span className="font-serif text-[28px]">{eur(depositCents)}</span>
                  <span className="text-xs text-sage-dark">Obligatoire pour réserver le créneau</span>
                </div>
                <div className="flex flex-[1_1_200px] flex-col gap-1 rounded-xl border border-divider bg-surface-raised p-3.5">
                  <span className="text-[13px] text-stone">Reste à régler après la séance</span>
                  <span className="font-serif text-[28px]">{balance != null ? eur(balance) : '—'}</span>
                  <span className="text-xs text-stone">Au cabinet, par virement ou via le lien de paiement envoyé après la séance</span>
                </div>
              </div>
              <span className="text-[13px] text-stone">Vous saisirez votre carte sur la page de paiement sécurisée de Stripe, puis vous reviendrez ici.</span>
            </>
          ) : (
            <span className="text-sm text-[#B8C1CF]">
              Aucun paiement en ligne : {type.price_cents != null ? `${eur(type.price_cents)} à régler ` : 'règlement '}directement auprès de {practitioner.full_name.split(' ')[0]}, au cabinet ou selon ses indications.
            </span>
          )}
        </div>
      )}

      {!session && (
        <>
          <div className="rounded-xl bg-surface-raised px-3.5 py-3 text-[13px] leading-[1.55] text-[#B8C1CF]">
            <strong className="text-charcoal">Annulation :</strong> gratuite jusqu’à {hours} h avant la séance, depuis le lien reçu par e-mail
            {depositCents > 0 ? ` : l’acompte est alors remboursé. Moins de ${hours} h avant, l’acompte est conservé.` : '.'}
            {practitioner.cancellation_policy_text ? ` ${practitioner.cancellation_policy_text}` : ''}
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-normal">
            <input type="checkbox" checked={cancelOk} onChange={() => setCancelOk((v) => !v)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-sage" />
            <span style={{ color: tried && !cancelOk ? '#E8A87C' : '#E8EDF4' }}>J’ai lu les conditions d’annulation.</span>
          </label>
          {tried && !cancelOk && <span role="alert" className="-mt-2 pl-7 text-[13px] text-terracotta">Cochez cette case pour confirmer que vous avez lu les conditions d’annulation.</span>}
        </>
      )}
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-normal">
        <input type="checkbox" checked={rgpd} onChange={() => setRgpd((v) => !v)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-sage" />
        <span style={{ color: tried && !rgpd ? '#E8A87C' : '#E8EDF4' }}>
          J’accepte que mes données soient traitées par {practitioner.full_name} via Afeia pour la gestion de mon rendez-vous.
        </span>
      </label>
      {tried && !rgpd && <span role="alert" className="-mt-2 pl-7 text-[13px] text-terracotta">Votre accord est nécessaire pour que {practitioner.full_name} reçoive votre rendez-vous.</span>}

      {tried && missing.length > 0 && (
        <div role="alert" className="flex flex-col gap-1.5 rounded-xl border border-[#5A4636] bg-terracotta-light px-4 py-3.5">
          <span className="text-sm font-semibold text-[#F2D2BB]">Pour confirmer, il reste à :</span>
          <ul className="flex list-disc flex-col gap-[3px] pl-[18px] text-[13px] leading-normal text-[#E8C4A8]">
            {missing.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
      {error && <div role="alert" className="rounded-xl border border-[#5A4636] bg-terracotta-light px-4 py-3 text-sm text-[#F2D2BB]">{error}</div>}

      <button type="button" onClick={() => void submit()} disabled={busy} className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-sage text-base font-semibold text-ink disabled:opacity-70">
        {busy && <Spinner size="sm" />}
        {session ? 'Confirmer mon inscription' : depositCents > 0 ? `Payer l’acompte de ${eur(depositCents)} et confirmer` : 'Confirmer le rendez-vous'}
      </button>
      {!session && depositCents > 0 && (
        <span className="text-center text-xs text-mist">Vous serez débité de {eur(depositCents)} aujourd’hui seulement. Le solde n’est jamais prélevé automatiquement.</span>
      )}
    </section>
  );
}

function DoneStep({ practitioner, slug, done }: { practitioner: PractitionerPublicProfile; slug: string; done: Done }) {
  const start = new Date(done.starts_at);
  const balance = done.priceCents != null ? Math.max(0, done.priceCents - done.depositCents) : null;
  const first = practitioner.full_name.split(' ')[0];
  return (
    <section className="flex flex-col items-center gap-4 rounded-[20px] border border-divider bg-surface px-5 py-9 text-center sm:px-7">
      <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-sage-light">
        <Check className="h-8 w-8 text-sage" aria-hidden="true" />
      </span>
      <h1 className="font-serif text-[32px] font-medium">{done.group ? 'Inscription confirmée' : 'Rendez-vous confirmé'}</h1>
      {done.email && <span className="text-[15px] text-[#B8C1CF]">Une confirmation a été envoyée à {done.email}.</span>}
      <div className="flex w-full max-w-[480px] flex-col gap-2.5 rounded-[14px] bg-surface-raised p-[18px] text-left">
        <span className="text-base font-semibold first-letter:uppercase">{longDay.format(start)} à {timeFmt.format(start).replace(':', ' h ')}</span>
        <span className="text-sm text-[#B8C1CF]">
          {done.typeName}
          {done.duration ? ` · ${done.duration} min` : ''}
          {done.priceCents != null ? ` · ${eur(done.priceCents)}` : ''}
        </span>
        <span className="text-sm text-[#B8C1CF]">{done.visio ? 'En visio, depuis chez vous' : practitioner.booking_address ?? 'Au cabinet'}</span>
        {done.depositCents > 0 && (
          <>
            <div className="h-px bg-divider" />
            <span className="flex justify-between text-sm"><span className="text-sage">✓ Acompte payé</span><span className="tabular-nums">{eur(done.depositCents)}</span></span>
            {balance != null && <span className="flex justify-between text-sm text-[#B8C1CF]"><span>Reste à régler après la séance</span><span className="tabular-nums">{eur(balance)}</span></span>}
            <span className="text-xs text-stone">Au cabinet, par virement ou via le lien de paiement envoyé après la séance. Le reçu de l’acompte est dans l’e-mail.</span>
          </>
        )}
      </div>
      {done.visio && (
        <div className="flex w-full max-w-[480px] flex-col gap-2 rounded-[14px] border border-[#2E3A60] bg-[#1F2640] px-[18px] py-4 text-left">
          <span className="text-[15px] font-semibold text-[#D4DCF6]">Séance en visio</span>
          <span className="text-[13px] leading-normal text-[#B9C4EA]">Le lien de la visio est dans l’e-mail de confirmation. Il s’active 15 minutes avant le début.</span>
        </div>
      )}
      {done.ics && (
        <a href={done.ics} className="inline-flex h-11 items-center rounded-[10px] border border-divider px-4 text-sm">Ajouter à mon agenda</a>
      )}
      {!done.group && (
        <div className="flex w-full max-w-[520px] flex-wrap items-center gap-3 rounded-[14px] bg-sage-light p-[18px] text-left">
          <span className="flex flex-[1_1_240px] flex-col gap-[3px]">
            <span className="text-[15px] font-semibold text-[#CFEFE5]">Préparez votre séance</span>
            <span className="text-[13px] leading-normal text-sage-dark">Remplissez le questionnaire préliminaire (environ 15 min) : {first} le lira avant de vous recevoir.</span>
          </span>
          <a href={`/questionnaire/${slug}`} className="inline-flex h-11 items-center rounded-[10px] bg-sage px-4 text-sm font-semibold text-ink">Remplir le questionnaire</a>
        </div>
      )}
      <span className="text-[13px] text-stone">Besoin d’annuler ou de déplacer ? Utilisez le lien dans l’e-mail de confirmation.</span>
    </section>
  );
}
