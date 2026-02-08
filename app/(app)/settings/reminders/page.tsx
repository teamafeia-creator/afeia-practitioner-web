/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Toast } from '../../../../components/ui/Toast';
import { supabase } from '../../../../lib/supabase';

interface ReminderSettings {
  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  reminder_post_enabled: boolean;
  reminder_24h_template: string | null;
  reminder_2h_template: string | null;
  reminder_post_template: string | null;
  reminder_post_delay_hours: number;
}

const DEFAULT_24H_TEMPLATE = `Bonjour {prenom},

Nous vous rappelons votre rendez-vous :
- {date} a {heure}
- {type} ({duree} min)
- {praticien}
- {adresse}

A demain !`;

const DEFAULT_2H_TEMPLATE = `Bonjour {prenom},

Votre rendez-vous est dans 2 heures :
- Aujourd'hui a {heure}
- {praticien}
- {adresse}

A tres vite !`;

const DEFAULT_POST_TEMPLATE = `Bonjour {prenom},

Suite a votre seance du {date} avec {praticien}, n'hesitez pas a consulter votre conseillancier et vos recommandations dans l'application AFEIA.

Pensez egalement a tenir votre journal quotidien pour suivre vos progres.

Prenez soin de vous !`;

export default function RemindersSettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings>({
    reminder_24h_enabled: true,
    reminder_2h_enabled: false,
    reminder_post_enabled: true,
    reminder_24h_template: null,
    reminder_2h_template: null,
    reminder_post_template: null,
    reminder_post_delay_hours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ReminderSettings | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('practitioners')
        .select('reminder_24h_enabled, reminder_2h_enabled, reminder_post_enabled, reminder_24h_template, reminder_2h_template, reminder_post_template, reminder_post_delay_hours')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[Reminders] Load error:', error);
        return;
      }

      if (data) {
        const loaded: ReminderSettings = {
          reminder_24h_enabled: data.reminder_24h_enabled ?? true,
          reminder_2h_enabled: data.reminder_2h_enabled ?? false,
          reminder_post_enabled: data.reminder_post_enabled ?? true,
          reminder_24h_template: data.reminder_24h_template,
          reminder_2h_template: data.reminder_2h_template,
          reminder_post_template: data.reminder_post_template,
          reminder_post_delay_hours: data.reminder_post_delay_hours ?? 24,
        };
        setSettings(loaded);
        setOriginalSettings(loaded);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!originalSettings) return;
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifie');

      const { error } = await supabase
        .from('practitioners')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalSettings({ ...settings });
      setHasChanges(false);
      setToast({
        title: 'Parametres enregistres',
        description: 'Vos preferences de rappels ont ete mises a jour.',
        variant: 'success',
      });
    } catch (err) {
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible d\'enregistrer.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function ToggleSwitch({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
  }) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-charcoal">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 ${
            checked ? 'bg-teal' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rappels automatiques"
        subtitle="Configurez les rappels email envoyes a vos consultants avant et apres leurs seances."
      />

      {/* Variables info */}
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-warmgray">
            <span className="font-medium">Variables disponibles :</span>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{prenom}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{nom}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{date}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{heure}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{type}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{duree}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{praticien}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{adresse}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{lien_visio}'}</code>
          </p>
        </CardContent>
      </Card>

      {/* Rappel 24h */}
      <Card>
        <CardHeader>
          <ToggleSwitch
            checked={settings.reminder_24h_enabled}
            onChange={(v) => setSettings({ ...settings, reminder_24h_enabled: v })}
            label="Rappel 24h avant la seance"
          />
        </CardHeader>
        {settings.reminder_24h_enabled && (
          <CardContent>
            <label className="block text-xs font-medium text-warmgray mb-1">
              Message personnalise (optionnel)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-charcoal focus:border-teal focus:ring-1 focus:ring-teal"
              rows={6}
              placeholder={DEFAULT_24H_TEMPLATE}
              value={settings.reminder_24h_template || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reminder_24h_template: e.target.value || null,
                })
              }
            />
          </CardContent>
        )}
      </Card>

      {/* Rappel 2h */}
      <Card>
        <CardHeader>
          <ToggleSwitch
            checked={settings.reminder_2h_enabled}
            onChange={(v) => setSettings({ ...settings, reminder_2h_enabled: v })}
            label="Rappel 2h avant la seance"
          />
        </CardHeader>
        {settings.reminder_2h_enabled && (
          <CardContent>
            <label className="block text-xs font-medium text-warmgray mb-1">
              Message personnalise (optionnel)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-charcoal focus:border-teal focus:ring-1 focus:ring-teal"
              rows={5}
              placeholder={DEFAULT_2H_TEMPLATE}
              value={settings.reminder_2h_template || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reminder_2h_template: e.target.value || null,
                })
              }
            />
          </CardContent>
        )}
      </Card>

      {/* Rappel post-seance */}
      <Card>
        <CardHeader>
          <ToggleSwitch
            checked={settings.reminder_post_enabled}
            onChange={(v) => setSettings({ ...settings, reminder_post_enabled: v })}
            label="Rappel post-seance"
          />
        </CardHeader>
        {settings.reminder_post_enabled && (
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-warmgray mb-1">
                Delai d'envoi apres la seance (heures)
              </label>
              <select
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-teal focus:ring-1 focus:ring-teal"
                value={settings.reminder_post_delay_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reminder_post_delay_hours: parseInt(e.target.value),
                  })
                }
              >
                <option value={2}>2 heures</option>
                <option value={6}>6 heures</option>
                <option value={12}>12 heures</option>
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-warmgray mb-1">
                Message personnalise (optionnel)
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-charcoal focus:border-teal focus:ring-1 focus:ring-teal"
                rows={6}
                placeholder={DEFAULT_POST_TEMPLATE}
                value={settings.reminder_post_template || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reminder_post_template: e.target.value || null,
                  })
                }
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            Enregistrer les parametres
          </Button>
        </div>
      )}

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
