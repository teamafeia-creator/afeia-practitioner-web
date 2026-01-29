'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ANAMNESIS_SECTIONS, type AnamnesisSection } from '@/lib/anamnesis';
import {
  getPublicPractitioners,
  submitPreliminaryQuestionnaire
} from '@/services/preliminary-questionnaire';
import type { PublicPractitioner } from '@/lib/types';

type ContactInfo = {
  naturopathId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type QuestionnaireResponses = Record<string, Record<string, string>>;

// Total steps = 1 (contact info) + number of anamnesis sections + 1 (confirmation)
const TOTAL_SECTIONS = ANAMNESIS_SECTIONS.length;

export default function PublicQuestionnairePage() {
  const [step, setStep] = useState(0); // 0 = contact info, 1-N = sections, N+1 = confirmation
  const [practitioners, setPractitioners] = useState<PublicPractitioner[]>([]);
  const [loadingPractitioners, setLoadingPractitioners] = useState(true);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    naturopathId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [responses, setResponses] = useState<QuestionnaireResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load practitioners on mount
  useEffect(() => {
    async function loadPractitioners() {
      try {
        const data = await getPublicPractitioners();
        setPractitioners(data);
      } catch (err) {
        console.error('Error loading practitioners:', err);
        setError('Impossible de charger la liste des naturopathes. Veuillez rafraîchir la page.');
      } finally {
        setLoadingPractitioners(false);
      }
    }
    loadPractitioners();
  }, []);

  // Get current section (null if on contact or confirmation step)
  const currentSection: AnamnesisSection | null =
    step > 0 && step <= TOTAL_SECTIONS ? ANAMNESIS_SECTIONS[step - 1] : null;

  // Handle contact info change
  const handleContactChange = useCallback(
    (field: keyof ContactInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setContactInfo((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  // Handle section response change
  const handleResponseChange = useCallback(
    (sectionId: string, questionKey: string) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setResponses((prev) => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [questionKey]: e.target.value
          }
        }));
      },
    []
  );

  // Validate current step
  const validateStep = useCallback((): boolean => {
    setError(null);

    if (step === 0) {
      if (!contactInfo.naturopathId) {
        setError('Veuillez sélectionner votre naturopathe.');
        return false;
      }
      if (!contactInfo.firstName.trim()) {
        setError('Veuillez entrer votre prénom.');
        return false;
      }
      if (!contactInfo.lastName.trim()) {
        setError('Veuillez entrer votre nom.');
        return false;
      }
      if (!contactInfo.email.trim()) {
        setError('Veuillez entrer votre adresse email.');
        return false;
      }
      // Basic email validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(contactInfo.email)) {
        setError('Veuillez entrer une adresse email valide.');
        return false;
      }
    }

    return true;
  }, [step, contactInfo]);

  // Go to next step
  const handleNext = useCallback(() => {
    if (validateStep()) {
      setStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [validateStep]);

  // Go to previous step
  const handlePrevious = useCallback(() => {
    setError(null);
    setStep((prev) => Math.max(0, prev - 1));
    window.scrollTo(0, 0);
  }, []);

  // Submit questionnaire
  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);

    try {
      await submitPreliminaryQuestionnaire({
        naturopathId: contactInfo.naturopathId,
        firstName: contactInfo.firstName,
        lastName: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone || undefined,
        responses
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }, [contactInfo, responses]);

  // Progress percentage
  const progress = Math.round((step / (TOTAL_SECTIONS + 1)) * 100);

  // Already submitted - show success message
  if (submitted) {
    return (
      <main className="min-h-screen bg-sable flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-teal"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-charcoal mb-2">Questionnaire envoyé !</h1>
            <p className="text-warmgray mb-6">
              Votre questionnaire a bien été transmis à votre naturopathe. Vous serez contacté(e)
              prochainement pour la suite de votre accompagnement.
            </p>
            <p className="text-sm text-marine/80">
              Vous pouvez fermer cette page en toute sécurité.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sable py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image src="/afeia_symbol.svg" alt="AFEIA" width={36} height={36} />
          <div>
            <div className="text-2xl font-semibold tracking-tight">Afeia</div>
            <div className="text-sm text-warmgray">Questionnaire Anamnèse</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-warmgray mb-2">
            <span>
              Étape {step + 1} sur {TOTAL_SECTIONS + 2}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm"
          >
            <div className="font-medium">Attention</div>
            <div className="text-marine mt-1">{error}</div>
          </div>
        )}

        {/* Step 0: Contact Information */}
        {step === 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Vos informations</h2>
            <p className="text-sm text-warmgray mb-6">
              Ces informations permettront à votre naturopathe de vous contacter et de préparer
              votre accompagnement.
            </p>

            <div className="space-y-4">
              <Select
                label="Votre naturopathe *"
                value={contactInfo.naturopathId}
                onChange={handleContactChange('naturopathId')}
                required
                disabled={loadingPractitioners}
              >
                <option value="">
                  {loadingPractitioners ? 'Chargement...' : 'Sélectionnez votre naturopathe'}
                </option>
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prénom *"
                  value={contactInfo.firstName}
                  onChange={handleContactChange('firstName')}
                  placeholder="Votre prénom"
                  required
                />
                <Input
                  label="Nom *"
                  value={contactInfo.lastName}
                  onChange={handleContactChange('lastName')}
                  placeholder="Votre nom"
                  required
                />
              </div>

              <Input
                label="Email *"
                type="email"
                value={contactInfo.email}
                onChange={handleContactChange('email')}
                placeholder="votre.email@exemple.com"
                required
              />

              <Input
                label="Téléphone"
                type="tel"
                value={contactInfo.phone}
                onChange={handleContactChange('phone')}
                placeholder="06 12 34 56 78"
                hint="Optionnel - Facilitera la prise de contact"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleNext}>Commencer le questionnaire</Button>
            </div>
          </Card>
        )}

        {/* Steps 1-N: Anamnesis Sections */}
        {currentSection && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-1">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-sm text-warmgray mb-6">{currentSection.description}</p>
            )}

            <div className="space-y-5">
              {currentSection.questions.map((question) => {
                const currentValue = responses[currentSection.id]?.[question.key] || '';

                if (question.type === 'choice' && question.options) {
                  return (
                    <div key={question.key}>
                      <label className="block text-xs font-medium text-marine/80 mb-2">
                        {question.label}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setResponses((prev) => ({
                                ...prev,
                                [currentSection.id]: {
                                  ...prev[currentSection.id],
                                  [question.key]: option
                                }
                              }));
                            }}
                            className={`px-4 py-2 rounded-xl text-sm transition-all ${
                              currentValue === option
                                ? 'bg-teal text-white shadow-sm'
                                : 'bg-white/80 text-charcoal hover:bg-teal/10 border border-black/10'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={question.key}>
                    <label className="block text-xs font-medium text-marine/80 mb-1">
                      {question.label}
                    </label>
                    <Textarea
                      value={currentValue}
                      onChange={handleResponseChange(currentSection.id, question.key)}
                      placeholder={question.placeholder || ''}
                      className="min-h-[100px]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevious}>
                Précédent
              </Button>
              <Button onClick={handleNext}>Suivant</Button>
            </div>
          </Card>
        )}

        {/* Final step: Confirmation */}
        {step === TOTAL_SECTIONS + 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-1">Vérification</h2>
            <p className="text-sm text-warmgray mb-6">
              Vérifiez vos informations avant de soumettre le questionnaire.
            </p>

            {/* Contact summary */}
            <div className="bg-sable/50 rounded-xl p-4 mb-6">
              <h3 className="font-medium text-marine mb-2">Vos coordonnées</h3>
              <div className="text-sm text-charcoal space-y-1">
                <p>
                  <span className="text-warmgray">Naturopathe :</span>{' '}
                  {practitioners.find((p) => p.id === contactInfo.naturopathId)?.full_name || '-'}
                </p>
                <p>
                  <span className="text-warmgray">Nom :</span> {contactInfo.firstName}{' '}
                  {contactInfo.lastName}
                </p>
                <p>
                  <span className="text-warmgray">Email :</span> {contactInfo.email}
                </p>
                {contactInfo.phone && (
                  <p>
                    <span className="text-warmgray">Téléphone :</span> {contactInfo.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Sections summary */}
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-marine">Vos réponses</h3>
              {ANAMNESIS_SECTIONS.map((section) => {
                const sectionResponses = responses[section.id];
                const hasResponses = sectionResponses && Object.keys(sectionResponses).length > 0;

                return (
                  <div key={section.id} className="border-b border-black/5 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-charcoal">{section.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          hasResponses ? 'bg-teal/10 text-teal' : 'bg-warmgray/10 text-warmgray'
                        }`}
                      >
                        {hasResponses ? 'Rempli' : 'Non rempli'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gold/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-marine">
                En soumettant ce questionnaire, vous acceptez que vos informations soient transmises
                à votre naturopathe dans le cadre de votre accompagnement. Vos données sont
                protégées conformément au RGPD.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={handlePrevious}>
                Modifier
              </Button>
              <Button onClick={handleSubmit} loading={submitting}>
                Envoyer le questionnaire
              </Button>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 text-xs text-warmgray text-center">
          RGPD : vos données sont hébergées en UE et protégées. Afeia ne remplace jamais un
          médecin.
        </div>
      </div>
    </main>
  );
}
