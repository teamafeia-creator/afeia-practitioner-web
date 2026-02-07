'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { ANAMNESIS_SECTIONS } from '@/lib/anamnesis';
import {
  getPreliminaryQuestionnaireById,
  createConsultantFromQuestionnaire,
  archivePreliminaryQuestionnaire
} from '@/services/preliminary-questionnaire';
import type { PreliminaryQuestionnaireWithConsultant } from '@/lib/types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function QuestionnaireDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionnaireId = params.id as string;

  const [questionnaire, setQuestionnaire] = useState<PreliminaryQuestionnaireWithConsultant | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPreliminaryQuestionnaireById(questionnaireId);
        setQuestionnaire(data);
      } catch (err) {
        console.error('Error loading questionnaire:', err);
        setToast({
          title: 'Erreur',
          description: 'Impossible de charger le questionnaire.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questionnaireId]);

  const handleCreateConsultant = async () => {
    if (!questionnaire) return;
    setActionLoading(true);
    try {
      const consultantId = await createConsultantFromQuestionnaire(questionnaire.id);
      setToast({
        title: 'Consultant créé',
        description: 'Le consultant a été créé et le questionnaire associé.',
        variant: 'success'
      });
      setTimeout(() => {
        router.push(`/consultants/${consultantId}`);
      }, 1000);
    } catch (err) {
      console.error('Error creating consultant:', err);
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de créer le consultant.',
        variant: 'error'
      });
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!questionnaire) return;
    setActionLoading(true);
    try {
      await archivePreliminaryQuestionnaire(questionnaire.id);
      setToast({
        title: 'Questionnaire archivé',
        variant: 'success'
      });
      setTimeout(() => {
        router.push('/questionnaires');
      }, 1000);
    } catch (err) {
      console.error('Error archiving questionnaire:', err);
      setToast({
        title: 'Erreur',
        description: "Impossible d'archiver le questionnaire.",
        variant: 'error'
      });
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="standard">En attente</Badge>;
      case 'linked_to_consultant':
        return <Badge variant="premium">Associé</Badge>;
      case 'archived':
        return <Badge variant="standard">Archivé</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du questionnaire…
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="space-y-6">
        <PageHeader title="Questionnaire non trouvé" />
        <Link href="/questionnaires">
          <Button variant="secondary">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  const responses = questionnaire.responses || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${questionnaire.first_name} ${questionnaire.last_name}`}
        subtitle={`Questionnaire soumis le ${formatDate(questionnaire.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/questionnaires">
              <Button variant="ghost">Retour</Button>
            </Link>
            {questionnaire.status === 'pending' && (
              <>
                <Button variant="secondary" onClick={handleArchive} disabled={actionLoading}>
                  Archiver
                </Button>
                <Button variant="primary" onClick={handleCreateConsultant} loading={actionLoading}>
                  Créer le dossier consultant
                </Button>
              </>
            )}
            {questionnaire.status === 'linked_to_consultant' && questionnaire.linked_consultant_id && (
              <Link href={`/consultants/${questionnaire.linked_consultant_id}`}>
                <Button variant="primary">Voir le dossier consultant</Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Contact Info Card */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal">Informations de contact</h2>
          {getStatusBadge(questionnaire.status)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-warmgray">Nom complet</div>
            <div className="text-sm font-medium text-charcoal">
              {questionnaire.first_name} {questionnaire.last_name}
            </div>
          </div>
          <div>
            <div className="text-xs text-warmgray">Email</div>
            <div className="text-sm font-medium text-charcoal">{questionnaire.email}</div>
          </div>
          <div>
            <div className="text-xs text-warmgray">Téléphone</div>
            <div className="text-sm font-medium text-charcoal">
              {questionnaire.phone || 'Non renseigné'}
            </div>
          </div>
          <div>
            <div className="text-xs text-warmgray">Date de soumission</div>
            <div className="text-sm font-medium text-charcoal">
              {formatDate(questionnaire.created_at)}
            </div>
          </div>
        </div>

        {questionnaire.status === 'linked_to_consultant' && questionnaire.linked_at && (
          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="text-xs text-warmgray">Associé au consultant le</div>
            <div className="text-sm font-medium text-teal">
              {formatDate(questionnaire.linked_at)}
            </div>
          </div>
        )}
      </Card>

      {/* Responses by Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">Réponses au questionnaire</h2>

        {ANAMNESIS_SECTIONS.map((section) => {
          const sectionResponses = responses[section.id];
          const hasResponses = sectionResponses && Object.keys(sectionResponses).length > 0;

          return (
            <Card key={section.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-charcoal">{section.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    hasResponses ? 'bg-teal/10 text-teal' : 'bg-warmgray/10 text-warmgray'
                  }`}
                >
                  {hasResponses ? 'Rempli' : 'Non rempli'}
                </span>
              </div>

              {hasResponses ? (
                <div className="space-y-4">
                  {section.questions.map((question) => {
                    const answer = sectionResponses[question.key];
                    if (!answer) return null;

                    return (
                      <div key={question.key} className="border-b border-black/5 pb-3 last:border-0">
                        <div className="text-xs text-warmgray mb-1">{question.label}</div>
                        <div className="text-sm text-charcoal whitespace-pre-wrap">{answer}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-warmgray italic">Aucune réponse pour cette section.</p>
              )}
            </Card>
          );
        })}
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
