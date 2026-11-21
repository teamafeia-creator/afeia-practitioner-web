'use client';

// « Mes nuits » : trois thèmes (Sommeil, Récupération, Activité) avec la dernière nuit, l'habituel
// du patient et un écart en mots, le rythme de coucher, et le dernier récap validé par le praticien.
// Inspiré des « cercles » par thème des apps d'objets connectés, sans score composite.
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { supabaseConsultant as supabase } from '@/lib/supabase-consultant';
import type { PatientOverview, PatientTheme } from '@/lib/wearables/patient-overview';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const TONE = { good: 'text-sage', watch: 'text-[#E8A87C]', flat: 'text-stone' } as const;
const ICON: Record<PatientTheme['key'], string> = { sleep: '🌙', recovery: '💚', activity: '👟' };

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

export function MyNightsCard() {
  const [data, setData] = useState<PatientOverview | null>(null);
  const [open, setOpen] = useState<PatientTheme['key'] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/consultant/wearables/overview', { headers: await authHeader(), cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as PatientOverview;
      if (body.enabled) setData(body);
    } catch {
      /* carte masquée */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!data || !data.lastNightDay) return null;

  return (
    <Card data-testid="my-nights-card">
      <CardHeader>
        <CardTitle>Mes nuits</CardTitle>
        <CardDescription>Dernière nuit mesurée : réveil du {DAY.format(new Date(`${data.lastNightDay}T12:00:00Z`))}. Comparée à votre habituel, pas à une norme.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {data.themes.map((t) => {
            const on = open === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : t.key)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${on ? 'border-sage bg-[#1A2B2A]' : 'border-divider bg-surface hover:border-stone'}`}
                data-testid={`theme-${t.key}`}
              >
                <span className="text-2xl" aria-hidden>{ICON[t.key]}</span>
                <span className="text-[12px] text-stone">{t.title}</span>
                <span className="font-serif text-[20px] leading-tight text-charcoal tabular-nums">{t.value}</span>
                <span className={`text-[11px] leading-snug ${TONE[t.tone]}`}>{t.note}</span>
              </button>
            );
          })}
        </div>

        {open ? (
          (() => {
            const t = data.themes.find((x) => x.key === open)!;
            return (
              <div className="rounded-xl border border-divider bg-ink/40 px-4 py-3 text-sm" data-testid="theme-detail">
                <p className="text-charcoal">
                  <span className="text-stone">{t.title} de la dernière nuit : </span>
                  <b className="tabular-nums">{t.value}</b>
                  <span className="text-stone"> · votre habituel : </span>
                  <b className="tabular-nums">{t.usual}</b>
                </p>
                {t.secondary ? (
                  <p className="mt-1 text-charcoal">
                    <span className="text-stone">{t.secondary.label} : </span>
                    <b className="tabular-nums">{t.secondary.value}</b>
                    <span className="text-stone"> · habituel : </span>
                    <b className="tabular-nums">{t.secondary.usual}</b>
                  </p>
                ) : null}
                {t.key === 'sleep' && data.rhythm ? (
                  <p className="mt-1 text-stone">
                    Coucher habituel vers <b className="text-charcoal">{data.rhythm.bedtime}</b>
                    {data.rhythm.wake ? <>, lever vers <b className="text-charcoal">{data.rhythm.wake}</b></> : null} · {data.rhythm.regular} nuits sur {data.rhythm.known} à ± 30 min.
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-stone">L’habituel, c’est la moyenne de vos 28 dernières nuits. Votre praticien lit les mêmes chiffres.</p>
              </div>
            );
          })()
        ) : null}

        {data.recap ? (
          <div className="rounded-xl border border-[#2F5A50] bg-[#16201F] px-4 py-3" data-testid="my-nights-recap">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-sage">Le mot de votre praticien</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-charcoal">{data.recap.text}</p>
            <p className="mt-1 text-xs text-stone">Envoyé le {DAY.format(new Date(data.recap.sentAt))}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
