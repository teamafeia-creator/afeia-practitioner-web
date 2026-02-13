'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, MapPin, Video, Home, Clock, Users,
  CheckCircle, XCircle, FileText, UserPlus, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import {
  getGroupSessionById,
  cancelGroupSession,
  completeGroupSession,
  addRegistration,
  updateRegistrationStatus,
} from '@/lib/queries/group-sessions';
import type { GroupSession, GroupSessionRegistration } from '@/lib/types';

interface GroupSessionDetailProps {
  session: GroupSession | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (session: GroupSession) => void;
  onUpdated: () => void;
}

type ConsultantOption = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  home_visit: <Home className="h-4 w-4" />,
};

const LOCATION_LABELS: Record<string, string> = {
  in_person: 'Au cabinet',
  video: 'Visio',
  home_visit: 'A domicile',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifie',
  confirmed: 'Confirme',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-sage-light text-sage',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const REG_STATUS_LABELS: Record<string, string> = {
  registered: 'Inscrit',
  confirmed: 'Confirme',
  attended: 'Present',
  no_show: 'Absent',
  cancelled: 'Annule',
};

const REG_STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-sage-light text-sage',
  attended: 'bg-green-100 text-green-800',
  no_show: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function GroupSessionDetail({
  session,
  isOpen,
  onClose,
  onEdit,
  onUpdated,
}: GroupSessionDetailProps) {
  const [fullSession, setFullSession] = useState<(GroupSession & { registrations: GroupSessionRegistration[] }) | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Add participant form
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search');
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '' });

  const loadSession = useCallback(async () => {
    if (!session?.id) return;
    const data = await getGroupSessionById(session.id);
    setFullSession(data);
  }, [session?.id]);

  useEffect(() => {
    if (isOpen && session?.id) {
      loadSession();
    }
  }, [isOpen, session?.id, loadSession]);

  useEffect(() => {
    if (!showAddParticipant) return;
    async function loadConsultants() {
      const { data } = await supabase
        .from('consultants')
        .select('id, name, first_name, last_name, email')
        .is('deleted_at', null)
        .order('name');
      setConsultants((data || []) as ConsultantOption[]);
    }
    loadConsultants();
  }, [showAddParticipant]);

  if (!session) return null;

  const displaySession = fullSession || session;
  const registrations = fullSession?.registrations || [];
  const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled');
  const isActive = ['scheduled', 'confirmed', 'in_progress'].includes(displaySession.status);
  const hasAttended = registrations.some((r) => r.status === 'attended');

  function getConsultantDisplayName(c: ConsultantOption): string {
    if (c.name) return c.name;
    const parts = [c.first_name, c.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Consultant';
  }

  const filteredConsultants = searchQuery
    ? consultants.filter(
        (c) =>
          getConsultantDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : consultants.slice(0, 10);

  async function handleComplete() {
    setProcessing(true);
    try {
      await completeGroupSession(displaySession.id);
      showToast.success('Seance marquee comme terminee');
      onUpdated();
      await loadSession();
    } catch {
      showToast.error('Erreur lors de la completion');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    setProcessing(true);
    try {
      await cancelGroupSession(displaySession.id, cancelReason || 'Annulee par le praticien');
      showToast.success('Seance annulee');
      setShowCancelModal(false);
      onUpdated();
      onClose();
    } catch {
      showToast.error('Erreur lors de l\'annulation');
    } finally {
      setProcessing(false);
    }
  }

  async function handleUpdateRegStatus(regId: string, status: 'attended' | 'no_show' | 'cancelled') {
    try {
      await updateRegistrationStatus(regId, status);
      showToast.success(
        status === 'attended' ? 'Marque present' :
        status === 'no_show' ? 'Marque absent' : 'Inscription annulee'
      );
      await loadSession();
      onUpdated();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleAddConsultant(consultant: ConsultantOption) {
    try {
      await addRegistration({
        group_session_id: displaySession.id,
        consultant_id: consultant.id,
        name: getConsultantDisplayName(consultant),
        email: consultant.email || '',
        source: 'manual',
      });
      showToast.success(`${getConsultantDisplayName(consultant)} inscrit`);
      setShowAddParticipant(false);
      setSearchQuery('');
      await loadSession();
      onUpdated();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleAddManual() {
    if (!manualForm.name.trim() || !manualForm.email.trim()) {
      showToast.error('Nom et email requis');
      return;
    }
    try {
      await addRegistration({
        group_session_id: displaySession.id,
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        phone: manualForm.phone.trim() || null,
        source: 'manual',
      });
      showToast.success(`${manualForm.name} inscrit`);
      setShowAddParticipant(false);
      setManualForm({ name: '', email: '', phone: '' });
      await loadSession();
      onUpdated();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-charcoal">Detail de l&apos;atelier</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[displaySession.status] || ''}`}>
                    {STATUS_LABELS[displaySession.status] || displaySession.status}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                    <Users className="h-3 w-3" />
                    Collectif
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base font-semibold text-charcoal">{displaySession.title}</h3>
                  {displaySession.description && (
                    <p className="text-sm text-stone mt-1">{displaySession.description}</p>
                  )}
                </div>

                {/* Type */}
                {displaySession.consultation_type && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: displaySession.consultation_type.color }}
                    />
                    <div className="text-sm text-charcoal">
                      {displaySession.consultation_type.name}
                      {displaySession.consultation_type.price_cents != null && (
                        <span className="text-stone ml-2">
                          {(displaySession.consultation_type.price_cents / 100).toFixed(0)}€ / pers.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Date / Time */}
                <div className="flex items-center gap-3 text-sm text-charcoal">
                  <Clock className="h-4 w-4 text-stone" />
                  <div>
                    <div>{dateTimeFormatter.format(new Date(displaySession.starts_at))}</div>
                    <div className="text-stone">
                      {timeFormatter.format(new Date(displaySession.starts_at))} - {timeFormatter.format(new Date(displaySession.ends_at))}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 text-sm text-charcoal">
                  {LOCATION_ICONS[displaySession.location_type] || <MapPin className="h-4 w-4" />}
                  <span>{LOCATION_LABELS[displaySession.location_type] || displaySession.location_type}</span>
                </div>

                {displaySession.location_details && (
                  displaySession.location_type === 'video' ? (
                    <a
                      href={displaySession.location_details}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sage hover:underline"
                    >
                      Ouvrir le lien visio
                    </a>
                  ) : (
                    <p className="text-sm text-stone">{displaySession.location_details}</p>
                  )
                )}

                {/* Participants counter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-stone uppercase tracking-wide">
                      Participants
                    </span>
                    <span className="text-sm font-medium text-charcoal">
                      {activeRegistrations.length} / {displaySession.max_participants}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (activeRegistrations.length / displaySession.max_participants) * 100)}%`,
                        backgroundColor: activeRegistrations.length >= displaySession.max_participants ? '#ef4444' : '#4CAF50',
                      }}
                    />
                  </div>
                </div>

                {/* Participants list */}
                {registrations.length > 0 && (
                  <div className="space-y-2">
                    {registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-3 rounded-lg border border-neutral-100 ${reg.status === 'cancelled' ? 'opacity-50' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-charcoal truncate">{reg.name}</div>
                          <div className="text-xs text-stone truncate">{reg.email}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${REG_STATUS_COLORS[reg.status] || ''}`}>
                            {REG_STATUS_LABELS[reg.status] || reg.status}
                          </span>
                          {isActive && (reg.status === 'registered' || reg.status === 'confirmed') && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateRegStatus(reg.id, 'attended')}
                                className="p-1 rounded text-green-600 hover:bg-green-50"
                                title="Marquer present"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateRegStatus(reg.id, 'no_show')}
                                className="p-1 rounded text-amber-600 hover:bg-amber-50"
                                title="Marquer absent"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateRegStatus(reg.id, 'cancelled')}
                                className="p-1 rounded text-neutral-400 hover:bg-neutral-50"
                                title="Annuler l'inscription"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add participant button */}
                {isActive && activeRegistrations.length < displaySession.max_participants && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowAddParticipant(true);
                      setAddMode('search');
                      setSearchQuery('');
                      setManualForm({ name: '', email: '', phone: '' });
                    }}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    Ajouter un participant
                  </Button>
                )}

                {/* Notes */}
                {displaySession.notes_internal && (
                  <div>
                    <div className="text-xs font-medium text-stone uppercase tracking-wide mb-1">
                      Notes internes
                    </div>
                    <div className="text-sm text-charcoal bg-neutral-50 p-3 rounded-lg whitespace-pre-wrap">
                      {displaySession.notes_internal}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isActive && (
                  <div className="space-y-2 pt-3 border-t border-neutral-100">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => onEdit(displaySession)}
                      icon={<FileText className="w-4 h-4" />}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="success"
                      className="w-full"
                      onClick={handleComplete}
                      loading={processing}
                      icon={<CheckCircle className="w-4 h-4" />}
                    >
                      Marquer comme terminee
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowCancelModal(true)}
                      icon={<XCircle className="w-4 h-4" />}
                    >
                      Annuler cette seance
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler la seance collective"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Etes-vous sur d&apos;annuler l&apos;atelier &quot;{displaySession?.title}&quot; ?
            {activeRegistrations.length > 0 && (
              <span className="block mt-1 text-amber-600">
                {activeRegistrations.length} participant(s) inscrit(s) seront impactes.
              </span>
            )}
          </p>
          <Textarea
            placeholder="Motif d'annulation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[60px]"
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowCancelModal(false)} disabled={processing}>
            Retour
          </Button>
          <Button variant="destructive" onClick={handleCancel} loading={processing}>
            Confirmer l&apos;annulation
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add participant modal */}
      <Modal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        title="Ajouter un participant"
        size="sm"
      >
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setAddMode('search')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'search' ? 'bg-sage-light text-sage' : 'bg-neutral-50 text-stone hover:bg-neutral-100'
              }`}
            >
              Consultant existant
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'manual' ? 'bg-sage-light text-sage' : 'bg-neutral-50 text-stone hover:bg-neutral-100'
              }`}
            >
              Saisie libre
            </button>
          </div>

          {addMode === 'search' ? (
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
                <input
                  type="text"
                  placeholder="Rechercher un consultant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-sm border border-sage/20 bg-white/50 pl-10 pr-3.5 py-2.5 text-sm text-charcoal placeholder:text-stone/80 transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredConsultants.length === 0 ? (
                  <div className="p-3 text-sm text-stone">Aucun consultant trouve</div>
                ) : (
                  filteredConsultants.slice(0, 15).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAddConsultant(c)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-sage-light/50 transition-colors"
                    >
                      <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(c)}</div>
                      {c.email && <div className="text-xs text-stone">{c.email}</div>}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Nom *"
                value={manualForm.name}
                onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nom complet"
              />
              <Input
                label="Email *"
                type="email"
                value={manualForm.email}
                onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemple.fr"
              />
              <Input
                label="Telephone"
                value={manualForm.phone}
                onChange={(e) => setManualForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
              />
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowAddParticipant(false)}>
            Annuler
          </Button>
          {addMode === 'manual' && (
            <Button variant="primary" onClick={handleAddManual}>
              Ajouter
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </>
  );
}
