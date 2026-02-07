'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

type Section = {
  id: string;
  title: string;
  content: string;
};

export default function NewPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const consultantId = resolvedParams.id;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSection = () => {
    setSections([
      ...sections,
      { id: crypto.randomUUID(), title: '', content: '' }
    ]);
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Le titre du plan est obligatoire.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/consultants/${consultantId}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          sections: sections.filter(s => s.title.trim() || s.content.trim())
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la creation du plan');
      }

      router.push(`/consultants/${consultantId}`);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation du plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/consultants/${consultantId}`}
            className="text-sm text-teal hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au consultant
          </Link>
          <h1 className="text-2xl font-semibold text-charcoal">Nouveau plan de soins</h1>
          <p className="text-sm text-warmgray mt-1">
            Creez un plan personnalise pour votre consultant
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold-dark">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Informations generales</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Titre du plan *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plan d'hygiene vitale personnalise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description generale du plan et objectifs..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-charcoal">Sections du plan</h2>
          <Button
            variant="secondary"
            onClick={addSection}
            icon={<Plus className="h-4 w-4" />}
          >
            Ajouter une section
          </Button>
        </div>

        {sections.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-warmgray">
                Aucune section ajoutee. Cliquez sur &quot;Ajouter une section&quot; pour commencer.
              </p>
            </CardContent>
          </Card>
        )}

        {sections.map((section, index) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-charcoal">
                  Section {index + 1}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => removeSection(section.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Supprimer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={section.title}
                onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                placeholder="Titre de la section (ex: Alimentation, Sommeil, Exercice...)"
              />
              <Textarea
                value={section.content}
                onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                placeholder="Contenu et recommandations de cette section..."
                rows={5}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-neutral-100">
        <Button
          variant="secondary"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!title.trim()}
        >
          Creer le plan
        </Button>
      </div>
    </div>
  );
}
