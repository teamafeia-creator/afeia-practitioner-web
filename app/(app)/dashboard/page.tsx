/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { mockNotifications, mockPatients } from '../../../lib/mock';

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  const priority = mockPatients
    .map((p) => {
      const attention = (p.flags.newCircularData || p.flags.newQuestionnaire || p.flags.unreadMessages > 0) ? 'attention' : 'info';
      return { p, attention };
    })
    .slice(0, 4);

  const premium = mockPatients.filter((p) => p.isPremium).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Tableau de bord</h1>
          <p className="text-sm text-warmgray">{today} — aperçu rapide (objectif : ~5 min par patient)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => alert('➕ Création patient (à brancher)')}>+ Nouveau patient</Button>
          <Button variant="cta" onClick={() => alert('📅 Agenda / prise de RDV (à brancher)')}>Prise de RDV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-xs text-warmgray">Questionnaires, Circular, messages</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockNotifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 rounded-xl bg-sable/60 p-3 ring-1 ring-black/5">
                  <div className={`mt-1 h-2 w-2 rounded-full ${n.level === 'attention' ? 'bg-gold' : 'bg-teal'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-charcoal">{n.title}</p>
                    <p className="text-xs text-warmgray">{n.desc}</p>
                    <Link className="mt-1 inline-block text-xs text-teal hover:underline" href={`/patients/${n.patientId}`}>
                      Ouvrir le dossier
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Patients à suivre</h2>
              <p className="text-xs text-warmgray">Signaux doux (non médicaux)</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {priority.map(({ p, attention }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
                  <div className="min-w-0">
                    <Link className="truncate text-sm font-medium text-charcoal hover:underline" href={`/patients/${p.id}`}>
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-warmgray">{p.anamnese.objectifs}</p>
                  </div>
                  <Badge variant={attention === 'attention' ? 'attention' : 'info'}>
                    {attention === 'attention' ? 'À regarder' : 'Info'}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link href="/patients" className="inline-block w-full">
                <Button variant="secondary" className="w-full">Voir tous les patients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Premium (Circular)</h2>
              <p className="text-xs text-warmgray">Sommeil • HRV • Activité</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {premium.map((p) => {
                const last = p.wearable?.summaries?.[0];
                return (
                  <div key={p.id} className="rounded-xl bg-sable/60 p-3 ring-1 ring-black/5">
                    <div className="flex items-center justify-between">
                      <Link className="text-sm font-medium text-charcoal hover:underline" href={`/patients/${p.id}`}>{p.name}</Link>
                      <Badge variant="premium">Premium</Badge>
                    </div>
                    <p className="mt-1 text-xs text-warmgray">Dernier import : {last?.date ?? '—'}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-2 ring-1 ring-black/5">
                        <p className="text-warmgray">Sommeil</p>
                        <p className="font-semibold text-charcoal">{last ? `${last.sleepDuration.toFixed(1)}h` : '—'}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-black/5">
                        <p className="text-warmgray">HRV</p>
                        <p className="font-semibold text-charcoal">{last ? `${last.hrvAvg}ms` : '—'}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-black/5">
                        <p className="text-warmgray">Activité</p>
                        <p className="font-semibold text-charcoal">{last ? `${last.activityLevel}/100` : '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">Raccourcis</h2>
            <p className="text-xs text-warmgray">Actions rapides</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Préparer une séance</p>
              <p className="mt-1 text-sm text-warmgray">Analyser anamnèse et dernières entrées avant consultation.</p>
            </div>
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Envoyer un message</p>
              <p className="mt-1 text-sm text-warmgray">Ton neutre, doux, non médicalisant.</p>
            </div>
            <div className="rounded-xl bg-sable/60 p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-charcoal">Publier un plan</p>
              <p className="mt-1 text-sm text-warmgray">Versionner, publier, et suivre l’adhésion au quotidien.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
