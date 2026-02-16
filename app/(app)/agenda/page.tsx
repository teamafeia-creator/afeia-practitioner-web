'use client';

import { useState, useCallback } from 'react';
import { Plus, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toaster } from '@/components/ui/Toaster';
import { useRequireAuth } from '@/hooks/useAuth';
import { AgendaView } from './components/AgendaView';
import type { CalendarEvent } from './components/AgendaView';
import { AppointmentForm } from './components/AppointmentForm';
import { AppointmentDetail } from './components/AppointmentDetail';
import { GroupSessionForm } from './components/GroupSessionForm';
import { GroupSessionDetail } from './components/GroupSessionDetail';
import { linkReschedule } from '@/lib/queries/appointments';
import { triggerWaitlistNotification } from '@/lib/waitlist-trigger';
import { showToast } from '@/components/ui/Toaster';
import type { Appointment, GroupSession } from '@/lib/types';

export default function AgendaPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const [refreshKey, setRefreshKey] = useState(0);

  // Appointment states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Group session states
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupDetailOpen, setGroupDetailOpen] = useState(false);
  const [selectedGroupSession, setSelectedGroupSession] = useState<GroupSession | null>(null);
  const [editGroupSession, setEditGroupSession] = useState<GroupSession | null>(null);

  // Dropdown menu state
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  function handleSelectEvent(event: CalendarEvent) {
    if (event.isGroupSession) {
      setSelectedGroupSession(event.resource as GroupSession);
      setGroupDetailOpen(true);
    } else {
      setSelectedAppointment(event.resource as Appointment);
      setDetailOpen(true);
    }
  }

  function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    setDefaultDate(slotInfo.start);
    setEditAppointment(null);
    setIsRescheduling(false);
    setFormOpen(true);
  }

  function handleCreateAppointment() {
    setDefaultDate(null);
    setEditAppointment(null);
    setIsRescheduling(false);
    setFormOpen(true);
    setShowCreateMenu(false);
  }

  function handleCreateGroupSession() {
    setEditGroupSession(null);
    setGroupFormOpen(true);
    setShowCreateMenu(false);
  }

  function handleEditAppointment(appointment: Appointment) {
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

  function handleEditGroupSession(session: GroupSession) {
    setEditGroupSession(session);
    setGroupDetailOpen(false);
    setGroupFormOpen(true);
  }

  async function handleFormSaved(appointment: Appointment) {
    if (isRescheduling && editAppointment) {
      try {
        // Link the already-created appointment as the reschedule of the old one
        // (the form already created the new appointment via createNativeAppointment)
        await linkReschedule(editAppointment.id, appointment.id);
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

        {/* Create dropdown */}
        <div className="relative">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateMenu(!showCreateMenu)}
          >
            Nouveau
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black/5 z-30">
                <button
                  onClick={handleCreateAppointment}
                  className="w-full text-left px-4 py-3 text-sm text-charcoal hover:bg-sage-light/50 rounded-t-lg transition-colors"
                >
                  <div className="font-medium">Seance individuelle</div>
                  <div className="text-xs text-stone">Rendez-vous 1:1</div>
                </button>
                <button
                  onClick={handleCreateGroupSession}
                  className="w-full text-left px-4 py-3 text-sm text-charcoal hover:bg-sage-light/50 rounded-b-lg transition-colors"
                >
                  <div className="font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Atelier
                  </div>
                  <div className="text-xs text-stone">Seance collective</div>
                </button>
              </div>
            </>
          )}
        </div>
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
        onClick={handleCreateAppointment}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-sage text-white shadow-lg flex items-center justify-center hover:bg-sage-deep transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Appointment Forms & Detail */}
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
        onEdit={handleEditAppointment}
        onReschedule={handleReschedule}
        onUpdated={refresh}
      />

      {/* Group Session Forms & Detail */}
      <GroupSessionForm
        isOpen={groupFormOpen}
        onClose={() => {
          setGroupFormOpen(false);
          setEditGroupSession(null);
        }}
        onSaved={refresh}
        editSession={editGroupSession}
        defaultDate={defaultDate}
      />

      <GroupSessionDetail
        session={selectedGroupSession}
        isOpen={groupDetailOpen}
        onClose={() => {
          setGroupDetailOpen(false);
          setSelectedGroupSession(null);
        }}
        onEdit={handleEditGroupSession}
        onUpdated={refresh}
      />
    </div>
  );
}
