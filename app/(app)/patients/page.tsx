'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/Progress';
import { getMyPatientsAndInvitations } from '@/services/practitioner.service';
import { invitationService } from '@/services/invitation.service';
import { supabase } from '@/lib/supabase';

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
  status?: string | null;
  is_premium?: boolean | null;
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

type PatientMeta = {
  lastConsultation?: string | null;
  unreadMessages?: number;
  planStatus?: string | null;
  planUpdatedAt?: string | null;
  progress?: number;
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const PROGRESS_WINDOW_DAYS = 30;

function getDisplayName(item: PatientRow | InvitationRow): string {
  if (item.full_name) return item.full_name;
  const parts = [item.first_name, item.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return item.email || 'Non renseigné';
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [patientMeta, setPatientMeta] = useState<Record<string, PatientMeta>>({});
  const [loading, setLoading] = useState(true);
  const [resendingCode, setResendingCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [tierFilter, setTierFilter] = useState<'all' | 'premium' | 'standard'>('all');
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
        const patientsList = (result.patients ?? []) as PatientRow[];
        setPatients(patientsList);
        setInvitations((result.invitations ?? []) as InvitationRow[]);

        const patientIds = patientsList.map((patient) => patient.id);
        if (patientIds.length > 0) {
          const [consultationsRes, messagesRes, plansRes, journalsRes] = await Promise.all([
            supabase
              .from('consultations')
              .select('patient_id, date')
              .in('patient_id', patientIds),
            supabase
              .from('messages')
              .select('patient_id')
              .in('patient_id', patientIds)
              .eq('sender_role', 'patient')
              .is('read_by_practitioner', false),
            supabase
              .from('patient_plans')
              .select('patient_id, status, updated_at')
              .in('patient_id', patientIds),
            supabase
              .from('daily_journals')
              .select('patient_id, date')
              .in('patient_id', patientIds)
              .gte('date', new Date(Date.now() - PROGRESS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())
          ]);

          const lastConsultationMap = new Map<string, string>();
          (consultationsRes.data ?? []).forEach((consultation) => {
            if (!consultation.patient_id || !consultation.date) return;
            const current = lastConsultationMap.get(consultation.patient_id);
            if (!current || new Date(consultation.date) > new Date(current)) {
              lastConsultationMap.set(consultation.patient_id, consultation.date);
            }
          });

          const unreadMessagesMap = new Map<string, number>();
          (messagesRes.data ?? []).forEach((message) => {
            if (!message.patient_id) return;
            unreadMessagesMap.set(message.patient_id, (unreadMessagesMap.get(message.patient_id) ?? 0) + 1);
          });

          const planMap = new Map<string, { status?: string | null; updatedAt?: string | null }>();
          (plansRes.data ?? []).forEach((plan) => {
            if (!plan.patient_id) return;
            const existing = planMap.get(plan.patient_id);
            const nextDate = plan.updated_at ?? null;
            if (!existing || (existing.updatedAt && nextDate && new Date(nextDate) > new Date(existing.updatedAt))) {
              planMap.set(plan.patient_id, {
                status: plan.status ?? null,
                updatedAt: nextDate
              });
            }
          });

          const journalCountMap = new Map<string, number>();
          (journalsRes.data ?? []).forEach((journal) => {
            if (!journal.patient_id) return;
            journalCountMap.set(journal.patient_id, (journalCountMap.get(journal.patient_id) ?? 0) + 1);
          });

          const meta: Record<string, PatientMeta> = {};
          patientIds.forEach((patientId) => {
            const journalCount = journalCountMap.get(patientId) ?? 0;
            meta[patientId] = {
              lastConsultation: lastConsultationMap.get(patientId) ?? null,
              unreadMessages: unreadMessagesMap.get(patientId) ?? 0,
              planStatus: planMap.get(patientId)?.status ?? null,
              planUpdatedAt: planMap.get(patientId)?.updatedAt ?? null,
              progress: Math.min(100, Math.round((journalCount / PROGRESS_WINDOW_DAYS) * 100))
            };
          });

          setPatientMeta(meta);
        }

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
      loadData();
    }
  }, [searchParams]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const displayName = getDisplayName(patient);
      const matchSearch = !term || [displayName, patient.city, patient.email].some((value) =>
        value?.toLowerCase().includes(term)
      );
      const isActive = patient.activated !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);
      const isPremium = patient.is_premium || patient.status === 'premium';
      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'premium' && isPremium) ||
        (tierFilter === 'standard' && !isPremium);

      return matchSearch && matchesStatus && matchesTier;
    });
  }, [patients, search, statusFilter, tierFilter]);

  const groupedPatients = useMemo(() => {
    const grouped: Record<string, PatientRow[]> = {};
    filteredPatients.forEach((patient) => {
      const name = getDisplayName(patient);
      const letter = name?.[0]?.toUpperCase() ?? '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      grouped[key] = grouped[key] ? [...grouped[key], patient] : [patient];
    });
    return grouped;
  }, [filteredPatients]);

  const availableLetters = useMemo(() => new Set(Object.keys(groupedPatients)), [groupedPatients]);

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement des patients…
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="sticky top-4 z-10 rounded-[22px] glass-panel p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/60 p-1">
              {([
                { key: 'active', label: 'Actifs' },
                { key: 'all', label: 'Tous' },
                { key: 'inactive', label: 'Inactifs' }
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    statusFilter === item.key
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-warmgray hover:text-teal'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {([
                { key: 'all', label: 'Tous' },
                { key: 'premium', label: 'Premium' },
                { key: 'standard', label: 'Standard' }
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTierFilter(item.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                    tierFilter === item.key
                      ? 'bg-teal/15 text-teal ring-teal/30'
                      : 'bg-white/60 text-warmgray ring-white/60 hover:text-teal'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-[220px] flex-1 md:max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un patient..."
            />
          </div>
          <Link href="/patients/new">
            <Button variant="primary">Ajouter un patient</Button>
          </Link>
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto rounded-full bg-white/70 p-2 text-xs">
          {alphabet.map((letter) => (
            <a
              key={letter}
              href={`#section-${letter}`}
              className={`px-3 py-1 rounded-full transition ${
                availableLetters.has(letter)
                  ? 'text-teal font-semibold'
                  : 'text-warmgray/50'
              }`}
            >
              {letter}
            </a>
          ))}
        </div>
      </div>

      <div className="hidden md:flex md:fixed md:right-8 md:top-32 md:flex-col md:items-center md:gap-2 md:rounded-[18px] md:bg-teal/10 md:p-3 md:backdrop-blur">
        {alphabet.map((letter) => (
          <a
            key={letter}
            href={`#section-${letter}`}
            className={`text-xs font-medium transition ${
              availableLetters.has(letter)
                ? 'text-teal hover:text-teal-deep'
                : 'text-warmgray/40'
            } ${availableLetters.has(letter) ? 'hover:bg-white/70 px-2 py-1 rounded-full' : ''}`}
          >
            {letter}
          </a>
        ))}
      </div>

      {filteredPatients.length === 0 ? (
        <EmptyState
          icon="🧑‍⚕️"
          title="Aucun patient"
          description={search ? 'Aucun patient ne correspond à votre recherche.' : 'Commencez par ajouter votre premier patient.'}
          action={
            <Link href="/patients/new">
              <Button variant="secondary">Créer un patient</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {[...alphabet, '#'].map((letter) => {
            const sectionPatients = groupedPatients[letter] ?? [];
            if (sectionPatients.length === 0) return null;
            return (
              <section key={letter} id={`section-${letter}`} className="space-y-4">
                <div className="rounded-full bg-teal/20 px-4 py-2 text-sm font-semibold text-teal">
                  {letter}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sectionPatients.map((patient) => {
                    const meta = patientMeta[patient.id] ?? {};
                    const isPremium = patient.is_premium || patient.status === 'premium';
                    const lastContact = meta.lastConsultation
                      ? new Date(meta.lastConsultation).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'Aucun RDV';
                    const planLabel = meta.planStatus
                      ? meta.planStatus === 'shared'
                        ? 'Programme partagé'
                        : 'Bilan en brouillon'
                      : 'Programme non défini';
                    const progress = meta.progress ?? 0;

                    return (
                      <Card
                        key={patient.id}
                        className="glass-card p-5 transition hover:translate-x-1 hover:shadow-card-hover"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={getDisplayName(patient)} size="md" />
                            <div>
                              <div className="text-base font-semibold text-charcoal">
                                {getDisplayName(patient)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-warmgray">
                                <span className={`h-2 w-2 rounded-full ${patient.activated === false ? 'bg-warmgray' : 'bg-sage'}`} />
                                {patient.activated === false ? 'Inactif' : 'Actif'}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isPremium ? <Badge variant="premium">Premium</Badge> : <Badge variant="standard">Standard</Badge>}
                            {meta.unreadMessages && meta.unreadMessages > 0 ? (
                              <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-semibold text-gold">
                                {meta.unreadMessages} msg
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-warmgray">
                          <div>Dernier RDV : <span className="text-charcoal">{lastContact}</span></div>
                          <div>Programme : <span className="text-charcoal">{planLabel}</span></div>
                          <ProgressBar value={progress} max={100} size="sm" />
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-xs text-warmgray">
                            {patient.city ? patient.city : 'Ville non renseignée'}
                          </div>
                          <Link href={`/patients/${patient.id}`}>
                            <Button variant="outline" size="sm">Voir dossier</Button>
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

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
                <Card key={invitation.id} className="glass-card flex flex-col justify-between p-5">
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
