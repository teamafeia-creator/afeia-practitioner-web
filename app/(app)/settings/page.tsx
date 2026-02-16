/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, X } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Toast } from '../../../components/ui/Toast';
import {
  getPractitionerProfile,
  updatePractitionerProfile,
  uploadPractitionerPhoto,
} from '../../../lib/queries';
import type { PractitionerProfileUpdate } from '../../../lib/queries';

const SPECIALTY_OPTIONS = [
  'Naturopathie',
  'Phytothérapie',
  'Aromathérapie',
  'Nutrition',
  'Iridologie',
  'Réflexologie',
  'Hydrologie',
  'Micronutrition',
  'Sophrologie',
  'Massages bien-être',
  'Fleurs de Bach',
  'Gemmothérapie',
];

type ProfileFormState = {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  photo_url: string;
  specialties: string[];
  siret: string;
  adeli_number: string;
  formations: string;
  years_experience: string;
  cabinet_address: string;
  professional_phone: string;
  website: string;
  bio: string;
};

function buildFormState(data: Record<string, unknown> | null): ProfileFormState {
  return {
    first_name: (data?.first_name as string) ?? '',
    last_name: (data?.last_name as string) ?? '',
    full_name: (data?.full_name as string) ?? '',
    email: (data?.email as string) ?? '',
    photo_url: (data?.photo_url as string) ?? '',
    specialties: (data?.specialties as string[]) ?? [],
    siret: (data?.siret as string) ?? '',
    adeli_number: (data?.adeli_number as string) ?? '',
    formations: (data?.formations as string) ?? '',
    years_experience: data?.years_experience != null ? String(data.years_experience) : '',
    cabinet_address: (data?.cabinet_address as string) ?? '',
    professional_phone: (data?.professional_phone as string) ?? '',
    website: (data?.website as string) ?? '',
    bio: (data?.bio as string) ?? '',
  };
}

function formStatesEqual(a: ProfileFormState, b: ProfileFormState): boolean {
  for (const key of Object.keys(a) as (keyof ProfileFormState)[]) {
    if (key === 'specialties') {
      const aSpec = a.specialties;
      const bSpec = b.specialties;
      if (aSpec.length !== bSpec.length) return false;
      for (let i = 0; i < aSpec.length; i++) {
        if (aSpec[i] !== bSpec[i]) return false;
      }
      continue;
    }
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// -- Inline read-only field --
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone uppercase tracking-wide">{label}</p>
      <div className="mt-2 text-sm text-charcoal">{value || 'Non renseigné'}</div>
    </div>
  );
}

// -- Section divider --
function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-divider pb-2 pt-2">
      <h3 className="text-[13px] font-semibold text-charcoal">{title}</h3>
      {description ? <p className="text-xs text-stone mt-0.5">{description}</p> : null}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedState, setSavedState] = useState<ProfileFormState | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(buildFormState(null));
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const data = await getPractitionerProfile();
        if (!active) return;
        const state = buildFormState(data as Record<string, unknown> | null);
        setSavedState(state);
        setFormState(state);
      } catch (error) {
        if (!active) return;
        console.error('[settings] failed to load practitioner profile', error);
        setToast({
          title: 'Impossible de charger votre profil',
          description: error instanceof Error ? error.message : 'Erreur inconnue.',
          variant: 'error',
        });
      } finally {
        if (active) setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, []);

  const hasChanges = savedState !== null && !formStatesEqual(formState, savedState);

  const updateField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleSpecialty = useCallback((spec: string) => {
    setFormState((prev) => {
      const current = prev.specialties;
      const next = current.includes(spec)
        ? current.filter((s) => s !== spec)
        : [...current, spec];
      return { ...prev, specialties: next };
    });
  }, []);

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ title: 'Format invalide', description: 'Veuillez choisir une image.', variant: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ title: 'Fichier trop volumineux', description: 'La taille maximum est de 5 Mo.', variant: 'error' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const publicUrl = await uploadPractitionerPhoto(file);
      updateField('photo_url', publicUrl);
      setToast({ title: 'Photo uploadée', variant: 'success' });
    } catch (error) {
      console.error('Failed to upload photo', error);
      setToast({
        title: 'Erreur upload',
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
        variant: 'error',
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveProfile() {
    setToast(null);
    const trimmedName = formState.full_name.trim();
    if (!trimmedName) {
      setToast({ title: 'Nom requis', description: 'Veuillez renseigner votre nom complet.', variant: 'error' });
      return;
    }

    // Validate SIRET client-side
    const siretValue = formState.siret.trim();
    if (siretValue && !/^\d{14}$/.test(siretValue)) {
      setToast({ title: 'SIRET invalide', description: 'Le numéro SIRET doit contenir exactement 14 chiffres.', variant: 'error' });
      return;
    }

    // Validate years_experience
    const yearsExp = formState.years_experience.trim();
    if (yearsExp && (isNaN(Number(yearsExp)) || Number(yearsExp) < 0)) {
      setToast({ title: 'Années d\'expérience invalides', description: 'Veuillez saisir un nombre positif.', variant: 'error' });
      return;
    }

    setSavingProfile(true);
    try {
      const updates: PractitionerProfileUpdate = {
        full_name: trimmedName,
        email: formState.email.trim() || null,
        first_name: formState.first_name.trim() || null,
        last_name: formState.last_name.trim() || null,
        photo_url: formState.photo_url || null,
        specialties: formState.specialties,
        siret: siretValue || null,
        adeli_number: formState.adeli_number.trim() || null,
        formations: formState.formations.trim() || null,
        years_experience: yearsExp ? Number(yearsExp) : null,
        cabinet_address: formState.cabinet_address.trim() || null,
        professional_phone: formState.professional_phone.trim() || null,
        website: formState.website.trim() || null,
        bio: formState.bio.trim() || null,
      };

      await updatePractitionerProfile(updates);

      const newSavedState: ProfileFormState = {
        ...formState,
        full_name: trimmedName,
        email: formState.email.trim(),
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim(),
        siret: siretValue,
        adeli_number: formState.adeli_number.trim(),
        formations: formState.formations.trim(),
        years_experience: yearsExp,
        cabinet_address: formState.cabinet_address.trim(),
        professional_phone: formState.professional_phone.trim(),
        website: formState.website.trim(),
        bio: formState.bio.trim(),
      };
      setSavedState(newSavedState);
      setFormState(newSavedState);
      setIsEditing(false);
      setToast({ title: 'Profil mis à jour', description: 'Vos informations ont été enregistrées.', variant: 'success' });
    } catch (error) {
      console.error('Failed to save practitioner profile', error);
      setToast({
        title: 'Impossible d\'enregistrer',
        description: error instanceof Error ? error.message : 'Erreur inconnue.',
        variant: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  function handleCancel() {
    if (!savedState) return;
    setFormState(savedState);
    setIsEditing(false);
  }

  const displayName = loadingProfile ? 'Chargement...' : savedState?.full_name || 'Non renseigné';

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative rounded-2xl overflow-hidden mb-2 h-[120px]">
        <Image src="/images/fern-moody.jpg" alt="" fill className="object-cover opacity-15" />
        <div className="relative z-10 p-6 flex flex-col justify-center h-full">
          <h1 className="font-serif text-2xl font-semibold text-[#2D3436]">Paramètres</h1>
          <p className="text-sm text-[#6B7280] mt-1">Gérez votre profil professionnel et votre abonnement.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ===================== MAIN PROFILE CARD ===================== */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Profil professionnel</h2>
                <p className="text-xs text-stone">Vos informations visibles par vos consultants.</p>
              </div>
              {savedState && !isEditing ? (
                <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={loadingProfile}>
                  Modifier
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ---- SECTION: Identité ---- */}
            <SectionTitle title="Informations d'identité" />

            {/* Photo de profil */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-cream flex items-center justify-center ring-2 ring-white shadow-sm">
                  {formState.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formState.photo_url} alt="Photo de profil" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-stone">
                      {(formState.first_name || formState.full_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 rounded-full bg-sage p-1.5 text-white shadow-sm hover:bg-sage-dark transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="text-sm">
                <div className="font-medium text-charcoal">{displayName}</div>
                {isEditing ? (
                  <p className="text-xs text-stone mt-0.5">
                    {uploadingPhoto ? 'Upload en cours...' : 'Cliquez sur l\'icône pour changer la photo'}
                  </p>
                ) : null}
                {isEditing && formState.photo_url ? (
                  <button
                    type="button"
                    onClick={() => updateField('photo_url', '')}
                    className="text-xs text-rose hover:underline mt-1 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Supprimer la photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <Input
                    label="Prénom"
                    value={formState.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    placeholder="Votre prénom"
                  />
                  <Input
                    label="Nom"
                    value={formState.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    placeholder="Votre nom de famille"
                  />
                  <Input
                    label="Nom complet (affiché)"
                    value={formState.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="Ex : Dr. Marie Dupont"
                    hint="Ce nom sera affiché sur la page de prise de RDV."
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formState.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="vous@exemple.fr"
                  />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Prénom" value={savedState?.first_name || ''} />
                  <ReadOnlyField label="Nom" value={savedState?.last_name || ''} />
                  <ReadOnlyField label="Nom complet" value={savedState?.full_name || ''} />
                  <ReadOnlyField label="Email" value={savedState?.email || ''} />
                </>
              )}
            </div>

            {/* ---- SECTION: Informations professionnelles ---- */}
            <SectionTitle title="Informations professionnelles" />

            {/* Specialties */}
            <div>
              <p className="text-xs font-medium text-stone mb-2">Spécialités / Domaines d'expertise</p>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const selected = formState.specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-sage text-white border-sage'
                            : 'bg-white text-stone border-divider hover:border-sage hover:text-sage'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {savedState?.specialties && savedState.specialties.length > 0 ? (
                    savedState.specialties.map((spec) => (
                      <span key={spec} className="px-3 py-1.5 rounded-full text-xs font-medium bg-sage/10 text-sage border border-sage/20">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone">Non renseigné</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <Input
                    label="Numéro SIRET"
                    value={formState.siret}
                    onChange={(e) => updateField('siret', e.target.value)}
                    placeholder="12345678901234"
                    hint="14 chiffres"
                    maxLength={14}
                  />
                  <Input
                    label="Numéro ADELI / Certification"
                    value={formState.adeli_number}
                    onChange={(e) => updateField('adeli_number', e.target.value)}
                    placeholder="Ex : 759312345"
                  />
                  <Input
                    label="Années d'expérience"
                    type="number"
                    min={0}
                    value={formState.years_experience}
                    onChange={(e) => updateField('years_experience', e.target.value)}
                    placeholder="Ex : 5"
                  />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Numéro SIRET" value={savedState?.siret || ''} />
                  <ReadOnlyField label="Numéro ADELI / Certification" value={savedState?.adeli_number || ''} />
                  <ReadOnlyField label="Années d'expérience" value={savedState?.years_experience ? `${savedState.years_experience} ans` : ''} />
                </>
              )}
            </div>

            <div>
              {isEditing ? (
                <Textarea
                  label="Formations / Diplômes"
                  value={formState.formations}
                  onChange={(e) => updateField('formations', e.target.value)}
                  placeholder="Ex : CENATHO (2018), DU Phytothérapie - Université Paris XIII (2020)..."
                  className="min-h-[100px]"
                />
              ) : (
                <ReadOnlyField label="Formations / Diplômes" value={savedState?.formations || ''} />
              )}
            </div>

            {/* ---- SECTION: Coordonnées professionnelles ---- */}
            <SectionTitle title="Coordonnées professionnelles" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isEditing ? (
                <>
                  <Input
                    label="Téléphone professionnel"
                    type="tel"
                    value={formState.professional_phone}
                    onChange={(e) => updateField('professional_phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                  <Input
                    label="Site web"
                    type="url"
                    value={formState.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://www.monsite.fr"
                  />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Téléphone professionnel" value={savedState?.professional_phone || ''} />
                  <ReadOnlyField label="Site web" value={savedState?.website || ''} />
                </>
              )}
            </div>

            <div>
              {isEditing ? (
                <Input
                  label="Adresse du cabinet"
                  value={formState.cabinet_address}
                  onChange={(e) => updateField('cabinet_address', e.target.value)}
                  placeholder="123 rue de la Santé, 75013 Paris"
                />
              ) : (
                <ReadOnlyField label="Adresse du cabinet" value={savedState?.cabinet_address || ''} />
              )}
            </div>

            {/* ---- SECTION: Présentation ---- */}
            <SectionTitle title="Présentation" description="Visible sur votre page de prise de rendez-vous publique." />

            <div>
              {isEditing ? (
                <Textarea
                  label="Biographie / Description"
                  value={formState.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Décrivez votre parcours, votre approche et ce qui vous distingue..."
                  className="min-h-[160px]"
                />
              ) : (
                <div>
                  <p className="text-xs font-medium text-stone uppercase tracking-wide">Biographie</p>
                  <div className="mt-2 text-sm text-charcoal whitespace-pre-line">
                    {savedState?.bio || 'Non renseigné'}
                  </div>
                </div>
              )}
            </div>

            {/* ---- Action buttons ---- */}
            <div className="flex flex-wrap gap-2 pt-2">
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
                  <Button variant="secondary" onClick={handleCancel} disabled={savingProfile}>
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

        {/* ===================== SIDEBAR CARDS ===================== */}
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
