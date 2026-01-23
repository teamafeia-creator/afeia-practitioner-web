/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Toast } from '../../../components/ui/Toast';
import { normalizeCalendlyUrl } from '../../../lib/calendly';
import { getPractitionerCalendlyUrl, updatePractitionerCalendlyUrl } from '../../../lib/queries';

export default function SettingsPage() {
  const [calendlyInput, setCalendlyInput] = useState('');
  const [initialCalendlyUrl, setInitialCalendlyUrl] = useState<string | null>(null);
  const [loadingCalendly, setLoadingCalendly] = useState(true);
  const [savingCalendly, setSavingCalendly] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCalendly() {
      setLoadingCalendly(true);
      try {
        console.log('[settings] loading calendly url');
        const url = await getPractitionerCalendlyUrl();
        if (!active) return;
        setInitialCalendlyUrl(url);
        setCalendlyInput(url ?? '');
      } catch (error) {
        if (!active) return;
        console.error('[settings] failed to load calendly url', error);
        setToast({
          title: 'Impossible de charger votre lien Calendly',
          description: error instanceof Error ? error.message : 'Erreur inconnue.',
          variant: 'error'
        });
      } finally {
        if (active) {
          setLoadingCalendly(false);
        }
      }
    }
    loadCalendly();
    return () => {
      active = false;
    };
  }, []);

  async function handleSaveCalendly() {
    setToast(null);
    const trimmed = calendlyInput.trim();

    if (!trimmed) {
      if (!initialCalendlyUrl) {
        setToast({
          title: 'Lien Calendly requis',
          description: 'Ajoutez une URL Calendly ou un slug avant de sauvegarder.',
          variant: 'error'
        });
        return;
      }
      const confirmed = window.confirm('Voulez-vous supprimer votre lien Calendly ?');
      if (!confirmed) return;
    }

    const normalized = trimmed ? normalizeCalendlyUrl(trimmed) : null;
    if (trimmed && !normalized) {
      setToast({
        title: 'Lien Calendly invalide',
        description: 'Utilisez une URL complète ou un slug Calendly valide.',
        variant: 'error'
      });
      return;
    }

    setSavingCalendly(true);
    try {
      console.log('[settings] saving calendly url', { normalized });
      await updatePractitionerCalendlyUrl(normalized);
      console.log('[settings] saved calendly url', { normalized });
      setInitialCalendlyUrl(normalized);
      setCalendlyInput(normalized ?? '');
      setToast({
        title: 'Lien Calendly enregistré',
        description: normalized ? 'Votre lien est prêt à être utilisé.' : 'Lien supprimé.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Failed to save calendly url', error);
      setToast({
        title: 'Impossible d’enregistrer',
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
        variant: 'error'
      });
    } finally {
      setSavingCalendly(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-charcoal">Paramètres</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold">Profil professionnel</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-warmgray">Nom</label>
                <Input defaultValue="Naturopathe AFEIA" />
              </div>
              <div>
                <label className="text-xs font-medium text-warmgray">Email</label>
                <Input defaultValue="pro@afeia.app" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Lien Calendly</label>
              <Input
                placeholder="https://calendly.com/mon-profil ou mon-profil"
                value={calendlyInput}
                onChange={(event) => setCalendlyInput(event.target.value)}
                disabled={loadingCalendly}
              />
              <p className="mt-1 text-xs text-warmgray">
                Ajoutez une URL complète ou un slug Calendly. Exemple : https://calendly.com/mon-profil.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="cta"
                onClick={handleSaveCalendly}
                loading={savingCalendly}
                disabled={loadingCalendly}
              >
                Enregistrer
              </Button>
              <Button variant="secondary" onClick={() => alert('📄 Documents pro (à brancher)')}>Gérer mes documents</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Abonnement</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-charcoal">Plan</div>
              <Badge variant="premium">Premium</Badge>
            </div>
            <div className="rounded-2xl bg-sable p-3 text-sm text-marine ring-1 ring-black/5">
              Circular (sommeil, HRV, activité) activé pour les patients Premium.
            </div>
            <Button variant="secondary" onClick={() => alert('💳 Gestion paiement (à brancher)')}>Gérer la facturation</Button>
          </CardContent>
        </Card>
      </div>
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
