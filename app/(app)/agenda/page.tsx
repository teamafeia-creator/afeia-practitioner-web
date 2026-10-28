'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { Modal } from '@/components/ui/Modal';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cancelAppointment, getAppointmentsForRange, getConsultationTypes, ensureDefaultConsultationTypes, linkReschedule } from '@/lib/queries/appointments';
import { getGroupSessionsForRange } from '@/lib/queries/group-sessions';
import { triggerWaitlistNotification } from '@/lib/waitlist-trigger';
import { ConsultationTypeForm } from '@/components/agenda/ConsultationTypeForm';
import type { Appointment, ConsultationType, GroupSession } from '@/lib/types';
import { AgendaGrid, addDays, sameDay, startOfWeek, type AgendaEvent, type AgendaView } from './components/AgendaGrid';
import { SelectedCard, TypesPanel, WaitlistPanel, type SelectedInfo, type WaitlistRow } from './components/SidePanels';
import { AppointmentForm } from './components/AppointmentForm';
import { AppointmentDetail } from './components/AppointmentDetail';
import { GroupSessionForm } from './components/GroupSessionForm';
import { GroupSessionDetail } from './components/GroupSessionDetail';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

type GroupWithCount = GroupSession & { registration_count: number };

function appointmentName(a: Appointment): string {
  const p = a.patient;
  if (!p) return a.booking_name || 'Séance';
  return p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Consultant';
}

function AgendaPageInner() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const router = useRouter();
  const params = useSearchParams();

  const [view, setView] = useState<AgendaView>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [types, setTypes] = useState<ConsultationType[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Formulaires
  const [formOpen, setFormOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [proposal, setProposal] = useState<WaitlistRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupDetailOpen, setGroupDetailOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<GroupSession | null>(null);
  const [typeModal, setTypeModal] = useState(false);

  // Vue Jour par défaut sur petit écran
  useEffect(() => {
    if (window.innerWidth < 768) setView('jour');
  }, []);

  // ?nouvelle=1 (bouton du tableau de bord)
  useEffect(() => {
    if (params.get('nouvelle') === '1') {
      setDefaultDate(null);
      setEditAppointment(null);
      setRescheduling(false);
      setProposal(null);
      setFormOpen(true);
      router.replace('/agenda');
    }
  }, [params, router]);

  const days = useMemo(() => {
    if (view === 'jour') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())];
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [view, anchor]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Séances de la période
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const start = days[0];
    const end = addDays(days[days.length - 1], 1);
    setLoading(true);
    Promise.all([
      getAppointmentsForRange(start.toISOString(), end.toISOString()).catch(() => [] as Appointment[]),
      getGroupSessionsForRange(start.toISOString(), end.toISOString()).catch(() => [] as GroupWithCount[]),
    ]).then(([apts, gs]) => {
      if (cancelled) return;
      setAppointments(apts.filter((a) => a.status !== 'rescheduled' && a.status !== 'cancelled'));
      setGroups((gs as GroupWithCount[]).filter((g) => g.status !== 'cancelled'));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, days, refreshKey]);

  // Types de séance et liste d'attente
  const loadSide = useCallback(async () => {
    try {
      await ensureDefaultConsultationTypes();
      const t = await getConsultationTypes();
      setTypes(t.filter((x) => x.is_active && !x.is_group));
    } catch {
      setTypes([]);
    }
    const { data, error } = await supabase
      .from('waitlist_entries')
      .select('*, consultation_type:consultation_types(name, color)')
      .is('fulfilled_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    if (!error) setWaitlist((data ?? []) as WaitlistRow[]);
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadSide();
  }, [isAuthenticated, loadSide, refreshKey]);

  const events: AgendaEvent[] = useMemo(() => {
    const now = Date.now();
    const a: AgendaEvent[] = appointments.map((apt) => ({
      id: apt.id,
      kind: 'appointment',
      start: new Date(apt.starts_at),
      end: new Date(apt.ends_at),
      name: appointmentName(apt),
      typeName: apt.consultation_type?.name ?? 'Séance',
      color: apt.consultation_type?.color || '#4CAF50',
      visio: apt.location_type === 'video',
      needsNotes: new Date(apt.ends_at).getTime() < now && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status) && !apt.notes_internal,
    }));
    const g: AgendaEvent[] = groups.map((gs) => ({
      id: gs.id,
      kind: 'group',
      start: new Date(gs.starts_at),
      end: new Date(gs.ends_at),
      name: `${gs.title} (${gs.registration_count}/${gs.max_participants})`,
      typeName: gs.consultation_type?.name ?? 'Atelier',
      color: gs.consultation_type?.color || '#2196F3',
      visio: gs.location_type === 'video',
    }));
    return [...a, ...g];
  }, [appointments, groups]);

  const selectedApt = appointments.find((a) => a.id === selectedId) ?? null;
  const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;
  const selected: SelectedInfo | null = selectedApt
    ? {
        id: selectedApt.id,
        kind: 'appointment',
        name: appointmentName(selectedApt),
        typeName: selectedApt.consultation_type?.name ?? 'Séance',
        color: selectedApt.consultation_type?.color || '#4CAF50',
        start: new Date(selectedApt.starts_at),
        end: new Date(selectedApt.ends_at),
        priceCents: selectedApt.consultation_type?.price_cents ?? null,
        visio: selectedApt.location_type === 'video',
        videoLink: selectedApt.video_link,
        consultantId: selectedApt.consultant_id,
      }
    : selectedGroup
      ? {
          id: selectedGroup.id,
          kind: 'group',
          name: selectedGroup.title,
          typeName: selectedGroup.consultation_type?.name ?? 'Atelier',
          color: selectedGroup.consultation_type?.color || '#2196F3',
          start: new Date(selectedGroup.starts_at),
          end: new Date(selectedGroup.ends_at),
          priceCents: null,
          visio: selectedGroup.location_type === 'video',
          videoLink: null,
          consultantId: null,
        }
      : null;

  // En-tête
  const isDay = view === 'jour';
  const ref = isDay ? days[0] : addDays(days[0], 3);
  const monthLabel = `${MONTHS[ref.getMonth()].charAt(0).toUpperCase()}${MONTHS[ref.getMonth()].slice(1)} ${ref.getFullYear()}`;
  const count = (d: Date[]) => events.filter((e) => d.some((x) => sameDay(e.start, x))).length;
  const n = (k: number) => `${k} séance${k > 1 ? 's' : ''}`;
  const s0 = days[0];
  const s1 = days[days.length - 1];
  const rangeLabel = isDay
    ? `${dayLong.format(s0)} · ${n(count(days))}`
    : `${s0.getDate()}${s0.getMonth() !== s1.getMonth() ? ` ${MS[s0.getMonth()]}` : ''} – ${s1.getDate()} ${MS[s1.getMonth()]} · ${n(count(days))}`;
  const isCurrent = days.some((d) => sameDay(d, new Date()));

  const move = (dir: number) => {
    setSelectedId(null);
    setAnchor((a) => addDays(a, dir * (isDay ? 1 : 7)));
  };

  const openNew = (date: Date | null) => {
    setDefaultDate(date);
    setEditAppointment(null);
    setRescheduling(false);
    setProposal(null);
    setFormOpen(true);
  };

  async function handleSaved(apt: Appointment) {
    if (rescheduling && editAppointment) {
      try {
        await linkReschedule(editAppointment.id, apt.id);
        triggerWaitlistNotification(editAppointment.id);
        showToast.success('Séance décalée');
      } catch {
        /* la nouvelle séance existe déjà */
      }
    }
    if (proposal) {
      await supabase.from('waitlist_entries').delete().eq('id', proposal.id);
      showToast.success(`${proposal.first_name} ne figure plus sur la liste d’attente`);
    }
    setSelectedId(apt.id);
    setAnchor(new Date(apt.starts_at));
    refresh();
  }

  if (authLoading) {
    return <div className="rounded-2xl border border-divider bg-surface p-8 text-center text-stone">Chargement…</div>;
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex max-w-[1180px] flex-col gap-[18px]">
      <Toaster />
      <section className="flex flex-wrap items-center gap-3">
        <h1 className="mr-2 font-serif text-[32px] font-medium text-charcoal">{monthLabel}</h1>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={isDay ? 'Jour précédent' : 'Semaine précédente'}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-divider text-charcoal hover:border-sage"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAnchor(new Date());
              setSelectedId(null);
            }}
            className={`h-10 rounded-[10px] border border-divider px-3.5 text-sm text-charcoal ${isCurrent ? 'bg-surface-raised' : ''}`}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={isDay ? 'Jour suivant' : 'Semaine suivante'}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-divider text-charcoal hover:border-sage"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>
        <span aria-live="polite" className="text-sm text-stone">{rangeLabel}</span>
        <span className="flex-1" />
        <div role="group" aria-label="Vue" className="flex gap-1 rounded-xl border border-divider bg-surface p-1">
          {([['jour', 'Jour'], ['semaine', 'Semaine'], ['liste', 'Liste']] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={view === k}
              onClick={() => setView(k)}
              className={`h-[34px] rounded-lg px-3 text-sm font-medium ${view === k ? 'bg-sage-light text-sage' : 'text-charcoal'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditGroup(null);
            setGroupFormOpen(true);
          }}
          className="flex h-11 items-center gap-2 rounded-[10px] border border-divider px-4 text-sm font-medium text-charcoal hover:border-sage"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Atelier
        </button>
        <button
          type="button"
          onClick={() => openNew(isDay ? new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate(), 9) : null)}
          className="h-11 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink hover:bg-sage-deep"
        >
          Nouvelle séance
        </button>
      </section>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_640px] overflow-x-auto rounded-2xl border border-divider bg-surface">
          <AgendaGrid
            view={view}
            days={view === 'liste' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)) : days}
            events={events}
            selectedId={selectedId}
            loading={loading}
            onSelect={(e) => setSelectedId((cur) => (cur === e.id ? null : e.id))}
            onOpenDay={(d) => {
              setAnchor(d);
              setView('jour');
            }}
            onSlot={(d) => openNew(d)}
          />
        </div>

        <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
          {selected && (
            <SelectedCard
              key={selected.id}
              sel={selected}
              onClose={() => setSelectedId(null)}
              onReschedule={() => {
                if (!selectedApt) return;
                setEditAppointment(selectedApt);
                setRescheduling(true);
                setProposal(null);
                setDefaultDate(new Date(selectedApt.starts_at));
                setFormOpen(true);
              }}
              onDetails={() => (selectedApt ? setDetailOpen(true) : setGroupDetailOpen(true))}
              onCancel={async () => {
                if (!selectedApt) return;
                try {
                  await cancelAppointment(selectedApt.id, null, 'practitioner');
                  triggerWaitlistNotification(selectedApt.id);
                  // Acompte payé en ligne : remboursé quand le praticien annule
                  const { data: sess } = await supabase.auth.getSession();
                  const refund = await fetch(`/api/appointments/${selectedApt.id}/refund-deposit`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${sess.session?.access_token ?? ''}` },
                  }).then((r) => r.json()).catch(() => null);
                  if (refund?.error) showToast.error(refund.error);
                  if (refund?.refunded) showToast.success('Acompte remboursé au consultant');
                  showToast.success(`Séance annulée · ${appointmentName(selectedApt)} a été prévenu·e`);
                  setSelectedId(null);
                  refresh();
                } catch (e) {
                  showToast.error(e instanceof Error ? e.message : 'La séance n’a pas pu être annulée.');
                }
              }}
            />
          )}
          <WaitlistPanel
            entries={waitlist}
            onPropose={(w) => {
              setProposal(w);
              setEditAppointment(null);
              setRescheduling(false);
              setDefaultDate(null);
              setFormOpen(true);
            }}
            onRemove={async (w) => {
              const { error } = await supabase.from('waitlist_entries').delete().eq('id', w.id);
              if (error) {
                showToast.error('Impossible de retirer cette personne.');
                return;
              }
              setWaitlist((list) => list.filter((x) => x.id !== w.id));
              showToast.success(`${w.first_name} ne figure plus sur la liste d’attente`);
            }}
          />
          <TypesPanel types={types} onAdd={() => setTypeModal(true)} />
        </aside>
      </div>

      <AppointmentForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditAppointment(null);
          setRescheduling(false);
          setProposal(null);
        }}
        onSaved={handleSaved}
        editAppointment={rescheduling ? null : editAppointment}
        defaultDate={defaultDate}
        defaultConsultantId={rescheduling && editAppointment ? editAppointment.consultant_id : null}
        rescheduling={rescheduling}
        proposal={proposal ? { firstName: proposal.first_name, email: proposal.email, phone: proposal.phone, typeId: proposal.consultation_type_id } : null}
      />

      <AppointmentDetail
        appointment={selectedApt}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(apt) => {
          setDetailOpen(false);
          setEditAppointment(apt);
          setRescheduling(false);
          setFormOpen(true);
        }}
        onReschedule={(apt) => {
          setDetailOpen(false);
          setEditAppointment(apt);
          setRescheduling(true);
          setFormOpen(true);
        }}
        onUpdated={refresh}
      />

      <GroupSessionForm
        isOpen={groupFormOpen}
        onClose={() => {
          setGroupFormOpen(false);
          setEditGroup(null);
        }}
        onSaved={refresh}
        editSession={editGroup}
        defaultDate={defaultDate}
      />

      <GroupSessionDetail
        session={selectedGroup}
        isOpen={groupDetailOpen}
        onClose={() => setGroupDetailOpen(false)}
        onEdit={(s) => {
          setGroupDetailOpen(false);
          setEditGroup(s);
          setGroupFormOpen(true);
        }}
        onUpdated={refresh}
      />

      <Modal isOpen={typeModal} onClose={() => setTypeModal(false)} title="Nouveau type de séance">
        <div className="p-1">
          <ConsultationTypeForm
            existing={types}
            onCancel={() => setTypeModal(false)}
            onSaved={(ct) => {
              setTypes((t) => [...t, ct]);
              setTypeModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={null}>
      <AgendaPageInner />
    </Suspense>
  );
}
