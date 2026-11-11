'use client';

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  RECAP_PERIOD,
  WEEKDAY_NAMES,
  buildRecapText,
  computeRecap,
  describeSchedule,
  recapPhonePeriod,
  type RecapFrequency,
  type RecapOption,
  type RecapPointId,
  type RecapSettings,
  type Who,
} from '@/lib/wearables/insights';
import type { LoadedInsights } from '@/lib/wearables/insights/load';
import { getLastVariants, saveRecapSettings, sendRecap, type RecapRow } from '@/lib/wearables/insights/queries';

const FREQS: [RecapFrequency, string][] = [
  ['1d', 'jour'],
  ['1w', 'semaine'],
  ['2w', '2 semaines'],
  ['1m', 'mois'],
];

/** Fenêtre « Récap » de la maquette (19f). Rien ne part sans « Envoyer ». */
export function RecapModal({
  consultantId,
  input,
  who,
  practitioner,
  settings,
  draft,
  onSettings,
  onClose,
  onSent,
}: {
  consultantId: string;
  input: LoadedInsights;
  who: Who;
  practitioner: { first: string; full: string };
  settings: RecapSettings | null;
  draft: RecapRow | null;
  onSettings: (s: RecapSettings) => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const s: RecapSettings = settings ?? { enabled: false, frequency: '1w', weekdays: [1], anchor: input.today };
  // Période : suit la fréquence choisie quand « Me le proposer régulièrement » est activé (rfq de la maquette).
  const freq: RecapFrequency = s.enabled ? s.frequency : '1w';
  const useDraft = draft && draft.frequency === freq ? draft : null;
  const live = useMemo(() => computeRecap(input, freq), [input, freq]);
  const options: RecapOption[] = useDraft ? useDraft.options : live.options;
  const period = useDraft ? { from: useDraft.period_from, to: useDraft.period_to } : live.period;
  const P = RECAP_PERIOD[freq];

  const [checked, setChecked] = useState<Set<RecapPointId>>(new Set());
  const [text, setText] = useState<string | null>(null);
  const [variants, setVariants] = useState<Partial<Record<RecapPointId, 0 | 1>>>({});
  const [lastVariants, setLastVariants] = useState<Partial<Record<RecapPointId, 0 | 1>> | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getLastVariants(supabase, consultantId).then(setLastVariants).catch(() => setLastVariants({}));
  }, [consultantId]);

  useEffect(() => {
    setChecked(new Set(useDraft ? useDraft.points : options.filter((o) => o.checked).map((o) => o.id)));
    setText(useDraft?.body ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq, useDraft?.id, live]);

  // Texte généré : changer les cases ou la fréquence le régénère et remplace les modifications.
  const generated = useMemo(() => {
    const points = options.filter((o) => checked.has(o.id)).map((o) => o.id);
    return buildRecapText({ firstName: who.first, practitionerFirstName: practitioner.first, frequency: freq, points, lastVariants: lastVariants ?? {} });
  }, [options, checked, who.first, practitioner.first, freq, lastVariants]);
  useEffect(() => setVariants(generated.variants), [generated]);
  const message = text ?? generated.text;
  const nothing = !options.some((o) => o.id !== 'wear');

  async function updateSettings(next: RecapSettings) {
    onSettings(next);
    setText(null);
    try {
      await saveRecapSettings(supabase, consultantId, next);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Réglage non enregistré.');
    }
  }

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendRecap(supabase, {
        consultantId,
        recapId: useDraft?.id ?? null,
        text: message.trim(),
        points: options.filter((o) => checked.has(o.id)).map((o) => o.id),
        variants,
        frequency: freq,
        period,
        options,
      });
      showToast.success(`Récap envoyé à ${who.first}, avec une notification dans l’app.`);
      onSent();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,12,0.72)] p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="rc-t" className="flex max-h-[calc(100vh-32px)] w-full max-w-[860px] flex-col gap-4 overflow-y-auto rounded-[18px] border border-divider bg-surface p-[22px] shadow-2xl">
        <div className="flex items-start gap-2.5">
          <div className="flex flex-1 flex-col gap-1">
            <h3 id="rc-t" className="text-lg font-semibold">
              {P.title} pour {who.first}
            </h3>
            <span className="text-[13px] text-stone">Préparé à partir de ses mesures. Rien ne part sans votre validation.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="h-9 w-9 flex-none rounded-[9px] border border-divider text-lg">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">Ce que le récap peut mentionner</span>
            {nothing ? <p className="text-sm text-stone">{live.noneText}</p> : null}
            {options.map((o) => {
              const on = checked.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => {
                    const n = new Set(checked);
                    if (on) n.delete(o.id);
                    else n.add(o.id);
                    setChecked(n);
                    setText(null);
                  }}
                  className={`flex items-start gap-3 rounded-[10px] border p-3 text-left ${on ? 'border-[#2F5A50] bg-[#16201F]' : 'border-[#1F2633]'}`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 text-xs font-extrabold text-ink ${on ? 'border-sage bg-sage' : 'border-[#3A4252]'}`}>{on ? '✓' : ''}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{o.label}</span>
                    <span className="text-xs text-stone">{o.why}</span>
                  </span>
                </button>
              );
            })}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">Message</span>
              <textarea value={message} onChange={(e) => setText(e.target.value)} rows={9} className="rounded-[10px] border border-divider bg-ink p-3 text-sm leading-relaxed" />
            </label>
            <span className="text-xs leading-normal text-stone">
              Le récap ne cite aucun chiffre et ne signale jamais une baisse : il encourage ce qui progresse. Les points d’attention restent pour la séance.
            </span>
          </div>

          <div className="flex flex-[0_1_300px] flex-col gap-2 self-start rounded-[22px] border border-divider bg-ink p-4">
            <span className="text-xs text-stone">{recapPhonePeriod(freq, period)}</span>
            <span className="text-sm font-semibold">Un mot de votre praticien</span>
            {message
              .split('\n')
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t, i) => (
                <p key={i} className="text-[13px] leading-snug">
                  {t}
                </p>
              ))}
            <span className="text-[11px] text-stone">{practitioner.full || practitioner.first} · via AFEIA</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl border border-divider p-3.5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Chaque</span>
            {FREQS.map(([id, l]) => {
              const on = s.frequency === id;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => void updateSettings({ ...s, frequency: id })} className={`h-8 rounded-full border px-3 text-xs ${on ? 'border-sage bg-sage text-ink' : 'border-divider text-[#B8C1CF]'}`}>
                  {l}
                </button>
              );
            })}
            {s.frequency !== '1d' ? (
              <>
                <span>le</span>
                {WEEKDAY_NAMES.map((d, i) => {
                  const iso = i + 1;
                  const on = s.weekdays.includes(iso);
                  return (
                    <button
                      key={d}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={d}
                      onClick={() => {
                        const n = on ? s.weekdays.filter((x) => x !== iso) : [...s.weekdays, iso].sort();
                        if (n.length) void updateSettings({ ...s, weekdays: n });
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs ${on ? 'text-charcoal' : 'text-[#B8C1CF]'}`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border-2 text-[10px] font-extrabold text-ink ${on ? 'border-sage bg-sage' : 'border-[#3A4252]'}`}>{on ? '✓' : ''}</span>
                      {d.slice(0, 3)}.
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
          <span className="text-xs text-stone">{describeSchedule(s)}</span>
          <label className="inline-flex items-center gap-2.5 text-[13px]">
            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              onClick={() => void updateSettings({ ...s, enabled: !s.enabled })}
              className={`relative h-5 w-[34px] flex-none rounded-full ${s.enabled ? 'bg-sage' : 'bg-[#3A4252]'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink ${s.enabled ? 'left-[14px]' : 'left-0.5'}`} />
            </button>
            Me le proposer régulièrement (je valide avant l’envoi)
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[10px] border border-divider px-3.5 text-sm">
            Annuler
          </button>
          <button type="button" onClick={() => void send()} disabled={sending || !message.trim()} className="h-10 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-50">
            {sending ? 'Envoi…' : `Envoyer à ${who.first}`}
          </button>
        </div>
      </div>
    </div>
  );
}
