'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { getPatientById } from '@/lib/queries';
import { createPlan, sharePlanWithPatient, PlanContent } from '@/services/plans';
import type { PatientWithDetails } from '@/lib/types';

type Section = {
  category: string;
  title: string;
  details: string;
};

type Supplement = {
  name: string;
  dosage: string;
  instructions: string;
};

export default function CreatePlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;

  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Plan content
  const [title, setTitle] = useState('Plan de soin personnalise');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState<Section[]>([
    { category: 'Alimentation', title: '', details: '' }
  ]);
  const [supplements, setSupplements] = useState<Supplement[]>([
    { name: '', dosage: '', instructions: '' }
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadPatient() {
      setLoading(true);
      const data = await getPatientById(patientId);
      if (!data) {
        setError('Patient introuvable.');
        setLoading(false);
        return;
      }
      setPatient(data);
      setLoading(false);
    }

    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
  };

  const addRecommendation = () => {
    setRecommendations([...recommendations, { category: '', title: '', details: '' }]);
  };

  const removeRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  const updateRecommendation = (index: number, field: keyof Section, value: string) => {
    const newRecs = [...recommendations];
    newRecs[index] = { ...newRecs[index], [field]: value };
    setRecommendations(newRecs);
  };

  const addSupplement = () => {
    setSupplements([...supplements, { name: '', dosage: '', instructions: '' }]);
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  const updateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const newSupps = [...supplements];
    newSupps[index] = { ...newSupps[index], [field]: value };
    setSupplements(newSupps);
  };

  const buildPlanContent = (): PlanContent => {
    return {
      title,
      description: description || undefined,
      objectives: objectives.filter((o) => o.trim() !== ''),
      recommendations: recommendations
        .filter((r) => r.title.trim() !== '')
        .map((r) => ({
          category: r.category || 'General',
          title: r.title,
          details: r.details || undefined,
        })),
      supplements: supplements
        .filter((s) => s.name.trim() !== '')
        .map((s) => ({
          name: s.name,
          dosage: s.dosage || undefined,
          instructions: s.instructions || undefined,
        })),
      notes: notes || undefined,
    };
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const content = buildPlanContent();
      const result = await createPlan(patientId, content);

      if (!result) {
        setError('Erreur lors de la creation du plan.');
        setSaving(false);
        return;
      }

      setToast({
        title: 'Plan enregistre',
        description: 'Le plan a ete cree en brouillon.',
        variant: 'success',
      });

      setTimeout(() => {
        router.push(`/patients/${patientId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaving(false);
    }
  };

  const handleSaveAndShare = async () => {
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const content = buildPlanContent();
      const result = await createPlan(patientId, content);

      if (!result) {
        setError('Erreur lors de la creation du plan.');
        setSaving(false);
        return;
      }

      // Share the plan
      const shared = await sharePlanWithPatient(result.planId);

      if (!shared) {
        setToast({
          title: 'Plan cree',
          description: 'Le plan a ete cree mais non partage. Reessayez de le partager.',
          variant: 'info',
        });
      } else {
        setToast({
          title: 'Plan envoye',
          description: `Le plan a ete partage avec ${patient?.name || 'le patient'}.`,
          variant: 'success',
        });
      }

      setTimeout(() => {
        router.push(`/patients/${patientId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
          {error || 'Patient introuvable.'}
        </div>
        <Button variant="secondary" onClick={() => router.push('/patients')}>
          Retour aux patients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Creer un plan de soin</h1>
          <p className="text-sm text-warmgray">
            Pour{' '}
            <Link href={`/patients/${patientId}`} className="text-teal hover:underline">
              {patient.name}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/patients/${patientId}`)}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} loading={saving}>
            Enregistrer brouillon
          </Button>
          <Button variant="primary" onClick={handleSaveAndShare} loading={saving}>
            Enregistrer et envoyer
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Title & Description */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Informations generales</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Titre du plan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Plan de soin personnalise"
            required
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-warmgray">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description generale du plan..."
              className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Objectifs</h2>
            <Button variant="secondary" onClick={addObjective}>
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {objectives.map((obj, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={obj}
                onChange={(e) => updateObjective(idx, e.target.value)}
                placeholder="Objectif..."
                className="flex-1"
              />
              {objectives.length > 1 && (
                <Button variant="ghost" onClick={() => removeObjective(idx)}>
                  Supprimer
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recommandations</h2>
            <Button variant="secondary" onClick={addRecommendation}>
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="rounded-xl bg-sable p-4 space-y-3">
              <div className="flex gap-3">
                <select
                  value={rec.category}
                  onChange={(e) => updateRecommendation(idx, 'category', e.target.value)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
                >
                  <option value="">Categorie...</option>
                  <option value="Alimentation">Alimentation</option>
                  <option value="Hygiene de vie">Hygiene de vie</option>
                  <option value="Sommeil">Sommeil</option>
                  <option value="Activite physique">Activite physique</option>
                  <option value="Gestion du stress">Gestion du stress</option>
                  <option value="Autre">Autre</option>
                </select>
                <Input
                  value={rec.title}
                  onChange={(e) => updateRecommendation(idx, 'title', e.target.value)}
                  placeholder="Titre de la recommandation"
                  className="flex-1"
                />
                {recommendations.length > 1 && (
                  <Button variant="ghost" onClick={() => removeRecommendation(idx)}>
                    Supprimer
                  </Button>
                )}
              </div>
              <textarea
                value={rec.details}
                onChange={(e) => updateRecommendation(idx, 'details', e.target.value)}
                placeholder="Details et explications..."
                className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Complements alimentaires</h2>
            <Button variant="secondary" onClick={addSupplement}>
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplements.map((supp, idx) => (
            <div key={idx} className="rounded-xl bg-sable p-4 space-y-3">
              <div className="flex gap-3">
                <Input
                  value={supp.name}
                  onChange={(e) => updateSupplement(idx, 'name', e.target.value)}
                  placeholder="Nom du complement"
                  className="flex-1"
                />
                <Input
                  value={supp.dosage}
                  onChange={(e) => updateSupplement(idx, 'dosage', e.target.value)}
                  placeholder="Posologie"
                  className="w-40"
                />
                {supplements.length > 1 && (
                  <Button variant="ghost" onClick={() => removeSupplement(idx)}>
                    Supprimer
                  </Button>
                )}
              </div>
              <Input
                value={supp.instructions}
                onChange={(e) => updateSupplement(idx, 'instructions', e.target.value)}
                placeholder="Instructions (moment de prise, avec/sans repas, etc.)"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Notes</h2>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes supplementaires pour le patient..."
            className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="secondary" onClick={() => router.push(`/patients/${patientId}`)}>
          Annuler
        </Button>
        <Button variant="secondary" onClick={handleSaveDraft} loading={saving}>
          Enregistrer brouillon
        </Button>
        <Button variant="primary" onClick={handleSaveAndShare} loading={saving}>
          Enregistrer et envoyer au patient
        </Button>
      </div>

      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
