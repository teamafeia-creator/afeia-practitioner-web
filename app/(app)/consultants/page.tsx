'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { ConsultantFilterBar } from '@/components/consultants/ConsultantFilterBar';
import { SavedViewsTabs } from '@/components/consultants/SavedViewsTabs';
import { useConsultantFilters } from '@/hooks/useConsultantFilters';
import { getMyConsultantsAndInvitations } from '@/services/practitioner.service';
import { invitationService } from '@/services/invitation.service';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {
  Search,
  Plus,
  Calendar,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  X,
  Users
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { ConsultantFilters } from '@/lib/types/filters';
import { DEFAULT_FILTERS } from '@/lib/types/filters';

type ConsultantRow = {
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
  consultant_id?: string | null;
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

type ConsultantMeta = {
  lastConsultation?: string | null;
  unreadMessages?: number;
  planStatus?: string | null;
  planUpdatedAt?: string | null;
  progress?: number;
};

const PROGRESS_WINDOW_DAYS = 30;

function getDisplayName(item: ConsultantRow | InvitationRow): string {
  if (item.full_name) return item.full_name;
  const parts = [item.first_name, item.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return item.email || 'Non renseigne';
}

export default function ConsultantsPage() {
  const router = useRouter();
  const [consultants, setConsultants] = useState<ConsultantRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [consultantMeta, setConsultantMeta] = useState<Record<string, ConsultantMeta>>({});
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
      setLoading(true);

      const result = await getMyConsultantsAndInvitations();

      if (result.success) {
        const consultantsList = (result.consultants ?? []) as ConsultantRow[];
        setConsultants(consultantsList);
        setInvitations((result.invitations ?? []) as InvitationRow[]);

        const consultantIds = consultantsList.map((consultant) => consultant.id);
        if (consultantIds.length > 0) {
          const [consultationsRes, messagesRes, plansRes, journalsRes] = await Promise.all([
            supabase
              .from('consultations')
              .select('consultant_id, date')
              .in('consultant_id', consultantIds),
            supabase
              .from('messages')
              .select('consultant_id')
              .in('consultant_id', consultantIds)
              .eq('sender_role', 'consultant')
              .is('read_by_practitioner', false),
            supabase
              .from('consultant_plans')
              .select('consultant_id, status, updated_at')
              .in('consultant_id', consultantIds),
            supabase
              .from('daily_journals')
              .select('consultant_id, date')
              .in('consultant_id', consultantIds)
              .gte('date', new Date(Date.now() - PROGRESS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())
          ]);

          const lastConsultationMap = new Map<string, string>();
          (consultationsRes.data ?? []).forEach((consultation) => {
            if (!consultation.consultant_id || !consultation.date) return;
            const current = lastConsultationMap.get(consultation.consultant_id);
            if (!current || new Date(consultation.date) > new Date(current)) {
              lastConsultationMap.set(consultation.consultant_id, consultation.date);
            }
          });

          const unreadMessagesMap = new Map<string, number>();
          (messagesRes.data ?? []).forEach((message) => {
            if (!message.consultant_id) return;
            unreadMessagesMap.set(message.consultant_id, (unreadMessagesMap.get(message.consultant_id) ?? 0) + 1);
          });

          const planMap = new Map<string, { status?: string | null; updatedAt?: string | null }>();
          (plansRes.data ?? []).forEach((plan) => {
            if (!plan.consultant_id) return;
            const existing = planMap.get(plan.consultant_id);
            const nextDate = plan.updated_at ?? null;
            if (!existing || (existing.updatedAt && nextDate && new Date(nextDate) > new Date(existing.updatedAt))) {
              planMap.set(plan.consultant_id, {
                status: plan.status ?? null,
                updatedAt: nextDate
              });
            }
          });

          const journalCountMap = new Map<string, number>();
          (journalsRes.data ?? []).forEach((journal) => {
            if (!journal.consultant_id) return;
            journalCountMap.set(journal.consultant_id, (journalCountMap.get(journal.consultant_id) ?? 0) + 1);
          });

          const meta: Record<string, ConsultantMeta> = {};
          consultantIds.forEach((consultantId) => {
            const journalCount = journalCountMap.get(consultantId) ?? 0;
            meta[consultantId] = {
              lastConsultation: lastConsultationMap.get(consultantId) ?? null,
              unreadMessages: unreadMessagesMap.get(consultantId) ?? 0,
              planStatus: planMap.get(consultantId)?.status ?? null,
              planUpdatedAt: planMap.get(consultantId)?.updatedAt ?? null,
              progress: Math.min(100, Math.round((journalCount / PROGRESS_WINDOW_DAYS) * 100))
            };
          });

          setConsultantMeta(meta);
        }
      }
    } catch (err) {
      console.error('Error loading consultants:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get('deleted') === '1') {
      setToast({
        title: 'Consultant supprime',
        description: 'Le dossier a ete supprime definitivement.',
        variant: 'success'
      });
    }
    if (searchParams.get('created') === '1') {
      setToast({
        title: 'Invitation envoyee',
        description: 'Le code d\'activation a ete envoye par email.',
        variant: 'success'
      });
      loadData();
    }
  }, [searchParams]);

  const uniqueConsultants = useMemo(() => {
    const map = new Map<string, ConsultantRow>();
    consultants.forEach((consultant) => {
      if (!map.has(consultant.id)) {
        map.set(consultant.id, consultant);
      }
    });
    return [...map.values()];
  }, [consultants]);

  const uniqueInvitations = useMemo(() => {
    const map = new Map<string, InvitationRow>();
    invitations.forEach((invitation) => {
      if (!map.has(invitation.id)) {
        map.set(invitation.id, invitation);
      }
    });
    return [...map.values()];
  }, [invitations]);

  const invitationConsultantIds = useMemo(() => {
    return new Set(uniqueInvitations.map((invitation) => invitation.consultant_id).filter(Boolean) as string[]);
  }, [uniqueInvitations]);

  const visibleConsultants = useMemo(() => {
    return uniqueConsultants.filter((consultant) => !invitationConsultantIds.has(consultant.id));
  }, [uniqueConsultants, invitationConsultantIds]);

  const filteredConsultants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleConsultants
      .filter((consultant) => {
        const displayName = getDisplayName(consultant);
        const matchSearch = !term || [displayName, consultant.city, consultant.email].some((value) =>
          value?.toLowerCase().includes(term)
        );
        const isActive = consultant.activated !== false;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && isActive) ||
          (statusFilter === 'inactive' && !isActive);
        const isPremium = consultant.is_premium || consultant.status === 'premium';
        const matchesTier =
          tierFilter === 'all' ||
          (tierFilter === 'premium' && isPremium) ||
          (tierFilter === 'standard' && !isPremium);

        return matchSearch && matchesStatus && matchesTier;
      })
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'fr'));
  }, [visibleConsultants, search, statusFilter, tierFilter]);

  const filteredInvitations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return uniqueInvitations;
    return uniqueInvitations.filter((inv) =>
      [getDisplayName(inv), inv.city, inv.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [uniqueInvitations, search]);

  const handleResendCode = async (email: string) => {
    setResendingCode(email);
    try {
      const result = await invitationService.resendInvitationCode(email);
      if (result.success) {
        const codeDisplay = result.code ? `\n\nCode OTP : ${result.code}` : '';
        setToast({
          title: 'Code renvoye',
          description: `Un nouveau code a ete envoye a ${email}${codeDisplay}`,
          variant: 'success'
        });
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
          title: 'Invitation annulee',
          description: `L'invitation pour ${email} a ete annulee`,
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

  // Advanced filters (V1+V2)
  const advancedFilters = useConsultantFilters();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>Consultants</h1>
        </div>
        <SkeletonList items={6} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>Consultants</h1>
        <Link href="/consultants/new">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
            Nouveau consultant
          </Button>
        </Link>
      </div>

      {/* Search bar — prominent */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, ville ou tag..."
          className="w-full pl-12 pr-10 py-3.5 text-sm rounded-xl border border-divider bg-white focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 shadow-card transition-shadow placeholder:text-mist"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status tabs */}
        <div className="toggle-group">
          {([
            { key: 'active', label: 'Actifs' },
            { key: 'all', label: 'Tous' },
            { key: 'inactive', label: 'Inactifs' }
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={cn('toggle-btn', statusFilter === item.key && 'active')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tier chips */}
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'Tous' },
            { key: 'premium', label: 'Premium' },
            { key: 'standard', label: 'Standard' }
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setTierFilter(item.key)}
              className={cn('chip', tierFilter === item.key && 'active')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone ml-auto">
          {filteredConsultants.length} consultant{filteredConsultants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white border border-divider rounded-xl p-4">
        <ConsultantFilterBar
          filters={advancedFilters.filters}
          setFilter={advancedFilters.setFilter}
          clearFilters={advancedFilters.clearFilters}
          activeFilterCount={advancedFilters.activeFilterCount}
          search={advancedFilters.search}
          setSearch={advancedFilters.setSearch}
          sortOption={advancedFilters.sortOption}
          setSortOption={advancedFilters.setSortOption}
          resultCount={advancedFilters.consultants.length}
          availableConcerns={advancedFilters.availableConcerns}
        />
        <div className="mt-2">
          <SavedViewsTabs
            filters={advancedFilters.filters}
            activeFilterCount={advancedFilters.activeFilterCount}
            onApplyView={(newFilters: ConsultantFilters) => {
              Object.entries(newFilters).forEach(([key, value]) => {
                advancedFilters.setFilter(key as keyof ConsultantFilters, value as ConsultantFilters[keyof ConsultantFilters]);
              });
            }}
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredConsultants.length === 0 && (
        <div className="bg-white border border-divider rounded-xl p-8 shadow-card flex flex-col items-center justify-center text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden mb-6 opacity-50">
            <Image
              src="/images/palm-minimal.jpg"
              alt=""
              width={112}
              height={112}
              className="object-cover w-full h-full"
            />
          </div>
          <h4 className="font-serif text-xl text-[#2D3436] mb-2">
            Aucun consultant
          </h4>
          <p className="text-[#6B7280] text-sm max-w-sm mb-4">
            {search ? 'Aucun consultant ne correspond a votre recherche.' : 'Commencez par ajouter votre premier consultant.'}
          </p>
          <Link href="/consultants/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Creer un consultant
            </Button>
          </Link>
        </div>
      )}

      {/* Consultant Grid (compact cards) with stagger animation */}
      {filteredConsultants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredConsultants.map((consultant, index) => {
            const meta = consultantMeta[consultant.id] ?? {};
            const isPremium = consultant.is_premium || consultant.status === 'premium';
            const isActive = consultant.activated !== false;
            const lastContact = meta.lastConsultation
              ? new Date(meta.lastConsultation).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short'
              })
              : null;

            return (
              <motion.div
                key={consultant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{
                  boxShadow: '0 8px 30px rgba(45,52,54,0.08)',
                  transition: { duration: 0.2 }
                }}
              >
              <Link
                href={`/consultants/${consultant.id}`}
                className="block bg-white border border-divider rounded-xl p-5 shadow-card transition-all duration-200 hover:border-sage/30"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar + status dot */}
                  <div className="relative mb-3">
                    <Avatar name={getDisplayName(consultant)} size="lg" />
                    <span className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                      !isActive ? 'bg-mist' :
                      meta.lastConsultation && new Date(meta.lastConsultation) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'bg-gold' :
                      'bg-success'
                    )} />
                  </div>

                  {/* Name */}
                  <h3 className="text-sm font-semibold text-charcoal truncate w-full mb-1">
                    {getDisplayName(consultant)}
                  </h3>

                  {/* Badge */}
                  <span className={cn(
                    'px-2 py-0.5 rounded-2xl text-[11px] font-medium mb-2',
                    isPremium ? 'badge-premium' : 'badge-standard'
                  )}>
                    {isPremium ? 'Premium' : 'Standard'}
                  </span>

                  {/* City */}
                  {consultant.city && (
                    <p className="text-xs text-stone mb-2">{consultant.city}</p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-3 text-[11px] text-stone mt-auto pt-2 border-t border-divider w-full justify-center">
                    {lastContact ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {lastContact}
                      </span>
                    ) : (
                      <span className="text-mist">Aucun RDV</span>
                    )}

                    {meta.unreadMessages && meta.unreadMessages > 0 ? (
                      <span className="message-badge flex items-center gap-1 text-[11px] px-2 py-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {meta.unreadMessages}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pending Invitations */}
      {filteredInvitations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold font-serif text-charcoal mb-4" style={{ letterSpacing: '-0.02em' }}>
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Invitations en attente ({filteredInvitations.length})
            </span>
          </h2>
          <div className="space-y-2">
            {filteredInvitations.map((invitation) => {
              const isExpired = invitation.code_expires_at
                ? new Date(invitation.code_expires_at) < new Date()
                : false;
              const canOpen = Boolean(invitation.consultant_id);

              return (
                <div
                  key={invitation.id}
                  className={cn(
                    'bg-white border border-divider rounded-xl p-4 shadow-card transition-shadow',
                    canOpen && 'cursor-pointer hover:shadow-card-hover'
                  )}
                  onClick={() => {
                    if (canOpen && invitation.consultant_id) {
                      router.push(`/consultants/${invitation.consultant_id}`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar name={getDisplayName(invitation)} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base font-semibold text-charcoal truncate">
                            {getDisplayName(invitation)}
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 rounded-2xl text-xs font-medium',
                            isExpired ? 'badge-info' : 'badge-urgent'
                          )}>
                            {isExpired ? 'Expire' : 'En attente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[13px] text-stone">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {invitation.email}
                          </span>
                          {invitation.city && <span>{invitation.city}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose hover:bg-rose/5"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCancelInvitation(invitation.id, invitation.email);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleResendCode(invitation.email);
                        }}
                        disabled={resendingCode === invitation.email}
                      >
                        {resendingCode === invitation.email ? 'Envoi...' : 'Renvoyer le code'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </motion.div>
  );
}
