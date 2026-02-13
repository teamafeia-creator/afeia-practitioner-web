'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Users } from 'lucide-react';
import { getAppointmentsForRange } from '@/lib/queries/appointments';
import { getGroupSessionsForRange } from '@/lib/queries/group-sessions';
import type { Appointment, GroupSession } from '@/lib/types';

moment.locale('fr');
const localizer = momentLocalizer(moment);

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment | GroupSession;
  color: string;
  isCancelled: boolean;
  isGroupSession: boolean;
};

interface AgendaViewProps {
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  refreshKey: number;
}

const messages = {
  allDay: 'Journee',
  previous: 'Precedent',
  next: 'Suivant',
  today: "Aujourd'hui",
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Liste',
  date: 'Date',
  time: 'Heure',
  event: 'Seance',
  noEventsInRange: 'Aucune seance sur cette periode',
  showMore: (total: number) => `+ ${total} de plus`,
};

function getEventName(appointment: Appointment): string {
  const patient = appointment.patient;
  if (!patient) return appointment.booking_name || 'Seance';
  return patient.name || [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Consultant';
}

export function AgendaView({ onSelectEvent, onSelectSlot, refreshKey }: AgendaViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupSessions, setGroupSessions] = useState<(GroupSession & { registration_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.WEEK);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Switch to day view on mobile
  useEffect(() => {
    if (isMobile && currentView === Views.WEEK) {
      setCurrentView(Views.DAY);
    }
  }, [isMobile, currentView]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate range based on view
      const start = moment(currentDate).startOf(currentView === Views.DAY ? 'day' : 'week').toDate();
      const end = moment(currentDate).endOf(currentView === Views.DAY ? 'day' : 'week').toDate();

      // Add buffer for agenda view
      const rangeStart = moment(start).subtract(1, 'day').toISOString();
      const rangeEnd = moment(end).add(1, 'day').toISOString();

      const [appointmentsData, groupSessionsData] = await Promise.all([
        getAppointmentsForRange(rangeStart, rangeEnd),
        getGroupSessionsForRange(rangeStart, rangeEnd),
      ]);

      setAppointments(appointmentsData);
      setGroupSessions(groupSessionsData);
    } catch (err) {
      console.error('Error loading agenda data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, currentView]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const events: CalendarEvent[] = useMemo(() => {
    const appointmentEvents: CalendarEvent[] = appointments.map((apt) => ({
      id: apt.id,
      title: getEventName(apt),
      start: new Date(apt.starts_at),
      end: new Date(apt.ends_at),
      resource: apt,
      color: apt.consultation_type?.color || '#4CAF50',
      isCancelled: apt.status === 'cancelled' || apt.status === 'rescheduled',
      isGroupSession: false,
    }));

    const groupEvents: CalendarEvent[] = groupSessions.map((gs) => ({
      id: gs.id,
      title: `${gs.title} (${gs.registration_count}/${gs.max_participants})`,
      start: new Date(gs.starts_at),
      end: new Date(gs.ends_at),
      resource: gs,
      color: gs.consultation_type?.color || '#2196F3',
      isCancelled: gs.status === 'cancelled',
      isGroupSession: true,
    }));

    return [...appointmentEvents, ...groupEvents];
  }, [appointments, groupSessions]);

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isPast = event.end < new Date();
      const resourceStatus = 'status' in event.resource ? (event.resource as { status: string }).status : '';
      const isActive = ['scheduled', 'confirmed', 'in_progress'].includes(resourceStatus);
      const needsNotes = isPast && isActive && !event.isGroupSession;

      return {
        style: {
          backgroundColor: event.isCancelled ? '#e5e5e5' : event.color,
          borderColor: event.isCancelled ? '#9ca3af' : event.color,
          color: event.isCancelled ? '#6b7280' : '#fff',
          opacity: event.isCancelled ? 0.5 : 1,
          textDecoration: event.isCancelled ? 'line-through' : 'none',
          borderRadius: '6px',
          border: needsNotes
            ? '2px solid #f59e0b'
            : event.isGroupSession
              ? `2px dashed ${event.isCancelled ? '#9ca3af' : event.color}`
              : 'none',
          fontSize: '12px',
          padding: '2px 6px',
        },
      };
    },
    []
  );

  const CustomEvent = useCallback(
    ({ event }: { event: CalendarEvent }) => {
      if (event.isGroupSession) {
        const gs = event.resource as GroupSession;
        const typeName = gs.consultation_type?.name || '';
        return (
          <div className="leading-tight">
            <div className="font-medium truncate flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              {event.title}
            </div>
            <div className="text-[10px] opacity-80 truncate">
              {typeName}
            </div>
          </div>
        );
      }

      const apt = event.resource as Appointment;
      const typeName = apt.consultation_type?.name || '';
      const isVideo = apt.location_type === 'video';

      return (
        <div className="leading-tight">
          <div className="font-medium truncate">{event.title}</div>
          <div className="text-[10px] opacity-80 truncate">
            {typeName}
            {isVideo && ' · Visio'}
            {apt.patient?.is_premium && ' · Premium'}
          </div>
        </div>
      );
    },
    []
  );

  const availableViews = isMobile ? [Views.DAY, Views.AGENDA] : [Views.WEEK, Views.DAY, Views.AGENDA];

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <div className="text-stone text-sm">Chargement...</div>
        </div>
      )}
      <div className="agenda-calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={currentView as 'week' | 'day' | 'agenda'}
          views={availableViews}
          onView={(view) => setCurrentView(view)}
          onNavigate={(date) => setCurrentDate(date)}
          onSelectEvent={(event) => onSelectEvent(event as CalendarEvent)}
          onSelectSlot={onSelectSlot}
          selectable
          step={15}
          timeslots={4}
          min={new Date(2025, 0, 1, 7, 0)}
          max={new Date(2025, 0, 1, 21, 0)}
          messages={messages}
          eventPropGetter={eventStyleGetter as never}
          components={{
            event: CustomEvent as never,
          }}
          formats={{
            dayHeaderFormat: (date: Date) => moment(date).format('dddd D MMMM'),
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
              `Semaine du ${moment(start).format('D')} au ${moment(end).format('D MMMM YYYY')}`,
            agendaDateFormat: (date: Date) => moment(date).format('ddd D MMM'),
            agendaTimeFormat: (date: Date) => moment(date).format('HH:mm'),
            agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
          }}
          style={{ minHeight: isMobile ? 500 : 700 }}
          popup
          showMultiDayTimes
        />
      </div>
    </div>
  );
}
