'use client';

// Question du matin : « Comment avez-vous dormi ? » en cinq visages, puis cause probable si la nuit a été
// mauvaise. Écrit sleep_quality (et custom_indicators.sleep_causes) dans le journal du jour, sans ouvrir
// le journal complet. Inspiré des notations au réveil des apps d'objets connectés.
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, showToast } from '@/components/ui';
import { supabaseConsultant as supabase } from '@/lib/supabase-consultant';
import { SLEEP_CAUSES, SLEEP_FEELINGS, isBadFeeling, type SleepCause, type SleepFeeling } from '@/lib/journal/sleep-feeling';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Status = { feeling: SleepFeeling | null; causes: SleepCause[]; answered: boolean };

export function SleepFeelingCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [editing, setEditing] = useState(false);
  const [feeling, setFeeling] = useState<SleepFeeling | null>(null);
  const [causes, setCauses] = useState<SleepCause[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/consultant/journal/sleep-feeling', { headers: await authHeader(), cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as Status;
      setStatus(body);
      setFeeling(body.feeling);
      setCauses(body.causes ?? []);
    } catch {
      /* la carte reste masquée */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (f: SleepFeeling, c: SleepCause[]) => {
      setSaving(true);
      try {
        const res = await fetch('/api/consultant/journal/sleep-feeling', {
          method: 'POST',
          headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ feeling: f, causes: c }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus({ feeling: f, causes: c, answered: true });
        setEditing(false);
      } catch {
        showToast.error('Votre réponse n’a pas pu être enregistrée. Réessayez.');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const onPick = (f: SleepFeeling) => {
    setFeeling(f);
    if (isBadFeeling(f)) {
      setEditing(true); // on demande la cause avant d'enregistrer
      return;
    }
    void save(f, []);
  };

  const toggleCause = (c: SleepCause) => setCauses((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : cs.length < 5 ? [...cs, c] : cs));

  if (!status) return null;
  const picked = SLEEP_FEELINGS.find((f) => f.value === feeling) ?? null;

  // Déjà répondu, pas en édition : une ligne, modifiable.
  if (status.answered && !editing) {
    const chosen = SLEEP_FEELINGS.find((f) => f.value === status.feeling);
    const causeLabels = (status.causes ?? []).map((c) => SLEEP_CAUSES.find((x) => x.value === c)?.label).filter(Boolean);
    return (
      <Card data-testid="sleep-feeling-card" data-state="answered">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className="text-2xl" aria-hidden>{chosen?.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-charcoal">Nuit dernière : {chosen?.label.toLowerCase()}</p>
            {causeLabels.length ? <p className="text-xs text-stone">{causeLabels.join(' · ')}</p> : null}
          </div>
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-sage hover:underline">
            Modifier
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="sleep-feeling-card" data-state="asking">
      <CardContent className="space-y-4 py-5">
        <div>
          <p className="font-serif text-[20px] font-medium text-charcoal">Comment avez-vous dormi ?</p>
          <p className="text-xs text-stone">Un geste chaque matin. Votre praticien le lira avec les mesures de la nuit.</p>
        </div>
        <div role="radiogroup" aria-label="Comment avez-vous dormi ?" className="grid grid-cols-5 gap-2">
          {SLEEP_FEELINGS.map((f) => {
            const on = feeling === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={saving}
                onClick={() => onPick(f.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[12px] transition ${on ? 'border-sage bg-[#1A2B2A] text-charcoal' : 'border-divider bg-surface text-stone hover:border-stone'}`}
              >
                <span className="text-2xl" aria-hidden>{f.emoji}</span>
                {f.label}
              </button>
            );
          })}
        </div>

        {picked && isBadFeeling(picked.value) ? (
          <div className="space-y-2" data-testid="sleep-causes">
            <p className="text-sm text-charcoal">Une idée de la cause ? (facultatif)</p>
            <div className="flex flex-wrap gap-2">
              {SLEEP_CAUSES.map((c) => {
                const on = causes.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCause(c.value)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? 'border-sage bg-[#1A2B2A] text-charcoal' : 'border-divider text-stone hover:border-stone'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => void save(picked.value, [])} className="text-sm text-stone hover:text-charcoal">
                Passer
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save(picked.value, causes)}
                className="rounded-[10px] bg-sage px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
