'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { getMyConsultantsAndInvitations } from '@/services/practitioner.service';
import { invitationService } from '@/services/invitation.service';
import { supabase } from '@/lib/supabase';
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

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const alphabetWithHash = [...alphabet, '#'];
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
  const [activeSection, setActiveSection] = useState<string>('A');
  const searchParams = useSearchParams();
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
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

  // Intersection observer for alphabet index
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const letter = entry.target.id.replace('section-', '');
            setActiveSection(letter);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
    );

    sectionsRef.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [consultants]);

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
    return visibleConsultants.filter((consultant) => {
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
    });
  }, [visibleConsultants, search, statusFilter, tierFilter]);

  const groupedConsultants = useMemo(() => {
    const grouped: Record<string, ConsultantRow[]> = {};
    filteredConsultants.forEach((consultant) => {
      const name = getDisplayName(consultant);
      const letter = name?.[0]?.toUpperCase() ?? '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      grouped[key] = grouped[key] ? [...grouped[key], consultant] : [consultant];
    });
    return grouped;
  }, [filteredConsultants]);

  const availableLetters = useMemo(() => new Set(Object.keys(groupedConsultants)), [groupedConsultants]);

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

  const scrollToSection = (letter: string) => {
    const element = sectionsRef.current.get(letter);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [creatingDev, setCreatingDev] = useState(false);

  const handleCreateDevConsultant = async () => {
    setCreatingDev(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setToast({ title: 'Erreur', description: 'Non authentifie', variant: 'error' });
        return;
      }

      const { data, error } = await supabase
        .from('consultants')
        .insert({
          practitioner_id: session.user.id,
          name: `Consultant Demo ${Date.now().toString(36).slice(-4).toUpperCase()}`,
          email: `demo-${Date.now()}@test.local`,
          city: 'Paris',
          phone: '06 00 00 00 00',
          is_premium: true,
          activated: true,
          activated_at: new Date().toISOString(),
          status: 'premium'
        })
        .select()
        .single();

      if (error) {
        console.error('Dev consultant creation error:', error);
        setToast({ title: 'Erreur', description: error.message, variant: 'error' });
        return;
      }

      setToast({ title: 'Consultant demo cree', description: data.name, variant: 'success' });
      router.push(`/consultants/${data.id}`);
    } catch (err) {
      setToast({ title: 'Erreur', description: String(err), variant: 'error' });
    } finally {
      setCreatingDev(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-warmgray">Chargement des consultants...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sticky Filters Bar */}
      <div className="sticky top-0 z-20 glass-panel rounded-lg p-4 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-warmgray">Statut :</span>
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
            </div>

            {/* Type Chips */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-warmgray">Type :</span>
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
            </div>
          </div>

          {/* Search & Add */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warmgray" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un consultant..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-warmgray-light/30 bg-white/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray hover:text-charcoal"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={handleCreateDevConsultant}
              disabled={creatingDev}
            >
              {creatingDev ? 'Creation...' : '+ Demo'}
            </Button>
            <Link href="/consultants/new">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                Ajouter
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Alphabet Index (floating left) */}
      <div className="md:hidden fixed left-2 top-1/2 -translate-y-1/2 z-30">
        <div className="glass-panel rounded-full bg-white/80 p-1.5 shadow-lg backdrop-blur max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={scrollToTop}
              aria-label="Revenir en haut de la liste"
              className="alphabet-letter h-9 w-9 text-[10px] uppercase tracking-wide"
            >
              Tous
            </button>
            {alphabetWithHash.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToSection(letter)}
                disabled={!availableLetters.has(letter)}
                aria-label={`Aller a la section ${letter}`}
                className={cn(
                  'alphabet-letter h-9 w-9 text-sm',
                  activeSection === letter && availableLetters.has(letter) && 'active',
                  !availableLetters.has(letter) && 'disabled'
                )}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:flex md:items-start md:gap-6">
        {/* Desktop/Tablet Alphabet Index (left sticky) */}
        <div className="hidden md:block md:w-12 shrink-0">
          <div className="sticky top-28">
            <div className="glass-panel alphabet-index max-h-[calc(100vh-180px)] overflow-y-auto">
              <button
                onClick={scrollToTop}
                aria-label="Revenir en haut de la liste"
                className="alphabet-letter h-8 w-8 text-[10px] uppercase tracking-wide"
              >
                Tous
              </button>
              {alphabetWithHash.map((letter) => (
                <button
                  key={letter}
                  onClick={() => scrollToSection(letter)}
                  disabled={!availableLetters.has(letter)}
                  aria-label={`Aller a la section ${letter}`}
                  className={cn(
                    'alphabet-letter h-8 w-8 text-xs',
                    activeSection === letter && availableLetters.has(letter) && 'active',
                    !availableLetters.has(letter) && 'disabled'
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:flex-1">
        {/* Empty State */}
        {filteredConsultants.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 mx-auto mb-4">
              <Users className="h-8 w-8 text-teal" />
            </div>
            <h4 className="text-lg font-semibold text-charcoal mb-2">
              Aucun consultant
            </h4>
            <p className="text-sm text-warmgray mb-4">
              {search ? 'Aucun consultant ne correspond a votre recherche.' : 'Commencez par ajouter votre premier consultant.'}
            </p>
            <Link href="/consultants/new">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                Creer un consultant
              </Button>
            </Link>
          </div>
        )}

        {/* Alphabetical Sections */}
        {filteredConsultants.length > 0 && (
          <div className="space-y-8">
            {[...alphabet, '#'].map((letter) => {
              const sectionConsultants = groupedConsultants[letter] ?? [];
              if (sectionConsultants.length === 0) return null;

              return (
                <section
                  key={letter}
                  id={`section-${letter}`}
                  ref={(el) => {
                    if (el) sectionsRef.current.set(letter, el);
                  }}
                  className="scroll-mt-32"
                >
                  {/* Giant Letter */}
                  <div className="section-letter">{letter}</div>

                  {/* Consultant Cards Grid */}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sectionConsultants.map((consultant) => {
                      const meta = consultantMeta[consultant.id] ?? {};
                      const isPremium = consultant.is_premium || consultant.status === 'premium';
                      const isActive = consultant.activated !== false;
                      const lastContact = meta.lastConsultation
                        ? new Date(meta.lastConsultation).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                        : 'Aucun RDV';
                      const planLabel = meta.planStatus
                        ? meta.planStatus === 'shared'
                          ? 'Programme partage'
                          : 'Bilan en brouillon'
                        : 'Programme non defini';
                      const progress = meta.progress ?? 0;

                      return (
                        <Link
                          key={consultant.id}
                          href={`/consultants/${consultant.id}`}
                          className="consultant-card block"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={getDisplayName(consultant)} size="md" />
                              <div>
                                <div className="text-base font-semibold text-charcoal">
                                  {getDisplayName(consultant)}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-warmgray">
                                  <span className={cn('status-dot', !isActive && 'inactive')} />
                                  {isActive ? 'Actif' : 'Inactif'}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide',
                                isPremium ? 'badge-premium' : 'badge-standard'
                              )}>
                                {isPremium ? 'Premium' : 'Standard'}
                              </span>
                              {meta.unreadMessages && meta.unreadMessages > 0 && (
                                <span className="message-badge flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {meta.unreadMessages}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Meta Info */}
                          <div className="space-y-2 text-sm text-warmgray mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>Dernier RDV : <span className="text-charcoal">{lastContact}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 flex-shrink-0" />
                              <span>Programme : <span className="text-charcoal">{planLabel}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-xs text-charcoal">{progress}%</span>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/20">
                            <span className="text-xs text-warmgray">
                              {consultant.city || 'Ville non renseignee'}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-medium text-teal">
                              Voir dossier
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Pending Invitations */}
        {filteredInvitations.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              INVITATIONS EN ATTENTE ({filteredInvitations.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredInvitations.map((invitation) => {
                const isExpired = invitation.code_expires_at
                  ? new Date(invitation.code_expires_at) < new Date()
                  : false;
                const canOpen = Boolean(invitation.consultant_id);
                const handleOpenInvitation = () => {
                  if (!invitation.consultant_id) {
                    setToast({
                      title: 'Fiche indisponible',
                      description: 'La fiche sera disponible apres l\'activation du compte.',
                      variant: 'info'
                    });
                    return;
                  }
                  router.push(`/consultants/${invitation.consultant_id}`);
                };

                return (
                  <div
                    key={invitation.id}
                    className={cn(
                      'glass-card p-5 transition',
                      canOpen && 'cursor-pointer hover:shadow-md'
                    )}
                    onClick={handleOpenInvitation}
                    onKeyDown={(event) => {
                      if (!canOpen) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenInvitation();
                      }
                    }}
                    role={canOpen ? 'button' : undefined}
                    tabIndex={canOpen ? 0 : undefined}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-charcoal">
                          {getDisplayName(invitation)}
                        </h3>
                        <p className="text-xs text-warmgray">
                          {invitation.city || 'Ville non renseignee'}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold',
                        isExpired ? 'badge-info' : 'badge-urgent'
                      )}>
                        {isExpired ? 'Expire' : 'En attente'}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-warmgray">
                        <Mail className="h-4 w-4" />
                        <span className="text-teal">{invitation.email}</span>
                      </div>
                      {invitation.phone && (
                        <div className="flex items-center gap-2 text-warmgray">
                          <Phone className="h-4 w-4" />
                          <span className="text-teal">{invitation.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-warmgray">
                        <Calendar className="h-4 w-4" />
                        <span>Invite le : <span className="text-charcoal">
                          {new Date(invitation.invited_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-white/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
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
                    {!canOpen && (
                      <div className="mt-3 text-xs text-warmgray">
                        Fiche indisponible tant que le consultant n&apos;a pas active son compte.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        </div>
      </div>

      {/* Toast */}
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
