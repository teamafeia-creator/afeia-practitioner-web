/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

interface BookingConfig {
  booking_slug: string | null;
  booking_enabled: boolean;
  booking_intro_text: string | null;
  booking_address: string | null;
  booking_phone: string | null;
  cancellation_policy_hours: number | null;
  cancellation_policy_text: string | null;
}

interface ValidationState {
  hasConsultationTypes: boolean;
  hasAvailability: boolean;
  hasSlug: boolean;
}

export default function BookingSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [practitionerName, setPractitionerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    hasConsultationTypes: false,
    hasAvailability: false,
    hasSlug: false,
  });
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const [form, setForm] = useState({
    booking_slug: '',
    booking_enabled: false,
    booking_intro_text: '',
    booking_address: '',
    booking_phone: '',
    cancellation_policy_hours: 24,
    cancellation_policy_text: '',
  });

  const loadConfig = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('full_name, booking_slug, booking_enabled, booking_intro_text, booking_address, booking_phone, cancellation_policy_hours, cancellation_policy_text')
        .eq('id', userData.user.id)
        .single();

      if (practitioner) {
        setPractitionerName(practitioner.full_name || '');
        const cfg: BookingConfig = {
          booking_slug: practitioner.booking_slug,
          booking_enabled: practitioner.booking_enabled || false,
          booking_intro_text: practitioner.booking_intro_text,
          booking_address: practitioner.booking_address,
          booking_phone: practitioner.booking_phone,
          cancellation_policy_hours: practitioner.cancellation_policy_hours,
          cancellation_policy_text: practitioner.cancellation_policy_text,
        };
        setConfig(cfg);
        setForm({
          booking_slug: cfg.booking_slug || '',
          booking_enabled: cfg.booking_enabled,
          booking_intro_text: cfg.booking_intro_text || '',
          booking_address: cfg.booking_address || '',
          booking_phone: cfg.booking_phone || '',
          cancellation_policy_hours: cfg.cancellation_policy_hours || 24,
          cancellation_policy_text: cfg.cancellation_policy_text || '',
        });
      }

      // Check validation requirements
      const { data: types } = await supabase
        .from('consultation_types')
        .select('id')
        .eq('is_active', true)
        .eq('is_bookable_online', true)
        .limit(1);

      const { data: schedules } = await supabase
        .from('availability_schedules')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      setValidation({
        hasConsultationTypes: (types?.length || 0) > 0,
        hasAvailability: (schedules?.length || 0) > 0,
        hasSlug: !!practitioner?.booking_slug,
      });
    } catch (error) {
      console.error('Error loading booking config:', error);
      setToast({ title: 'Erreur de chargement', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('practitioners')
        .select('id')
        .eq('booking_slug', slug)
        .neq('id', userData.user?.id || '')
        .limit(1);

      setSlugAvailable(!data || data.length === 0);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.booking_slug) {
        checkSlugAvailability(form.booking_slug);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.booking_slug, checkSlugAvailability]);

  const suggestSlug = () => {
    if (!practitionerName) return;
    const slug = practitionerName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setForm(prev => ({ ...prev, booking_slug: slug }));
  };

  const handleSave = async () => {
    setToast(null);

    // Validate slug
    if (form.booking_enabled) {
      if (!form.booking_slug) {
        setToast({ title: 'Un slug est requis pour activer le booking.', variant: 'error' });
        return;
      }
      if (!/^[a-z0-9-]+$/.test(form.booking_slug)) {
        setToast({ title: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.', variant: 'error' });
        return;
      }
      if (!validation.hasConsultationTypes) {
        setToast({
          title: 'Impossible d\'activer le booking',
          description: 'Vous devez avoir au moins un type de consultation actif et reservable en ligne.',
          variant: 'error',
        });
        return;
      }
      if (!validation.hasAvailability) {
        setToast({
          title: 'Impossible d\'activer le booking',
          description: 'Vous devez configurer vos horaires de disponibilite.',
          variant: 'error',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifie');

      const { error } = await supabase
        .from('practitioners')
        .update({
          booking_slug: form.booking_slug || null,
          booking_enabled: form.booking_enabled,
          booking_intro_text: form.booking_intro_text || null,
          booking_address: form.booking_address || null,
          booking_phone: form.booking_phone || null,
          cancellation_policy_hours: form.cancellation_policy_hours,
          cancellation_policy_text: form.cancellation_policy_text || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.user.id);

      if (error) throw error;

      setConfig({
        booking_slug: form.booking_slug || null,
        booking_enabled: form.booking_enabled,
        booking_intro_text: form.booking_intro_text || null,
        booking_address: form.booking_address || null,
        booking_phone: form.booking_phone || null,
        cancellation_policy_hours: form.cancellation_policy_hours,
        cancellation_policy_text: form.cancellation_policy_text || null,
      });
      setValidation(prev => ({ ...prev, hasSlug: !!form.booking_slug }));
      setToast({ title: 'Configuration enregistree', variant: 'success' });
    } catch (error) {
      console.error('Error saving booking config:', error);
      setToast({ title: 'Erreur lors de la sauvegarde', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = form.booking_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://afeia.fr'}/rdv/${form.booking_slug}`
    : null;

  const copyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Prise de RDV en ligne" subtitle="Chargement..." />
        <div className="h-48 glass-card animate-pulse" />
      </div>
    );
  }

  const canEnable = validation.hasConsultationTypes && validation.hasAvailability && !!form.booking_slug;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prise de RDV en ligne"
        subtitle="Permettez a vos consultants de prendre rendez-vous directement depuis une page dediee."
      />

      {/* Activation toggle */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Activation</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.booking_enabled}
              onChange={(e) => setForm(prev => ({ ...prev, booking_enabled: e.target.checked }))}
              disabled={!canEnable && !form.booking_enabled}
              className="h-5 w-5 rounded border-sage/30 text-sage focus:ring-sage/50"
            />
            <div>
              <span className="text-sm font-medium text-charcoal">Activer la prise de RDV en ligne</span>
              <p className="text-xs text-stone">
                Vos consultants pourront prendre RDV depuis votre page publique.
              </p>
            </div>
          </label>

          {!canEnable && !form.booking_enabled && (
            <div className="rounded-lg bg-gold/10 border border-gold/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
                <AlertCircle className="h-4 w-4 text-gold" />
                Conditions requises pour activer :
              </div>
              <ul className="text-xs text-stone space-y-1 ml-6">
                <li className={validation.hasSlug ? 'text-sage' : ''}>
                  {validation.hasSlug ? '\u2713' : '\u2717'} Slug personnalise defini
                </li>
                <li className={validation.hasConsultationTypes ? 'text-sage' : ''}>
                  {validation.hasConsultationTypes ? '\u2713' : '\u2717'} Au moins un type de consultation reservable en ligne{' '}
                  {!validation.hasConsultationTypes && (
                    <button onClick={() => router.push('/settings/consultation-types')} className="text-sage underline">
                      Configurer
                    </button>
                  )}
                </li>
                <li className={validation.hasAvailability ? 'text-sage' : ''}>
                  {validation.hasAvailability ? '\u2713' : '\u2717'} Horaires de disponibilite configures{' '}
                  {!validation.hasAvailability && (
                    <button onClick={() => router.push('/settings/availability')} className="text-sage underline">
                      Configurer
                    </button>
                  )}
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slug */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Adresse de votre page</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Slug personnalise"
                  value={form.booking_slug}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setForm(prev => ({ ...prev, booking_slug: value }));
                  }}
                  placeholder="mon-cabinet"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={suggestSlug}>
                Suggerer
              </Button>
            </div>
            {form.booking_slug && (
              <div className="mt-2 flex items-center gap-2">
                {slugChecking ? (
                  <span className="text-xs text-stone">Verification...</span>
                ) : slugAvailable === true ? (
                  <span className="text-xs text-sage flex items-center gap-1">
                    <Check className="h-3 w-3" /> Disponible
                  </span>
                ) : slugAvailable === false ? (
                  <span className="text-xs text-terracotta">Ce slug est deja utilise</span>
                ) : null}
              </div>
            )}
          </div>

          {bookingUrl && (
            <div className="flex items-center gap-2 rounded-lg bg-cream/80 p-3">
              <span className="text-sm text-charcoal truncate flex-1">{bookingUrl}</span>
              <Button variant="ghost" size="sm" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(bookingUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Informations de la page</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-stone mb-1">
              Texte d'introduction
            </label>
            <Textarea
              value={form.booking_intro_text}
              onChange={(e) => setForm(prev => ({ ...prev, booking_intro_text: e.target.value }))}
              placeholder="Bienvenue ! Choisissez le type de seance qui vous convient."
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Adresse du cabinet"
              value={form.booking_address}
              onChange={(e) => setForm(prev => ({ ...prev, booking_address: e.target.value }))}
              placeholder="12 rue des Lilas, 69003 Lyon"
            />
            <Input
              label="Telephone"
              value={form.booking_phone}
              onChange={(e) => setForm(prev => ({ ...prev, booking_phone: e.target.value }))}
              placeholder="06 12 34 56 78"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cancellation policy */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Politique d'annulation</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Delai minimum d'annulation"
            value={String(form.cancellation_policy_hours || 0)}
            onChange={(e) => setForm(prev => ({ ...prev, cancellation_policy_hours: parseInt(e.target.value) || 0 }))}
          >
            <option value="0">Aucun</option>
            <option value="12">12 heures</option>
            <option value="24">24 heures</option>
            <option value="48">48 heures</option>
          </Select>
          <div>
            <label className="block text-[13px] font-medium text-stone mb-1">
              Texte personnalise
            </label>
            <Textarea
              value={form.cancellation_policy_text}
              onChange={(e) => setForm(prev => ({ ...prev, cancellation_policy_text: e.target.value }))}
              placeholder="Toute annulation doit intervenir au minimum 24h avant le RDV."
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={() => router.push('/settings')}>
          Retour
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
