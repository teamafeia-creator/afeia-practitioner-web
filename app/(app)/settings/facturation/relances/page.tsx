'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import type { PractitionerBillingSettings } from '@/lib/invoicing/types';
import { ArrowLeft, Save, Bell, BellOff } from 'lucide-react';
import Link from 'next/link';

export default function ReminderSettingsPage() {
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [relancesAuto, setRelancesAuto] = useState(true);
  const [delaiJ7, setDelaiJ7] = useState(true);
  const [delaiJ15, setDelaiJ15] = useState(true);
  const [delaiJ30, setDelaiJ30] = useState(true);
  const [templateJ7, setTemplateJ7] = useState('');
  const [templateJ15, setTemplateJ15] = useState('');
  const [templateJ30, setTemplateJ30] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setAuthToken(token);

      const response = await fetch('/api/invoicing/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const s: PractitionerBillingSettings = data.settings;
        if (s) {
          setRelancesAuto(s.relances_auto);
          setDelaiJ7(s.delai_relance_j7);
          setDelaiJ15(s.delai_relance_j15);
          setDelaiJ30(s.delai_relance_j30);
          setTemplateJ7(s.email_template_relance_j7 || '');
          setTemplateJ15(s.email_template_relance_j15 || '');
          setTemplateJ30(s.email_template_relance_j30 || '');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/invoicing/settings/reminders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          relances_auto: relancesAuto,
          delai_relance_j7: delaiJ7,
          delai_relance_j15: delaiJ15,
          delai_relance_j30: delaiJ30,
          email_template_relance_j7: templateJ7 || null,
          email_template_relance_j15: templateJ15 || null,
          email_template_relance_j30: templateJ30 || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      showToast.success('Parametres de relance enregistres');
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relances automatiques" />
        <div className="glass-card rounded-lg p-8 text-center text-stone">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader
        title="Relances automatiques"
        subtitle="Configurez les rappels envoyes automatiquement pour les factures impayees"
        actions={
          <Link href="/settings/facturation">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Retour parametres
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Activation</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={relancesAuto}
                onChange={(e) => setRelancesAuto(e.target.checked)}
                className="rounded border-sage/30 text-sage focus:ring-sage/30 h-5 w-5"
              />
              <div>
                <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                  {relancesAuto ? (
                    <Bell className="h-4 w-4 text-sage" />
                  ) : (
                    <BellOff className="h-4 w-4 text-stone" />
                  )}
                  Activer les relances automatiques
                </span>
                <p className="text-xs text-stone mt-0.5">
                  Un email de rappel sera envoye automatiquement aux consultants pour les factures impayees.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {relancesAuto && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Delais de relance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delaiJ7}
                    onChange={(e) => setDelaiJ7(e.target.checked)}
                    className="rounded border-sage/30 text-sage focus:ring-sage/30"
                  />
                  <span className="text-sm text-charcoal">
                    Relance a J+7 (7 jours apres emission)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delaiJ15}
                    onChange={(e) => setDelaiJ15(e.target.checked)}
                    className="rounded border-sage/30 text-sage focus:ring-sage/30"
                  />
                  <span className="text-sm text-charcoal">
                    Relance a J+15 (15 jours apres emission)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delaiJ30}
                    onChange={(e) => setDelaiJ30(e.target.checked)}
                    className="rounded border-sage/30 text-sage focus:ring-sage/30"
                  />
                  <span className="text-sm text-charcoal">
                    Relance a J+30 (30 jours apres emission)
                  </span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates d&apos;email personnalises</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-stone">
                  Personnalisez le contenu des emails de relance. Laissez vide pour utiliser le template par defaut.
                  Variables disponibles : {'{nom_consultant}'}, {'{prenom_consultant}'}, {'{numero_facture}'}, {'{montant}'}, {'{date_emission}'}.
                </p>

                {delaiJ7 && (
                  <div>
                    <Textarea
                      placeholder="Template email J+7 (laisser vide pour le defaut)"
                      value={templateJ7}
                      onChange={(e) => setTemplateJ7(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <span className="text-[13px] font-medium text-stone block mt-1">
                      Email de relance J+7
                    </span>
                  </div>
                )}

                {delaiJ15 && (
                  <div>
                    <Textarea
                      placeholder="Template email J+15 (laisser vide pour le defaut)"
                      value={templateJ15}
                      onChange={(e) => setTemplateJ15(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <span className="text-[13px] font-medium text-stone block mt-1">
                      Email de relance J+15
                    </span>
                  </div>
                )}

                {delaiJ30 && (
                  <div>
                    <Textarea
                      placeholder="Template email J+30 (laisser vide pour le defaut)"
                      value={templateJ30}
                      onChange={(e) => setTemplateJ30(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <span className="text-[13px] font-medium text-stone block mt-1">
                      Email de relance J+30
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div>
          <Button
            type="submit"
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
