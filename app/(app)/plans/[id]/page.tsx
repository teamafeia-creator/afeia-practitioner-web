'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPlanById } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import type { Consultant, Plan, PlanVersion, PlanSection } from '@/lib/types';

type PlanWithDetails = Plan & {
  consultant?: Consultant;
  versions?: (PlanVersion & { sections?: PlanSection[] })[];
};

type Section = {
  title: string;
  body: string;
};

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params.id;

  const [plan, setPlan] = useState<PlanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Load plan data
  useEffect(() => {
    let active = true;

    async function loadPlan() {
      setLoading(true);
      const planData = await getPlanById(planId);
      if (!active) return;

      if (!planData) {
        setLoading(false);
        return;
      }

      setPlan(planData);

      // Initialize with the latest version
      const versions = planData.versions || [];
      if (versions.length > 0) {
        const latestIdx = versions.length - 1;
        setSelected(latestIdx);
        setTitle(versions[latestIdx].title || '');
        setSections(
          (versions[latestIdx].sections || []).map((s) => ({
            title: s.title || '',
            body: s.body || ''
          }))
        );
      }

      setLoading(false);
    }

    if (planId) {
      loadPlan();
    }

    return () => {
      active = false;
    };
  }, [planId]);

  // Handle version selection
  function handleVersionSelect(idx: number) {
    if (!plan?.versions) return;
    setSelected(idx);
    const version = plan.versions[idx];
    setTitle(version.title || '');
    setSections(
      (version.sections || []).map((s) => ({
        title: s.title || '',
        body: s.body || ''
      }))
    );
  }

  // Save plan changes
  async function handleSave() {
    if (!plan?.versions) return;

    setSaving(true);
    try {
      const currentVersion = plan.versions[selected];

      // Update the plan version title
      await supabase
        .from('plan_versions')
        .update({
          title
        })
        .eq('id', currentVersion.id);

      // Update sections - for simplicity, delete and recreate
      // In a production app, you might want to do a more intelligent diff
      await supabase
        .from('plan_sections')
        .delete()
        .eq('plan_version_id', currentVersion.id);

      if (sections.length > 0) {
        await supabase.from('plan_sections').insert(
          sections.map((s, idx) => ({
            plan_version_id: currentVersion.id,
            title: s.title,
            body: s.body,
            sort_order: idx
          }))
        );
      }

      setToast({
        title: 'Plan enregistré',
        description: 'Les modifications ont été sauvegardées.',
        variant: 'success'
      });

      // Reload plan data
      const updatedPlan = await getPlanById(planId);
      if (updatedPlan) {
        setPlan(updatedPlan);
      }
    } catch (err) {
      console.error('Error saving plan:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le plan.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  }

  // Create new version
  async function handleNewVersion() {
    if (!plan) return;

    setSaving(true);
    try {
      const nextVersion = (plan.versions?.length || 0) + 1;

      const { data: newVersion, error: versionError } = await supabase
        .from('plan_versions')
        .insert({
          plan_id: plan.id,
          version: nextVersion,
          title: `Nouvelle version V${nextVersion}`,
          published_at: new Date().toISOString()
        })
        .select()
        .single();

      if (versionError || !newVersion) {
        throw versionError || new Error('Failed to create version');
      }

      // Copy sections from current version
      if (sections.length > 0) {
        await supabase.from('plan_sections').insert(
          sections.map((s, idx) => ({
            plan_version_id: newVersion.id,
            title: s.title,
            body: s.body,
            sort_order: idx
          }))
        );
      }

      setToast({
        title: 'Nouvelle version créée',
        description: `Version ${nextVersion} créée avec succès.`,
        variant: 'success'
      });

      // Reload plan data
      const updatedPlan = await getPlanById(planId);
      if (updatedPlan) {
        setPlan(updatedPlan);
        const newIdx = (updatedPlan.versions?.length || 1) - 1;
        handleVersionSelect(newIdx);
      }
    } catch (err) {
      console.error('Error creating new version:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible de créer une nouvelle version.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du plan…
      </div>
    );
  }

  if (!plan || !plan.versions || plan.versions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Plan introuvable</h1>
        <p className="text-sm text-warmgray">
          Ce plan n&apos;existe pas ou n&apos;a pas de versions.
          Vous pouvez créer un plan depuis la fiche consultant.
        </p>
        <Button variant="secondary" onClick={() => router.push('/consultants')}>
          Retour aux consultants
        </Button>
      </div>
    );
  }

  const current = plan.versions[selected];
  const isLatest = selected === plan.versions.length - 1;
  const consultant = plan.consultant;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Plan d&apos;accompagnement</h1>
          <div className="mt-1 text-sm text-warmgray">
            {consultant ? (
              <Link className="text-teal hover:underline" href={`/consultants/${consultant.id}`}>
                {consultant.name}
              </Link>
            ) : (
              <span>Consultant inconnu</span>
            )}
            <span className="mx-2">•</span>
            <span>Plan #{plan.id.slice(0, 8)}</span>
            {consultant && (
              <>
                <span className="mx-2">•</span>
                <Badge variant={consultant.is_premium ? 'premium' : 'info'}>
                  {consultant.is_premium ? 'Premium' : 'Standard'}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={handleNewVersion} disabled={saving}>
            Créer une nouvelle version
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setToast({
                title: 'Publication',
                description: 'Utilisez l\'onglet Plan dans la fiche consultant pour partager le plan.',
                variant: 'info'
              })
            }
          >
            Publier au consultant
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {plan.versions.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => handleVersionSelect(idx)}
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
                {new Date(current.published_at).toLocaleDateString('fr-FR')} •{' '}
                {isLatest ? 'Version active' : 'Version archivée'}
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
              <div key={idx} className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
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
            <Button
              variant="ghost"
              onClick={() =>
                setToast({
                  title: 'IA',
                  description: 'Le pré-remplissage IA sera bientôt disponible.',
                  variant: 'info'
                })
              }
            >
              Pré-remplir avec IA
            </Button>
          </div>

          <div className="rounded-2xl bg-sable p-3 text-xs text-warmgray ring-1 ring-black/5">
            Rappel : ce plan ne remplace pas un suivi médical. En cas de signaux préoccupants,
            recommander une consultation médicale.
          </div>
        </CardContent>
      </Card>

      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
