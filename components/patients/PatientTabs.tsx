'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Patient } from '../../lib/mock';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmallLineChart } from '../charts/SmallLineChart';

const TABS = ['Profil', 'Anamnèse', 'Circular', 'Journal', 'Messages'] as const;

type Tab = (typeof TABS)[number];

export function PatientTabs({ patient }: { patient: Patient }) {
  const [tab, setTab] = useState<Tab>('Profil');
  const lastConsultation = patient.consultations[0];
  const planHref = `/plans/${patient.plan.id}`;
  const consultationHref = lastConsultation ? `/consultations/${lastConsultation.id}` : planHref;

  const summaries = patient.wearable?.summaries ?? [];
  const sleep = summaries.map((s) => s.sleepDuration);
  const hrv = summaries.map((s) => s.hrvAvg);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-charcoal">{patient.name}</h1>
            {patient.isPremium ? (
              <Badge variant="premium">Premium</Badge>
            ) : (
              <Badge variant="info">Standard</Badge>
            )}
          </div>
          <p className="text-sm text-warmgray">{patient.age} ans • {patient.city} • Dernière consultation : {patient.lastConsultation}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={consultationHref}><Button variant="cta">Ouvrir consultation</Button></Link>
          <Link href={planHref}><Button variant="secondary">Voir le plan</Button></Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 transition',
              tab === t ? 'bg-teal text-white ring-teal/30' : 'bg-white hover:bg-sable'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profil' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Aperçu</h2>
              <div className="flex gap-2">
                {patient.flags.newQuestionnaire ? <Badge variant="new">Questionnaire</Badge> : null}
                {patient.flags.newCircularData ? <Badge variant="attention">Circular</Badge> : null}
                {patient.flags.unreadMessages ? <Badge variant="attention">{patient.flags.unreadMessages} msg</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-sable p-4 ring-1 ring-black/5">
                <p className="text-xs uppercase tracking-wide text-warmgray">Objectifs</p>
                <p className="mt-2 text-sm text-marine">{patient.anamnese.objectifs}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-warmgray">Motif</p>
                <p className="mt-2 text-sm text-marine">{patient.anamnese.motif}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="text-xs uppercase tracking-wide text-warmgray">Tendances (non médicales)</p>
                {patient.isPremium ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-warmgray">Sommeil (h)</span>
                      <span className="font-semibold">{sleep.at(-1)?.toFixed(1) ?? '—'}</span>
                    </div>
                    <SmallLineChart values={sleep} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-warmgray">HRV (ms)</span>
                      <span className="font-semibold">{hrv.at(-1) ?? '—'}</span>
                    </div>
                    <SmallLineChart values={hrv} />
                    <p className="text-xs text-warmgray">À lire comme des tendances. Pas de diagnostic.</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-sable p-3 text-sm text-warmgray ring-1 ring-black/5">
                    Données Circular non activées.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'Anamnèse' && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Anamnèse (résumé)</h2></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Alimentation" value={patient.anamnese.alimentation} />
              <Section title="Digestion" value={patient.anamnese.digestion} />
              <Section title="Sommeil" value={patient.anamnese.sommeil} />
              <Section title="Stress" value={patient.anamnese.stress} />
              <Section title="Compléments" value={patient.anamnese.complement ?? '—'} />
              <Section title="Allergies" value={patient.anamnese.allergies ?? '—'} />
            </div>
            <div className="mt-4 rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
              Ce questionnaire sert uniquement à préparer un accompagnement global et personnalisé (sans diagnostic).
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'Circular' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Circular (Premium)</h2>
              {patient.isPremium ? <Badge variant="premium">Actif</Badge> : <Badge variant="attention">Non activé</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!patient.isPremium ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Option Premium : sommeil, HRV, activité. Synchronisation 1×/jour + à l’ouverture.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-warmgray">
                        <th className="py-2">Date</th>
                        <th className="py-2">Sommeil</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">HRV</th>
                        <th className="py-2">Activité</th>
                        <th className="py-2">Complétude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((s) => (
                        <tr key={s.date} className="border-t border-black/5">
                          <td className="py-2">{s.date}</td>
                          <td className="py-2">{s.sleepDuration.toFixed(1)} h</td>
                          <td className="py-2">{s.sleepScore}/100</td>
                          <td className="py-2">{s.hrvAvg} ms</td>
                          <td className="py-2">{s.activityLevel}/100</td>
                          <td className="py-2">{Math.round(s.completeness * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {patient.wearable?.insights.map((i, idx) => (
                    <div key={idx} className="rounded-2xl bg-sable p-4 ring-1 ring-black/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-warmgray">Insight</span>
                        <Badge variant={i.level === 'attention' ? 'attention' : 'info'}>
                          {i.level === 'attention' ? 'Attention' : 'Info'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-marine">{i.message}</p>
                      <p className="mt-2 text-xs text-warmgray">Suggestion : {i.suggestedAction}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                  Ton neutre et non alarmiste. Si vous avez un doute, recommander une consultation médicale.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Journal' && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Journal quotidien</h2></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {patient.journal.map((j) => (
                <li key={j.date} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-teal/5 px-2 py-1 text-teal">Énergie : {j.energy}</span>
                      <span className="rounded-full bg-teal/5 px-2 py-1 text-teal">Humeur : {j.mood}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-marine">{j.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-warmgray">
                    {Object.entries(j.adherence).map(([k, v]) => (
                      <span key={k} className={cn('rounded-full px-2 py-1 ring-1', v ? 'bg-teal/5 text-teal ring-teal/20' : 'bg-white text-warmgray ring-black/10')}>
                        {k} : {v ? 'OK' : '—'}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {tab === 'Messages' && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Messagerie</h2></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                {patient.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[78%] rounded-2xl px-4 py-2 text-sm ring-1 ring-black/5',
                      m.from === 'patient' ? 'bg-sable text-marine' : 'ml-auto bg-teal text-white'
                    )}
                  >
                    <p>{m.text}</p>
                    <p className={cn('mt-1 text-[11px] opacity-80', m.from === 'patient' ? 'text-warmgray' : 'text-white/80')}>
                      {new Date(m.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                MVP : messagerie simulée (mock). Intégration via <code className="px-1">GET /threads</code> et <code className="px-1">POST /threads/{'{id}'}/messages</code>.
              </div>

              <Button variant="secondary" onClick={() => alert('📩 Réponse envoyée (mock)')}>Répondre</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <p className="text-xs uppercase tracking-wide text-warmgray">{title}</p>
      <p className="mt-2 text-sm text-marine whitespace-pre-line">{value}</p>
    </div>
  );
}
