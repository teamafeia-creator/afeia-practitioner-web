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
import { getPractitionerProfile, updatePractitionerProfile } from '../../../lib/queries';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
  } | null>(null);
  const [formState, setFormState] = useState({
    full_name: '',
    email: '',
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
        };
        setProfile(safeProfile);
        setFormState({
          full_name: safeProfile.full_name,
          email: safeProfile.email,
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
      formState.email.trim() !== profile.email);

  async function handleSaveProfile() {
    setToast(null);
    const trimmedName = formState.full_name.trim();
    const trimmedEmail = formState.email.trim();

    if (!trimmedName) {
      setToast({
        title: 'Nom requis',
        description: 'Veuillez renseigner votre nom complet.',
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
      });
      const updatedProfile = {
        full_name: trimmedName,
        email: trimmedEmail,
      };
      setProfile(updatedProfile);
      setFormState({
        full_name: updatedProfile.full_name,
        email: updatedProfile.email,
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
        title: 'Impossible d\'enregistrer',
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
                <p className="text-xs text-stone">Vos informations visibles par vos consultants.</p>
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
                    <p className="text-xs font-medium text-stone uppercase tracking-wide">Nom</p>
                    <div className="mt-2 text-sm text-charcoal">{profileName}</div>
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
                    <p className="text-xs font-medium text-stone uppercase tracking-wide">Email</p>
                    <div className="mt-2 text-sm text-charcoal">{profileEmail}</div>
                  </div>
                )}
              </div>
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
                      });
                      setIsEditing(false);
                    }}
                    disabled={savingProfile}
                  >
                    Annuler
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" onClick={() => router.push('/settings/documents')}>
                Gérer mes documents
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Agenda</h2>
              <p className="text-xs text-stone">Configurez vos types de seances et disponibilites.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/consultation-types')}>
                Types de seance
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/availability')}>
                Disponibilites
              </Button>
              <Button variant="primary" className="w-full" onClick={() => router.push('/settings/booking')}>
                Prise de RDV en ligne
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Assistance IA</h2>
              <p className="text-xs text-stone">Personnalisez le style de l'IA pour vos conseillanciers.</p>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/ai')}>
                Configurer le profil IA
              </Button>
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
              <div className="rounded-lg bg-white/60 p-3 text-sm text-charcoal border border-divider">
                Bague connectée (sommeil, HRV, activité) activée pour les consultants Premium.
              </div>
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/abonnement')}>
                Voir mon abonnement
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-xs text-stone">Preferences de communication.</p>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/facturation/relances')}>
                Configurer les relances
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Donnees et RGPD</h2>
              <p className="text-xs text-stone">Vie privee et protection des donnees.</p>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" onClick={() => router.push('/settings/rgpd')}>
                Gerer mes donnees
              </Button>
            </CardContent>
          </Card>
        </div>
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
