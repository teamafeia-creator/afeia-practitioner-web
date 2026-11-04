'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import {
  CAUSES,
  SURVEY_Q1,
  SURVEY_Q2,
  SURVEY_TITLE_1,
  SURVEY_TITLE_2,
  draftFor,
  surveyIntro,
  surveyMessage,
  type Cause,
  type InactiveRow,
} from '@/lib/statistics/activity';

type Channel = 'app' | 'email' | 'both';
const CHANNELS: [Channel, string][] = [
  ['app', 'Message dans l’app'],
  ['email', 'E-mail'],
  ['both', 'Les deux'],
];
const WHERE: Record<Channel, string> = { app: 'dans l’app', email: 'par e-mail', both: 'dans l’app et par e-mail' };

async function post(body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/statistics/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'L’envoi a échoué.');
  if (json.logged === false) showToast.error('Message envoyé, mais le suivi n’a pas pu être enregistré.');
  return json;
}

const pillStyle = (on: boolean) => ({ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' });
const field = 'w-full resize-y rounded-[10px] border border-divider bg-cream px-3.5 py-3 text-sm leading-[1.55] text-charcoal outline-none focus:border-sage';

function ChannelPicker({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] text-stone">Envoyer par</span>
      <div role="radiogroup" aria-label="Canal" className="flex flex-wrap gap-1.5">
        {CHANNELS.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)} className="h-9 rounded-full border px-3.5 text-[13px] font-medium" style={pillStyle(value === k)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Footer({ onCancel, onConfirm, busy, label = 'Valider et envoyer' }: { onCancel: () => void; onConfirm: () => void; busy: boolean; label?: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-divider pt-1.5">
      <button type="button" onClick={onCancel} className="h-11 rounded-[10px] border border-divider px-4 text-sm text-charcoal">Annuler</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
        {busy && <Spinner size="sm" />}
        {label}
      </button>
    </div>
  );
}

/** 2 · Demander : questionnaire de 2 questions, relu avant l'envoi. */
export function SurveyModal({ row, onClose, onDone }: { row: InactiveRow | null; onClose: () => void; onDone: () => void }) {
  const [intro, setIntro] = useState('');
  const [channel, setChannel] = useState<Channel>('app');
  const [busy, setBusy] = useState(false);
  const first = row?.name.split(' ')[0] ?? '';

  useEffect(() => {
    if (!row) return;
    setIntro(surveyIntro(row.name.split(' ')[0], row.step));
    setChannel('app');
  }, [row]);

  async function send() {
    if (!row) return;
    if (!intro.trim()) return showToast.error('Le petit mot d’introduction est vide.');
    setBusy(true);
    try {
      await post({ consultant_id: row.id, kind: 'survey', channel, text: surveyMessage(intro), step: row.step, signal: row.signal });
      showToast.success(`Questionnaire envoyé à ${first} ${WHERE[channel]}. Sa réponse arrivera dans vos messages.`);
      onDone();
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'L’envoi a échoué.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={!!row} onClose={onClose} title={`Questionnaire à ${first}`} size="lg">
      <div className="flex flex-col gap-3.5">
        <p className="text-[13px] leading-normal text-stone">Deux questions, 30 secondes. La réponse indique la cause du décrochage et vous propose le bon message. Rien n’est envoyé avant que vous validiez.</p>
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Petit mot d’introduction (modifiable)
          <textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} className={field} />
        </label>
        <div className="flex flex-col gap-3 rounded-[14px] border border-divider bg-cream p-4">
          <span className="text-xs font-semibold text-stone">Aperçu de ce que {first} recevra</span>
          <span className="whitespace-pre-line text-[13px] leading-[1.55] text-[#C9CFDA]">{intro}</span>
          <span className="text-sm font-semibold text-charcoal">1. {SURVEY_TITLE_1}</span>
          <div className="flex flex-col gap-1.5">
            {SURVEY_Q1.map(([k, l], i) => (
              <span key={k} className="flex min-h-[38px] items-center gap-2.5 rounded-[10px] border border-divider px-3 text-[13px] text-charcoal">
                <span className="w-4 text-stone">{'abcdef'[i]})</span>
                {l}
              </span>
            ))}
          </div>
          <span className="text-sm font-semibold text-charcoal">2. {SURVEY_TITLE_2}</span>
          <div className="flex flex-wrap gap-1.5">
            {SURVEY_Q2.map((o) => (
              <span key={o} className="inline-flex h-[34px] items-center rounded-full border border-[#3A4252] px-3.5 text-[13px] text-charcoal">{o}</span>
            ))}
          </div>
          <span className="text-xs text-stone">{first} répond simplement au message (par exemple « b, plus tard ») ; vous classez ensuite sa réponse.</span>
        </div>
        <ChannelPicker value={channel} onChange={setChannel} />
        <Footer onCancel={onClose} onConfirm={() => void send()} busy={busy} />
      </div>
    </Modal>
  );
}

/** 3 · Comprendre : le praticien classe la réponse reçue dans la messagerie. */
export function AnswerModal({ row, onClose, onDone }: { row: InactiveRow | null; onClose: () => void; onDone: () => void }) {
  const [cause, setCause] = useState<Cause | null>(null);
  const [point, setPoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = row?.name.split(' ')[0] ?? '';

  useEffect(() => {
    setCause(null);
    setPoint(null);
  }, [row]);

  async function save() {
    if (!row || !cause) return showToast.error('Choisissez la raison donnée par le consultant.');
    setBusy(true);
    try {
      await post({ consultant_id: row.id, kind: 'answer', cause, point });
      showToast.success('Réponse enregistrée.');
      onDone();
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'La réponse n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={!!row} onClose={onClose} title={`Réponse de ${first}`} size="lg">
      <div className="flex flex-col gap-3.5">
        {row?.survey?.reply ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-stone">Message reçu le {new Date(row.survey.reply.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
            <div className="max-w-[85%] self-start whitespace-pre-line rounded-[16px_16px_16px_4px] bg-surface-raised px-3.5 py-2.5 text-[13px] leading-[1.55] text-charcoal">{row.survey.reply.text || '(message vide)'}</div>
          </div>
        ) : (
          <p className="text-[13px] text-stone">Aucune réponse écrite dans la messagerie. Si {first} vous a répondu autrement (téléphone, séance…), indiquez sa réponse ici.</p>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-stone">1. {SURVEY_TITLE_1}</span>
          <div role="radiogroup" className="flex flex-col gap-1.5">
            {SURVEY_Q1.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={cause === k} onClick={() => setCause(k)} className="flex min-h-[40px] items-center gap-2.5 rounded-[10px] border px-3 text-left text-[13px]" style={{ borderColor: cause === k ? '#2F5A50' : '#2A3140', background: cause === k ? '#23383B' : 'transparent', color: '#E8EDF4' }}>
                <span className="h-3.5 w-3.5 flex-none rounded-full border-2" style={{ borderColor: cause === k ? '#6DD4B8' : '#3A4252', background: cause === k ? '#6DD4B8' : 'transparent' }} />
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-stone">2. {SURVEY_TITLE_2}</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {SURVEY_Q2.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={point === o} onClick={() => setPoint(point === o ? null : o)} className="h-9 rounded-full border px-3.5 text-[13px] font-medium" style={pillStyle(point === o)}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <Footer onCancel={onClose} onConfirm={() => void save()} busy={busy} label="Enregistrer la réponse" />
      </div>
    </Modal>
  );
}

/** 4 · Agir : message adapté à la cause (ou clôture), relu et modifiable avant l'envoi. */
export function RelanceModal({
  row,
  onClose,
  onDone,
  signature,
  bookingUrl,
}: {
  row: InactiveRow | null;
  onClose: () => void;
  onDone: () => void;
  signature: string;
  bookingUrl: string | null;
}) {
  const answered = !!row?.survey?.answer;
  const [cause, setCause] = useState<Cause>('silence');
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<Channel>('app');
  const [link, setLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const first = row?.name.split(' ')[0] ?? '';

  useEffect(() => {
    if (!row) return;
    const c: Cause = row.survey?.answer?.cause ?? row.guessedCause;
    setCause(c);
    setText(draftFor(row.name.split(' ')[0], row.step, c, signature));
    setChannel('app');
    setLink(c !== 'mieux' && !!bookingUrl);
  }, [row, signature, bookingUrl]);

  const closing = cause === 'mieux';
  const preview = `${text}${link && bookingUrl ? `\n\nPrendre rendez-vous : ${bookingUrl}` : ''}`;

  async function send() {
    if (!row) return;
    if (!text.trim()) return showToast.error('Le message est vide.');
    setBusy(true);
    try {
      await post({ consultant_id: row.id, kind: closing ? 'close' : 'relance', channel, text, with_link: link, cause, step: row.step });
      showToast.success(`Message envoyé à ${first} ${WHERE[channel]}.`);
      onDone();
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'L’envoi a échoué.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={!!row} onClose={onClose} title={closing ? `Clôturer l’accompagnement de ${first}` : `Message à ${first}`} size="lg">
      {row && (
        <div className="flex flex-col gap-3.5">
          <p className="text-[13px] leading-normal text-stone">Détecté : {row.signalText.charAt(0).toLowerCase() + row.signalText.slice(1)}. Rien n’est envoyé avant que vous validiez.</p>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-stone">Message adapté à la cause du décrochage</span>
            <div role="radiogroup" aria-label="Cause du décrochage" className="flex flex-wrap gap-1.5">
              {(Object.keys(CAUSES) as Cause[]).map((k) => {
                const on = cause === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setCause(k);
                      setText(draftFor(first, row.step, k, signature));
                      if (k === 'mieux') setLink(false);
                    }}
                    className="h-8 rounded-full border px-3 text-xs font-medium"
                    style={{ borderColor: on ? '#5A4636' : '#2A3140', background: on ? '#373131' : 'transparent', color: on ? '#E8A87C' : '#B8C1CF' }}
                  >
                    {CAUSES[k]}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-stone">
              {answered ? `Cause donnée par ${first} dans sa réponse au questionnaire.` : 'Cause supposée d’après les données, sans réponse au questionnaire.'} Changer la cause réécrit le message.
            </span>
          </div>
          <ChannelPicker value={channel} onChange={setChannel} />
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Message (modifiable)
            <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} className={field} />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-stone">Ce que {first} recevra</span>
            <div className="max-w-[85%] self-start whitespace-pre-line rounded-[16px_16px_16px_4px] bg-sage-light px-3.5 py-2.5 text-[13px] leading-[1.55] text-charcoal">{preview}</div>
          </div>
          <label className={`inline-flex items-center gap-2 text-sm ${bookingUrl ? 'cursor-pointer text-charcoal' : 'text-stone'}`}>
            <input type="checkbox" disabled={!bookingUrl} checked={link} onChange={() => setLink((v) => !v)} className="h-[18px] w-[18px] accent-[#6DD4B8]" />
            Ajouter mon lien de prise de rendez-vous
            {!bookingUrl && <span className="text-xs">(à configurer dans Paramètres › Réservation)</span>}
          </label>
          {closing && <p className="text-xs text-stone">L’accompagnement sera noté comme clôturé dans le suivi des décrochages. Le dossier du consultant n’est pas modifié.</p>}
          <Footer onCancel={onClose} onConfirm={() => void send()} busy={busy} />
        </div>
      )}
    </Modal>
  );
}
