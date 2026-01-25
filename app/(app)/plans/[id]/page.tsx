'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockPatients, PlanVersion } from '../../../../lib/mock';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Input } from '../../../../components/ui/Input';

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params.id;

  const patient = useMemo(() => mockPatients.find((p) => p.plan.id === planId), [planId]);
  const plan = patient?.plan;

  const [selected, setSelected] = useState<number>(plan?.versions.length ? plan.versions.length - 1 : 0);
  const current: PlanVersion | undefined = plan?.versions[selected];

  const [title, setTitle] = useState(current?.title ?? '');
  const [sections, setSections] = useState(current?.sections ?? []);

  if (!patient || !plan || !current) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Plan introuvable</h1>
        <Button variant="secondary" onClick={() => router.push('/patients')}>Retour</Button>
      </div>
    );
  }

  const isLatest = selected === plan.versions.length - 1;

  function saveMock() {
    alert('✅ Plan enregistré (mock).');
  }

  function newVersion() {
    alert('🧾 Nouvelle version créée (mock).');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Plan d’accompagnement</h1>
          <div className="mt-1 text-sm text-warmgray">
            <Link className="text-teal hover:underline" href={`/patients/${patient.id}`}>{patient.name}</Link>
            <span className="mx-2">•</span>
            <span>Plan #{plan.id}</span>
            <span className="mx-2">•</span>
            <Badge variant={patient.isPremium ? 'premium' : 'info'}>{patient.isPremium ? 'Premium' : 'Standard'}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={saveMock}>Enregistrer</Button>
          <Button variant="secondary" onClick={newVersion}>Créer une nouvelle version</Button>
          <Button variant="ghost" onClick={() => alert('📤 Publication patient (à brancher)')}>Publier au patient</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {plan.versions.map((v, idx) => (
                <button
                  key={v.version}
                  onClick={() => {
                    setSelected(idx);
                    setTitle(plan.versions[idx].title);
                    setSections([...plan.versions[idx].sections]);
                  }}
                  className={`rounded-xl px-3 py-1 text-xs font-medium ring-1 transition ${
                    idx === selected
                      ? 'bg-teal text-white ring-teal/40'
                      : 'bg-white text-marine ring-black/10 hover:bg-sable'
                  }`}
                >
                  V{v.version}
                </button>
              ))}
              <span className="ml-2 text-xs text-warmgray">
                {new Date(current.publishedAt).toLocaleDateString('fr-FR')} • {isLatest ? 'Version active' : 'Version archivée'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-warmgray">Titre du plan</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Statut</label>
              <div className="mt-1 rounded-xl bg-sable p-2 text-sm text-marine ring-1 ring-black/5">
                {isLatest ? 'Brouillon (modifiable)' : 'Lecture seule (historique)'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((s, idx) => (
              <div key={`${s.title}-${idx}`} className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    className="sm:max-w-sm"
                    value={s.title}
                    onChange={(e) => {
                      const next = [...sections];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setSections(next);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const next = sections.filter((_, i) => i !== idx);
                        setSections(next);
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                <textarea
                  value={s.body}
                  onChange={(e) => {
                    const next = [...sections];
                    next[idx] = { ...next[idx], body: e.target.value };
                    setSections(next);
                  }}
                  className="mt-3 min-h-[120px] w-full rounded-2xl border border-black/10 bg-white p-3 text-sm text-charcoal placeholder:text-warmgray focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder="Recommandations (ton neutre, pédagogique, non médical)"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setSections([...sections, { title: 'Nouvelle section', body: '' }])}
            >
              + Ajouter une section
            </Button>
            <Button variant="ghost" onClick={() => alert('🧠 Pré-remplissage IA (à brancher)')}>Pré-remplir avec IA</Button>
          </div>

          <div className="rounded-2xl bg-sable p-3 text-xs text-warmgray ring-1 ring-black/5">
            Rappel : ce plan ne remplace pas un suivi médical. En cas de signaux préoccupants, recommander une consultation médicale.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
