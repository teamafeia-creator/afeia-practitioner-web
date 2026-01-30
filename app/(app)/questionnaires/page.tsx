'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { TabsPills } from '@/components/ui/TabsPills';
import { Toast } from '@/components/ui/Toast';
import { LinkQuestionnaireModal } from '@/components/questionnaires/LinkQuestionnaireModal';
import {
  getPreliminaryQuestionnaires,
  createPatientFromQuestionnaire,
  archivePreliminaryQuestionnaire,
  linkQuestionnaireToExistingPatient
} from '@/services/preliminary-questionnaire';
import type { PreliminaryQuestionnaire } from '@/lib/types';

const TAB_LABELS = {
  'En attente': 'pending',
  'Associés': 'linked_to_patient',
  'Archivés': 'archived',
  'Tous': 'all'
} as const;

const TABS = ['En attente', 'Associés', 'Archivés', 'Tous'] as const;
type TabLabel = typeof TABS[number];
type TabStatus = typeof TAB_LABELS[TabLabel];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<PreliminaryQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTabLabel, setActiveTabLabel] = useState<TabLabel>('En attente');
  const activeTab = TAB_LABELS[activeTabLabel];
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkingQuestionnaire, setLinkingQuestionnaire] = useState<PreliminaryQuestionnaire | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Load questionnaires
  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      const data = await getPreliminaryQuestionnaires({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 100
      });
      setQuestionnaires(data);
    } catch (err) {
      console.error('Error loading questionnaires:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible de charger les questionnaires.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionnaires();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabLabel]);

  // Filter questionnaires by search
  const filteredQuestionnaires = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return questionnaires;
    return questionnaires.filter((q) =>
      [q.first_name, q.last_name, q.email].some((value) => value?.toLowerCase().includes(term))
    );
  }, [questionnaires, search]);

  // Create patient from questionnaire
  const handleCreatePatient = async (questionnaireId: string) => {
    setActionLoading(questionnaireId);
    try {
      const result = await createPatientFromQuestionnaire(questionnaireId);
      const codeDisplay = result.code ? `\n\nCode OTP : ${result.code}` : '';
      const emailDisplay = result.email ? ` (${result.email})` : '';
      setToast({
        title: 'Patient créé et code envoyé',
        description: `Le patient a été créé et le questionnaire associé.${emailDisplay}${codeDisplay}`,
        variant: 'success'
      });
      // Redirect to patient page after short delay
      setTimeout(() => {
        window.location.href = `/patients/${result.patientId}`;
      }, 2000);
    } catch (err) {
      console.error('Error creating patient:', err);
      setToast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de créer le patient.',
        variant: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Archive questionnaire
  const handleArchive = async (questionnaireId: string) => {
    setActionLoading(questionnaireId);
    try {
      await archivePreliminaryQuestionnaire(questionnaireId);
      setToast({
        title: 'Questionnaire archivé',
        variant: 'success'
      });
      loadQuestionnaires();
    } catch (err) {
      console.error('Error archiving questionnaire:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible d\'archiver le questionnaire.',
        variant: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Link questionnaire to existing patient
  const handleLinkToPatient = async (patientId: string) => {
    if (!linkingQuestionnaire) return;

    await linkQuestionnaireToExistingPatient(linkingQuestionnaire.id, patientId);
    setToast({
      title: 'Questionnaire associé',
      description: 'Les données du questionnaire ont été ajoutées à l\'anamnèse du patient.',
      variant: 'success'
    });
    loadQuestionnaires();
  };

  // Get status badge
  const getStatusBadge = (status: PreliminaryQuestionnaire['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="standard">En attente</Badge>;
      case 'linked_to_patient':
        return <Badge variant="premium">Associé</Badge>;
      case 'archived':
        return <Badge variant="standard">Archivé</Badge>;
      default:
        return null;
    }
  };

  // Count by status
  const pendingCount = questionnaires.filter((q) => q.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement des questionnaires…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questionnaires préliminaires"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} questionnaire(s) en attente`
            : 'Aucun questionnaire en attente'
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/questionnaire`);
              setToast({
                title: 'Lien copié',
                description: 'Le lien du questionnaire public a été copié.',
                variant: 'success'
              });
            }}
          >
            Copier le lien public
          </Button>
        }
      />

      {/* Info banner */}
      <div className="bg-teal/10 rounded-xl p-4 text-sm text-marine">
        <p className="font-medium">Comment ça marche ?</p>
        <p className="mt-1 text-warmgray">
          Partagez le lien public avec vos patients. Ils peuvent remplir le questionnaire avant leur
          première consultation. Créez ensuite leur dossier patient en un clic.
        </p>
      </div>

      <TabsPills
        tabs={TABS}
        active={activeTabLabel}
        onChange={(tab) => setActiveTabLabel(tab)}
      />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher par nom ou email..."
      />

      <div className="space-y-4">
        {filteredQuestionnaires.map((q) => (
          <Card key={q.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-charcoal">
                    {q.first_name} {q.last_name}
                  </h3>
                  {getStatusBadge(q.status)}
                </div>

                <div className="space-y-1 text-sm text-warmgray">
                  <p>
                    <span className="text-marine">{q.email}</span>
                    {q.phone && (
                      <span className="ml-3">
                        Tél: <span className="text-marine">{q.phone}</span>
                      </span>
                    )}
                  </p>
                  <p>Soumis le {formatDate(q.created_at)}</p>
                  {q.linked_at && (
                    <p className="text-teal">Associé le {formatDate(q.linked_at)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/questionnaires/${q.id}`}>
                  <Button variant="ghost" className="text-xs">
                    Voir détails
                  </Button>
                </Link>

                {q.status === 'pending' && (
                  <>
                    <Button
                      variant="primary"
                      className="text-xs"
                      onClick={() => handleCreatePatient(q.id)}
                      loading={actionLoading === q.id}
                    >
                      Créer patient
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setLinkingQuestionnaire(q)}
                      disabled={actionLoading === q.id}
                    >
                      Associer patient
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleArchive(q.id)}
                      disabled={actionLoading === q.id}
                    >
                      Archiver
                    </Button>
                  </>
                )}

                {q.status === 'linked_to_patient' && q.linked_patient_id && (
                  <Link href={`/patients/${q.linked_patient_id}`}>
                    <Button variant="secondary" className="text-xs">
                      Voir patient
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredQuestionnaires.length === 0 && (
        <EmptyState
          icon="📋"
          title={
            activeTabLabel === 'En attente'
              ? 'Aucun questionnaire en attente'
              : 'Aucun questionnaire trouvé'
          }
          description={
            activeTabLabel === 'En attente'
              ? 'Les questionnaires remplis par vos patients apparaîtront ici.'
              : 'Ajustez votre recherche ou changez de filtre.'
          }
        />
      )}

      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal pour associer un questionnaire à un patient existant */}
      <LinkQuestionnaireModal
        isOpen={linkingQuestionnaire !== null}
        onClose={() => setLinkingQuestionnaire(null)}
        onLink={handleLinkToPatient}
        questionnaireInfo={linkingQuestionnaire ? {
          firstName: linkingQuestionnaire.first_name,
          lastName: linkingQuestionnaire.last_name,
          email: linkingQuestionnaire.email
        } : undefined}
      />
    </div>
  );
}
