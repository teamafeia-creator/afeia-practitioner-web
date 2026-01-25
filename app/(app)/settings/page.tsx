/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toast } from '../../../components/ui/Toast';
import { normalizeCalendlyUrl } from '../../../lib/calendly';
import { getPractitionerProfile, updatePractitionerProfile } from '../../../lib/queries';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    calendly_url: string | null;
    default_consultation_reason: string | null;
  } | null>(null);
  const [formState, setFormState] = useState({
    full_name: '',
    email: '',
    calendly_url: '',
    default_consultation_reason: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);
  const profileName = loadingProfile ? 'Chargement...' : profile?.full_name || 'Non renseigné';
  const profileEmail = loadingProfile ? 'Chargement...' : profile?.email || 'Non renseigné';
  const profileCalendly = loadingProfile ? 'Chargement...' : profile?.calendly_url || 'Non renseigné';

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        console.log('[settings] loading practitioner profile');
        const data = await getPractitionerProfile();
        if (!active) return;
        const safeProfile = {
          full_name: data?.full_name ?? '',
          email: data?.email ?? '',
          calendly_url: data?.calendly_url ?? null,
          default_consultation_reason: data?.default_consultation_reason ?? null
        };
        setProfile(safeProfile);
        setFormState({
          full_name: safeProfile.full_name,
          email: safeProfile.email,
          calendly_url: safeProfile.calendly_url ?? '',
          default_consultation_reason: safeProfile.default_consultation_reason ?? ''
        });
      } catch (error) {
        if (!active) return;
        console.error('[settings] failed to load practitioner profile', error);
        setToast({
          title: 'Impossible de charger votre profil',
          description: error instanceof Error ? error.message : 'Erreur inconnue.',
          variant: 'error'
        });
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const hasChanges =
    profile &&
    (formState.full_name.trim() !== profile.full_name ||
      formState.email.trim() !== profile.email ||
      formState.calendly_url.trim() !== (profile.calendly_url ?? '') ||
      formState.default_consultation_reason.trim() !==
        (profile.default_consultation_reason ?? ''));

  async function handleSaveProfile() {
    setToast(null);
    const trimmedName = formState.full_name.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedCalendly = formState.calendly_url.trim();
    const trimmedDefaultReason = formState.default_consultation_reason.trim();

    if (!trimmedName) {
      setToast({
        title: 'Nom requis',
        description: 'Veuillez renseigner votre nom complet.',
        variant: 'error'
      });
      return;
    }

    const normalized = trimmedCalendly ? normalizeCalendlyUrl(trimmedCalendly) : null;
    if (trimmedCalendly && !normalized) {
      setToast({
        title: 'Lien Calendly invalide',
        description: 'Utilisez une URL complète ou un slug Calendly valide.',
        variant: 'error'
      });
      return;
    }

    setSavingProfile(true);
    try {
      console.log('[settings] saving practitioner profile', { trimmedName, trimmedEmail });
      await updatePractitionerProfile({
        full_name: trimmedName,
        email: trimmedEmail || null,
        calendly_url: normalized,
        default_consultation_reason: trimmedDefaultReason || null
      });
      const updatedProfile = {
        full_name: trimmedName,
        email: trimmedEmail,
        calendly_url: normalized,
        default_consultation_reason: trimmedDefaultReason || null
      };
      setProfile(updatedProfile);
      setFormState({
        full_name: updatedProfile.full_name,
        email: updatedProfile.email,
        calendly_url: updatedProfile.calendly_url ?? '',
        default_consultation_reason: updatedProfile.default_consultation_reason ?? ''
      });
      setIsEditing(false);
      setToast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Failed to save practitioner profile', error);
      setToast({
        title: 'Impossible d’enregistrer',
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
        variant: 'error'
      });
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez votre profil professionnel et votre abonnement." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Profil professionnel</h2>
                <p className="text-xs text-warmgray">Vos informations visibles par vos patients.</p>
              </div>
              {profile ? (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing || loadingProfile}
                >
                  Modifier
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {isEditing ? (
                  <Input
                    label="Nom"
                    value={formState.full_name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, full_name: event.target.value }))
                    }
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <div>
                    <p className="text-xs font-medium text-warmgray">Nom</p>
                    <div className="mt-2 text-sm text-marine">{profileName}</div>
                  </div>
                )}
              </div>
              <div>
                {isEditing ? (
                  <Input
                    label="Email"
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="vous@exemple.fr"
                  />
                ) : (
                  <div>
                    <p className="text-xs font-medium text-warmgray">Email</p>
                    <div className="mt-2 text-sm text-marine">{profileEmail}</div>
                  </div>
                )}
              </div>
            </div>
            <div>
              {isEditing ? (
                <Input
                  label="Lien Calendly"
                  placeholder="https://calendly.com/mon-profil ou mon-profil"
                  value={formState.calendly_url}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, calendly_url: event.target.value }))
                  }
                  disabled={loadingProfile}
                  hint="Ajoutez une URL complète ou un slug Calendly. Exemple : https://calendly.com/mon-profil."
                />
              ) : (
                <div>
                  <p className="text-xs font-medium text-warmgray">Lien Calendly</p>
                  <div className="mt-2 text-sm text-marine">{profileCalendly}</div>
                  <p className="mt-1 text-xs text-warmgray">
                    Ajoutez une URL complète ou un slug Calendly. Exemple : https://calendly.com/mon-profil.
                  </p>
                </div>
              )}
            </div>
            <div>
              {isEditing ? (
                <Input
                  label="Motif de consultation par défaut"
                  placeholder="Ex. Troubles digestifs"
                  value={formState.default_consultation_reason}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      default_consultation_reason: event.target.value
                    }))
                  }
                  disabled={loadingProfile}
                  hint="Cette valeur sera proposée lors de la création d’un nouveau patient."
                />
              ) : (
                <div>
                  <p className="text-xs font-medium text-warmgray">Motif de consultation par défaut</p>
                  <div className="mt-2 text-sm text-marine">
                    {profile?.default_consultation_reason || 'Non renseigné'}
                  </div>
                  <p className="mt-1 text-xs text-warmgray">
                    Utilisé comme pré-remplissage lors de la création d’un patient.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    loading={savingProfile}
                    disabled={!hasChanges || savingProfile}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!profile) return;
                      setFormState({
                        full_name: profile.full_name,
                        email: profile.email,
                        calendly_url: profile.calendly_url ?? '',
                        default_consultation_reason: profile.default_consultation_reason ?? ''
                      });
                      setIsEditing(false);
                    }}
                    disabled={savingProfile}
                  >
                    Annuler
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" onClick={() => alert('📄 Documents pro (à brancher)')}>
                Gérer mes documents
              </Button>
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
            <div className="rounded-2xl bg-white/80 p-3 text-sm text-marine ring-1 ring-black/5">
              Circular (sommeil, HRV, activité) activé pour les patients Premium.
            </div>
            <Button variant="secondary" onClick={() => router.push('/billing')}>
              Gérer la facturation
            </Button>
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
