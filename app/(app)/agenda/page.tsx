'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toaster } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { AgendaView } from './components/AgendaView';
import { AppointmentForm } from './components/AppointmentForm';
import { AppointmentDetail } from './components/AppointmentDetail';
import { rescheduleAppointment } from '@/lib/queries/appointments';
import { triggerWaitlistNotification } from '@/lib/waitlist-trigger';
import { showToast } from '@/components/ui/Toaster';
import type { Appointment, LocationType } from '@/lib/types';

export default function AgendaPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  function handleSelectEvent(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setDetailOpen(true);
  }

  function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    setDefaultDate(slotInfo.start);
    setEditAppointment(null);
    setIsRescheduling(false);
    setFormOpen(true);
  }

  function handleCreateNew() {
    setDefaultDate(null);
    setEditAppointment(null);
    setIsRescheduling(false);
    setFormOpen(true);
  }

  function handleEdit(appointment: Appointment) {
    setEditAppointment(appointment);
    setIsRescheduling(false);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function handleReschedule(appointment: Appointment) {
    setEditAppointment(appointment);
    setIsRescheduling(true);
    setDetailOpen(false);
    setFormOpen(true);
  }

  async function handleFormSaved(appointment: Appointment) {
    if (isRescheduling && editAppointment) {
      try {
        await rescheduleAppointment(editAppointment.id, {
          starts_at: appointment.starts_at,
          ends_at: appointment.ends_at,
          consultant_id: appointment.consultant_id,
          consultation_type_id: appointment.consultation_type_id,
          location_type: appointment.location_type as LocationType,
          video_link: appointment.video_link,
          notes_internal: appointment.notes_internal,
        });
        // Fire-and-forget: notify waitlist entries about the old freed slot
        triggerWaitlistNotification(editAppointment.id);
        showToast.success('Seance reportee');
      } catch {
        // The appointment was already created, just refresh
      }
    }
    refresh();
  }

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center text-stone">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>Agenda</h1>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreateNew}
        >
          Nouvelle seance
        </Button>
      </div>

      {/* Calendar */}
      <div className="glass-card p-2 sm:p-4">
        <AgendaView
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          refreshKey={refreshKey}
        />
      </div>

      {/* Floating mobile button */}
      <button
        onClick={handleCreateNew}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-sage text-white shadow-lg flex items-center justify-center hover:bg-sage-deep transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Forms & Detail */}
      <AppointmentForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditAppointment(null);
          setIsRescheduling(false);
        }}
        onSaved={handleFormSaved}
        editAppointment={isRescheduling ? null : editAppointment}
        defaultDate={defaultDate}
        defaultConsultantId={isRescheduling && editAppointment ? editAppointment.consultant_id : null}
      />

      <AppointmentDetail
        appointment={selectedAppointment}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedAppointment(null);
        }}
        onEdit={handleEdit}
        onReschedule={handleReschedule}
        onUpdated={refresh}
      />
    </div>
  );
}
