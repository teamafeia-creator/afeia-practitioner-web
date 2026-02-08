'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Textarea } from '../../../../components/ui/Textarea';
import { Toast } from '../../../../components/ui/Toast';
import { supabase } from '../../../../lib/supabase';
import type { PractitionerAIProfile } from '../../../../lib/types';

const FORMATION_OPTIONS = [
  { value: '', label: 'Sélectionnez votre formation' },
  { value: 'Marchesseau', label: 'Pierre-Valentin Marchesseau' },
  { value: 'Kieffer', label: 'Daniel Kieffer' },
  { value: 'CENATHO', label: 'CENATHO' },
  { value: 'ISUPNAT', label: 'ISUPNAT' },
  { value: 'Autre', label: 'Autre' },
];

const TON_OPTIONS = [
  { value: 'professionnel', label: 'Professionnel et formel' },
  { value: 'chaleureux', label: 'Chaleureux et accessible' },
  { value: 'coach', label: 'Coach motivant et dynamique' },
];

const LONGUEUR_OPTIONS = [
  { value: 'concis', label: 'Concis — aller à l\'essentiel' },
  { value: 'detaille', label: 'Détaillé — avec explications' },
  { value: 'tres_detaille', label: 'Très détaillé — avec contexte et alternatives' },
];

const APPROCHES_OPTIONS = [
  'Phytothérapie',
  'Aromathérapie',
  'Nutrition',
  'Gestion du stress',
  'Exercice physique',
  'Hydrologie',
  'Techniques manuelles',
  'Techniques de respiration',
];

type FormState = {
  formation: string;
  formation_detail: string;
  ton: string;
  longueur_preferee: string;
  approches: string[];
  plantes_favorites: string;
  complements_favoris: string;
  exemples_formulations: string;
};

const DEFAULT_FORM: FormState = {
  formation: '',
  formation_detail: '',
  ton: 'chaleureux',
  longueur_preferee: 'detaille',
  approches: [],
  plantes_favorites: '',
  complements_favoris: '',
  exemples_formulations: '',
};

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from('practitioner_ai_profiles')
        .select('*')
        .eq('practitioner_id', userData.user.id)
        .maybeSingle();

      if (data) {
        const profile = data as PractitionerAIProfile;
        setForm({
          formation: profile.formation || '',
          formation_detail: profile.formation_detail || '',
          ton: profile.ton || 'chaleureux',
          longueur_preferee: profile.longueur_preferee || 'detaille',
          approches: profile.approches || [],
          plantes_favorites: profile.plantes_favorites || '',
          complements_favoris: profile.complements_favoris || '',
          exemples_formulations: profile.exemples_formulations || '',
        });
        setStats({
          total: profile.total_generations || 0,
          thisMonth: profile.generations_this_month || 0,
        });
      }
    } catch (err) {
      console.error('Error loading AI profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Session expirée.');

      const payload = {
        practitioner_id: userData.user.id,
        formation: form.formation || null,
        formation_detail: form.formation_detail || null,
        ton: form.ton,
        longueur_preferee: form.longueur_preferee,
        approches: form.approches,
        plantes_favorites: form.plantes_favorites || null,
        complements_favoris: form.complements_favoris || null,
        exemples_formulations: form.exemples_formulations || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('practitioner_ai_profiles')
        .upsert(payload, { onConflict: 'practitioner_id' });

      if (error) throw error;

      setToast({
        title: 'Profil IA sauvegardé',
        description: 'Vos préférences seront appliquées aux prochaines générations.',
        variant: 'success',
      });
    } catch (err) {
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de sauvegarder.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleApproche(approche: string) {
    setForm((prev) => ({
      ...prev,
      approches: prev.approches.includes(approche)
        ? prev.approches.filter((a) => a !== approche)
        : [...prev.approches, approche],
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title="Profil IA" subtitle="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Profil IA"
        subtitle="Personnalisez le style et les préférences de l'assistant IA pour vos conseillanciers."
      />

      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Formation */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Formation et approche</h2>
              <p className="text-xs text-warmgray">
                Permet à l&apos;IA d&apos;adapter ses recommandations à votre courant naturopathique.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Formation principale"
                value={form.formation}
                onChange={(e) => setForm({ ...form, formation: e.target.value })}
              >
                {FORMATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              {form.formation === 'Autre' && (
                <Input
                  label="Précisez votre formation"
                  value={form.formation_detail}
                  onChange={(e) => setForm({ ...form, formation_detail: e.target.value })}
                  placeholder="Nom de l'école ou du formateur..."
                />
              )}
            </CardContent>
          </Card>

          {/* Style */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Style de rédaction</h2>
              <p className="text-xs text-warmgray">
                Définissez le ton et la longueur des textes générés.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-charcoal mb-2">Ton préféré</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, ton: option.value })}
                      className={`text-left rounded-lg border p-3 text-sm transition ${
                        form.ton === option.value
                          ? 'border-teal bg-teal/5 text-teal font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-charcoal mb-2">Longueur des textes</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {LONGUEUR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, longueur_preferee: option.value })}
                      className={`text-left rounded-lg border p-3 text-sm transition ${
                        form.longueur_preferee === option.value
                          ? 'border-teal bg-teal/5 text-teal font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approches */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Approches privilégiées</h2>
              <p className="text-xs text-warmgray">
                L&apos;IA mettra l&apos;accent sur ces approches dans ses recommandations.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {APPROCHES_OPTIONS.map((approche) => (
                  <button
                    key={approche}
                    type="button"
                    onClick={() => toggleApproche(approche)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      form.approches.includes(approche)
                        ? 'bg-teal text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {approche}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Favoris */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Plantes et compléments favoris</h2>
              <p className="text-xs text-warmgray">
                Les produits que vous recommandez régulièrement. L&apos;IA les privilégiera.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block">
                <span className="text-[13px] font-medium text-warmgray">Plantes favorites</span>
                <Textarea
                  className="mt-1"
                  value={form.plantes_favorites}
                  onChange={(e) => setForm({ ...form, plantes_favorites: e.target.value })}
                  placeholder="Ex : Mélisse, Passiflore, Rhodiola, Desmodium, Chardon-Marie..."
                  rows={3}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-warmgray">Compléments favoris</span>
                <Textarea
                  className="mt-1"
                  value={form.complements_favoris}
                  onChange={(e) => setForm({ ...form, complements_favoris: e.target.value })}
                  placeholder="Ex : Magnésium bisglycinate, Vitamine D3, Zinc, Probiotiques..."
                  rows={3}
                />
              </label>
            </CardContent>
          </Card>

          {/* Exemples */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Exemples de formulations</h2>
              <p className="text-xs text-warmgray">
                Collez 2-3 paragraphes types que vous utilisez dans vos conseillanciers.
                L&apos;IA s&apos;en inspirera pour reproduire votre style.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.exemples_formulations}
                onChange={(e) => setForm({ ...form, exemples_formulations: e.target.value })}
                placeholder="Collez ici des extraits de vos conseillanciers habituels. Par exemple :&#10;&#10;« Pour soutenir votre terrain digestif, je vous recommande de commencer chaque journée par un grand verre d'eau tiède agrémentée d'un demi-citron bio pressé... »"
                rows={8}
              />
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Statistiques IA</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-warmgray">Générations ce mois</span>
                <span className="font-medium text-charcoal">{stats.thisMonth}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-warmgray">Total générations</span>
                <span className="font-medium text-charcoal">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Comment ça marche</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs text-warmgray">
                <p>
                  L&apos;IA utilise le bilan de vitalité (anamnèse), le journal quotidien et les notes
                  de consultation pour pré-remplir les conseillanciers.
                </p>
                <p>
                  Plus vous renseignez vos préférences ici, plus les suggestions seront proches
                  de votre style habituel.
                </p>
                <p>
                  Chaque suggestion est un brouillon — vous gardez le contrôle total avant le
                  partage au consultant.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
