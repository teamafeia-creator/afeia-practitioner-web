'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { getMyPatientsAndInvitations } from '@/services/practitioner.service';
import { invitationService } from '@/services/invitation.service';

type PatientRow = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  age?: number | null;
  city?: string | null;
  email?: string | null;
  activated?: boolean | null;
  activated_at?: string | null;
};

type InvitationRow = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invited_at: string;
  code_expires_at?: string;
};

function getDisplayName(item: PatientRow | InvitationRow): string {
  if (item.full_name) return item.full_name;
  const parts = [item.first_name, item.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return item.email || 'Non renseigné';
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingCode, setResendingCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      console.log('📋 Chargement patients et invitations...');
      setLoading(true);

      const result = await getMyPatientsAndInvitations();

      if (result.success) {
        setPatients((result.patients ?? []) as PatientRow[]);
        setInvitations((result.invitations ?? []) as InvitationRow[]);
        console.log(`✅ ${result.patients?.length || 0} patients, ${result.invitations?.length || 0} invitations`);
      } else {
        console.error('❌ Erreur chargement:', result.error);
      }
    } catch (err) {
      console.error('❌ Exception chargement:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get('deleted') === '1') {
      setToast({
        title: 'Patient supprimé',
        description: 'Le dossier a été supprimé définitivement.',
        variant: 'success'
      });
    }
    if (searchParams.get('created') === '1') {
      setToast({
        title: 'Invitation envoyée',
        description: 'Le code d\'activation a été envoyé par email.',
        variant: 'success'
      });
      // Recharger les données pour voir la nouvelle invitation
      loadData();
    }
  }, [searchParams]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [getDisplayName(patient), patient.city, patient.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [patients, search]);

  const filteredInvitations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invitations;
    return invitations.filter((inv) =>
      [getDisplayName(inv), inv.city, inv.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [invitations, search]);

  const handleResendCode = async (email: string) => {
    setResendingCode(email);
    try {
      const result = await invitationService.resendInvitationCode(email);
      if (result.success) {
        setToast({
          title: 'Code renvoyé',
          description: `Un nouveau code a été envoyé à ${email}`,
          variant: 'success'
        });
        if (result.code) {
          console.log('Code renvoyé (dev):', result.code);
        }
      } else {
        setToast({
          title: 'Erreur',
          description: result.error || 'Impossible de renvoyer le code',
          variant: 'error'
        });
      }
    } catch {
      setToast({
        title: 'Erreur',
        description: 'Impossible de renvoyer le code',
        variant: 'error'
      });
    } finally {
      setResendingCode(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Annuler l'invitation pour ${email} ?`)) return;

    try {
      const result = await invitationService.cancelInvitation(invitationId);
      if (result.success) {
        setToast({
          title: 'Invitation annulée',
          description: `L'invitation pour ${email} a été annulée`,
          variant: 'success'
        });
        // Recharger les données
        loadData();
      } else {
        setToast({
          title: 'Erreur',
          description: result.error || 'Impossible d\'annuler l\'invitation',
          variant: 'error'
        });
      }
    } catch {
      setToast({
        title: 'Erreur',
        description: 'Impossible d\'annuler l\'invitation',
        variant: 'error'
      });
    }
  };

  const totalCount = patients.length + invitations.length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement des patients…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${totalCount} patient(s) au total (${patients.length} actifs, ${invitations.length} en attente)`}
        actions={
          <Link href="/patients/new">
            <Button variant="primary">Ajouter un patient</Button>
          </Link>
        }
      />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher par nom, ville ou email..."
      />

      {/* Section Invitations en attente */}
      {filteredInvitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
            <span className="text-xl">⏳</span>
            Invitations en attente ({filteredInvitations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredInvitations.map((invitation) => {
              const isExpired = invitation.code_expires_at
                ? new Date(invitation.code_expires_at) < new Date()
                : false;

              return (
                <Card key={invitation.id} className="flex flex-col justify-between p-5 border-l-4 border-l-amber-400">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-charcoal">
                          {getDisplayName(invitation)}
                        </h3>
                        <p className="text-xs text-warmgray">
                          {invitation.city || 'Ville non renseignée'}
                        </p>
                      </div>
                      <Badge variant={isExpired ? 'info' : 'attention'}>
                        {isExpired ? 'Expiré' : 'En attente'}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="text-xs text-warmgray">
                        Email : <span className="text-marine">{invitation.email}</span>
                      </div>
                      {invitation.phone && (
                        <div className="text-xs text-warmgray">
                          Tél : <span className="text-marine">{invitation.phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-warmgray">
                        Invité le : <span className="text-marine">
                          {new Date(invitation.invited_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="rounded-full px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-full px-4 py-2 text-xs"
                      onClick={() => handleResendCode(invitation.email)}
                      disabled={resendingCode === invitation.email}
                    >
                      {resendingCode === invitation.email ? 'Envoi...' : 'Renvoyer le code'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Patients actifs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
          <span className="text-xl">✅</span>
          Patients actifs ({filteredPatients.length})
        </h2>

        {filteredPatients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPatients.map((patient) => {
              return (
                <Card key={patient.id} className="flex flex-col justify-between p-5 border-l-4 border-l-teal">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-charcoal">
                          {getDisplayName(patient)}
                        </h3>
                        <p className="text-xs text-warmgray">
                          {patient.age ? `${patient.age} ans` : 'Âge inconnu'}
                          {patient.city ? ` • ${patient.city}` : ''}
                        </p>
                      </div>
                      <Badge variant="success">Actif</Badge>
                    </div>

                    <div className="space-y-2 text-sm text-marine">
                      <div className="text-xs text-warmgray">
                        Email : <span className="text-marine">{patient.email || 'Non renseigné'}</span>
                      </div>
                      {patient.activated_at && (
                        <div className="text-xs text-warmgray">
                          Activé le : <span className="text-marine">
                            {new Date(patient.activated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link href={`/patients/${patient.id}`}>
                      <Button variant="ghost" className="rounded-full px-4 py-2 text-xs">
                        Voir le dossier
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-warmgray">
            {search ? 'Aucun patient actif ne correspond à votre recherche' : 'Aucun patient actif'}
          </div>
        )}
      </div>

      {/* État vide global */}
      {totalCount === 0 ? (
        <EmptyState
          icon="🧑‍⚕️"
          title="Aucun patient"
          description="Commencez par ajouter votre premier patient."
          action={
            <Link href="/patients/new">
              <Button variant="secondary">Créer un patient</Button>
            </Link>
          }
        />
      ) : null}

      {/* État vide avec recherche */}
      {totalCount > 0 && filteredPatients.length === 0 && filteredInvitations.length === 0 && search ? (
        <EmptyState
          icon="🔍"
          title="Aucun résultat"
          description="Ajustez votre recherche."
        />
      ) : null}

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
