'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, MapPin, Video, Phone, Home, Clock, User,
  CheckCircle, XCircle, CalendarClock, FileText, AlertTriangle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import {
  cancelAppointment,
  completeAppointment,
} from '@/lib/queries/appointments';
import { triggerWaitlistNotification } from '@/lib/waitlist-trigger';
import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';

interface AppointmentDetailProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onUpdated: () => void;
}

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  home_visit: <Home className="h-4 w-4" />,
};

const LOCATION_LABELS: Record<string, string> = {
  in_person: 'Au cabinet',
  video: 'Visio',
  phone: 'Telephone',
  home_visit: 'A domicile',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifie',
  confirmed: 'Confirme',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
  rescheduled: 'Reporte',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-sage-light text-sage',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-neutral-100 text-neutral-600',
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

export function AppointmentDetail({
  appointment,
  isOpen,
  onClose,
  onEdit,
  onReschedule,
  onUpdated,
}: AppointmentDetailProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelledBy, setCancelledBy] = useState<'practitioner' | 'consultant'>('practitioner');
  const [processing, setProcessing] = useState(false);

  if (!appointment) return null;

  const patientName =
    appointment.patient?.name ||
    [appointment.patient?.first_name, appointment.patient?.last_name].filter(Boolean).join(' ') ||
    'Consultant';
  const patientId = appointment.patient?.id || appointment.consultant_id;
  const isPast = new Date(appointment.starts_at) < new Date();
  const isActive = ['scheduled', 'confirmed', 'in_progress'].includes(appointment.status);

  async function handleComplete() {
    setProcessing(true);
    try {
      await completeAppointment(appointment!.id);
      showToast.success('Seance marquee comme terminee');
      setShowCompletionPrompt(true);
      onUpdated();
    } catch (err) {
      showToast.error('Erreur lors de la completion');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    setProcessing(true);
    try {
      await cancelAppointment(appointment!.id, cancelReason || null, cancelledBy);
      // Fire-and-forget: notify waitlist entries about the freed slot
      triggerWaitlistNotification(appointment!.id);
      // Fire-and-forget: clean up Daily room if exists
      if (appointment!.video_room_name) {
        supabase.auth.getSession().then(({ data: sessionData }) => {
          const accessToken = sessionData.session?.access_token;
          if (accessToken) {
            fetch('/api/video/provision', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ appointment_id: appointment!.id, action: 'delete' }),
            }).catch(() => { /* best-effort */ });
          }
        });
      }
      showToast.success('Seance annulee');
      setShowCancelModal(false);
      onUpdated();
      onClose();
    } catch (err) {
      showToast.error('Erreur lors de l\'annulation');
    } finally {
      setProcessing(false);
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
                <h2 className="text-lg font-semibold text-charcoal">Detail de la seance</h2>
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[appointment.status] || ''}`}>
                    {STATUS_LABELS[appointment.status] || appointment.status}
                  </span>
                  {appointment.patient?.is_premium && (
                    <span className="badge-premium px-2 py-0.5 rounded-md text-xs font-semibold">
                      Premium
                    </span>
                  )}
                  {isPast && isActive && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Notes a rediger
                    </span>
                  )}
                </div>

                {/* Consultant */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-light">
                    <User className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (patientId) router.push(`/consultants/${patientId}`);
                      }}
                      className="text-sm font-semibold text-charcoal hover:text-sage transition-colors"
                    >
                      {patientName}
                    </button>
                    {appointment.patient?.email && (
                      <div className="text-xs text-stone">{appointment.patient.email}</div>
                    )}
                  </div>
                </div>

                {/* Type */}
                {appointment.consultation_type && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: appointment.consultation_type.color }}
                    />
                    <div className="text-sm text-charcoal">
                      {appointment.consultation_type.name}
                      {appointment.consultation_type.price_cents != null && (
                        <span className="text-stone ml-2">
                          {(appointment.consultation_type.price_cents / 100).toFixed(0)}€
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Date / Time */}
                <div className="flex items-center gap-3 text-sm text-charcoal">
                  <Clock className="h-4 w-4 text-stone" />
                  <div>
                    <div>{dateTimeFormatter.format(new Date(appointment.starts_at))}</div>
                    <div className="text-stone">
                      {timeFormatter.format(new Date(appointment.starts_at))} - {timeFormatter.format(new Date(appointment.ends_at))}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 text-sm text-charcoal">
                  {LOCATION_ICONS[appointment.location_type] || <MapPin className="h-4 w-4" />}
                  <span>{LOCATION_LABELS[appointment.location_type] || appointment.location_type}</span>
                </div>

                {appointment.video_room_name ? (
                  (() => {
                    const now = new Date();
                    const startsAt = new Date(appointment.starts_at);
                    const endsAt = new Date(appointment.ends_at);
                    const windowStart = new Date(startsAt.getTime() - 15 * 60 * 1000);
                    const windowEnd = new Date(endsAt.getTime() + 30 * 60 * 1000);
                    const isInWindow = now >= windowStart && now <= windowEnd;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-sage/10 text-sage">
                            <Video className="h-3 w-3" />
                            Visio integree
                          </span>
                        </div>
                        {isInWindow ? (
                          <Button
                            variant="primary"
                            className="w-full"
                            icon={<Video className="w-4 h-4" />}
                            onClick={() => window.open(`/consultation/video/${appointment.id}`, '_blank')}
                          >
                            Rejoindre la visio
                          </Button>
                        ) : (
                          <div className="text-xs text-stone bg-neutral-50 p-2 rounded-lg">
                            Le lien sera disponible 15 min avant le debut de la seance.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : appointment.video_link ? (
                  <a
                    href={appointment.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-sage hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir le lien visio
                  </a>
                ) : null}

                {/* Notes */}
                {appointment.notes_internal && (
                  <div>
                    <div className="text-xs font-medium text-stone uppercase tracking-wide mb-1">
                      Notes internes
                    </div>
                    <div className="text-sm text-charcoal bg-neutral-50 p-3 rounded-lg whitespace-pre-wrap">
                      {appointment.notes_internal}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isActive && (
                  <div className="space-y-2 pt-3 border-t border-neutral-100">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => onEdit(appointment)}
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
                      variant="outline"
                      className="w-full"
                      onClick={() => onReschedule(appointment)}
                      icon={<CalendarClock className="w-4 h-4" />}
                    >
                      Reporter
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
        title="Annuler la seance"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Etes-vous sur d&apos;annuler la seance du{' '}
            {dateTimeFormatter.format(new Date(appointment.starts_at))} avec {patientName} ?
          </p>

          <Select
            label="Annule par"
            value={cancelledBy}
            onChange={(e) => setCancelledBy(e.target.value as 'practitioner' | 'consultant')}
          >
            <option value="practitioner">Le praticien</option>
            <option value="consultant">Le consultant</option>
          </Select>

          <Textarea
            placeholder="Motif (optionnel)"
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

      {/* Completion prompt */}
      <Modal
        isOpen={showCompletionPrompt}
        onClose={() => {
          setShowCompletionPrompt(false);
          onClose();
        }}
        title="Seance terminee"
        size="sm"
      >
        <p className="text-sm text-neutral-600 mb-4">
          La seance avec {patientName} est terminee. Que souhaitez-vous faire ?
        </p>
        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setShowCompletionPrompt(false);
              onClose();
              if (patientId) router.push(`/consultants/${patientId}?tab=Notes+de+séance`);
            }}
            icon={<FileText className="w-4 h-4" />}
          >
            Rediger les notes de seance
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowCompletionPrompt(false);
              onClose();
              if (patientId) router.push(`/consultants/${patientId}?tab=Conseillancier`);
            }}
          >
            Creer/mettre a jour le conseillancier
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setShowCompletionPrompt(false);
              onClose();
            }}
          >
            Plus tard
          </Button>
        </div>
      </Modal>
    </>
  );
}
