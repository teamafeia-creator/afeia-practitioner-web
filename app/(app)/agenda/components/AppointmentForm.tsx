'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { ConsultationTypeForm, durationLabel, priceLabel } from '@/components/agenda/ConsultationTypeForm';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import {
  getConsultationTypes,
  createNativeAppointment,
  updateNativeAppointment,
  checkAppointmentConflict,
} from '@/lib/queries/appointments';
import type { Appointment, ConsultationType, LocationType } from '@/lib/types';

type ConsultantOption = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

function getConsultantDisplayName(c: ConsultantOption): string {
  if (c.name) return c.name;
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Consultant';
}

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
  editAppointment?: Appointment | null;
  defaultDate?: Date | null;
  defaultConsultantId?: string | null;
  /** Proposition à une personne de la liste d'attente. */
  proposal?: { firstName: string; email: string; phone: string | null; typeId: string | null } | null;
  /** Report d'une séance existante : titre adapté. */
  rescheduling?: boolean;
}

const LOCATION_LABELS: Record<LocationType, string> = {
  in_person: 'Au cabinet',
  video: 'En visio',
  phone: 'Par téléphone',
  home_visit: 'À domicile',
};

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hmLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

function formatTimeFromDate(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = (Math.round(date.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function AppointmentForm({
  isOpen,
  onClose,
  onSaved,
  editAppointment,
  defaultDate,
  defaultConsultantId,
  proposal,
  rescheduling,
}: AppointmentFormProps) {
  const [addingType, setAddingType] = useState(false);
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);
  const [videoProvider, setVideoProvider] = useState<'external' | 'daily'>('external');

  const [form, setForm] = useState({
    consultant_id: '' as string,
    consultation_type_id: '' as string,
    date: formatDateInput(new Date()),
    start_time: '09:00',
    end_time: '10:00',
    location_type: 'in_person' as LocationType,
    video_link: '',
    notes_internal: '',
  });

  // Load consultants and types
  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      const [typesResult, consultantsResult, practitionerResult] = await Promise.all([
        getConsultationTypes(),
        supabase
          .from('consultants')
          .select('id, name, first_name, last_name, email')
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('practitioners')
          .select('video_provider')
          .limit(1)
          .single(),
      ]);

      setConsultationTypes(typesResult.filter((t) => t.is_active));
      setConsultants((consultantsResult.data || []) as ConsultantOption[]);
      if (practitionerResult.data?.video_provider) {
        setVideoProvider(practitionerResult.data.video_provider as 'external' | 'daily');
      }
    }

    load();
  }, [isOpen]);

  // Pre-fill form
  useEffect(() => {
    if (!isOpen) return;

    if (editAppointment) {
      const start = new Date(editAppointment.starts_at);
      const end = new Date(editAppointment.ends_at);
      setForm({
        consultant_id: editAppointment.consultant_id || '',
        consultation_type_id: editAppointment.consultation_type_id || '',
        date: formatDateInput(start),
        start_time: formatTimeFromDate(start),
        end_time: formatTimeFromDate(end),
        location_type: editAppointment.location_type || 'in_person',
        video_link: editAppointment.video_link || '',
        notes_internal: editAppointment.notes_internal || '',
      });
    } else {
      const date = defaultDate || new Date();
      const startTime = defaultDate ? formatTimeFromDate(date) : '09:00';
      setForm({
        consultant_id: defaultConsultantId || '',
        consultation_type_id: proposal?.typeId || '',
        date: formatDateInput(date),
        start_time: startTime,
        end_time: addMinutes(startTime, 60),
        location_type: 'in_person',
        video_link: '',
        notes_internal: '',
      });
    }
      setAddingType(false);
  }, [isOpen, editAppointment, defaultDate, defaultConsultantId, proposal]);

  // Liste d'attente : rattacher à un dossier existant si l'e-mail correspond
  useEffect(() => {
    if (!isOpen || !proposal || consultants.length === 0) return;
    const match = consultants.find((c) => c.email && c.email.toLowerCase() === proposal.email.toLowerCase());
    if (match) setForm((f) => (f.consultant_id ? f : { ...f, consultant_id: match.id }));
  }, [isOpen, proposal, consultants]);

  // Type par défaut : le premier type actif
  useEffect(() => {
    if (!isOpen || editAppointment || form.consultation_type_id || consultationTypes.length === 0) return;
    const first = consultationTypes[0];
    setForm((f) => ({ ...f, consultation_type_id: first.id, end_time: addMinutes(f.start_time, first.duration_minutes) }));
  }, [isOpen, editAppointment, form.consultation_type_id, consultationTypes]);

  // When consultation type changes, update end_time
  function handleTypeChange(typeId: string) {
    setForm((f) => {
      const ct = consultationTypes.find((t) => t.id === typeId);
      const endTime = ct ? addMinutes(f.start_time, ct.duration_minutes) : f.end_time;
      return { ...f, consultation_type_id: typeId, end_time: endTime };
    });
  }

  // Check conflict when dates change
  const checkConflict = useCallback(async () => {
    if (!form.date || !form.start_time || !form.end_time) return;
    const buffer = consultationTypes.find((t) => t.id === form.consultation_type_id)?.buffer_minutes ?? 0;
    const start = new Date(`${form.date}T${form.start_time}:00`);
    const end = new Date(`${form.date}T${form.end_time}:00`);
    start.setMinutes(start.getMinutes() - buffer);
    end.setMinutes(end.getMinutes() + buffer);
    const conflict = await checkAppointmentConflict(start.toISOString(), end.toISOString(), editAppointment?.id);
    setConflictWarning(conflict);
  }, [form.date, form.start_time, form.end_time, form.consultation_type_id, consultationTypes, editAppointment?.id]);

  useEffect(() => {
    if (isOpen) checkConflict();
  }, [checkConflict, isOpen]);

  const filteredConsultants = searchQuery
    ? consultants.filter(
        (c) =>
          getConsultantDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : consultants;

  const selectedConsultant = consultants.find((c) => c.id === form.consultant_id);

  async function handleSave() {
    if (!form.consultant_id && !proposal) {
      showToast.error('Choisissez un consultant.');
      return;
    }
    if (conflictWarning) {
      showToast.error('Ce créneau chevauche une séance existante (battement compris).');
      return;
    }
    if (!form.consultation_type_id) {
      showToast.error('Choisissez un type de séance.');
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.start_time}:00`).toISOString();
      const endsAt = new Date(`${form.date}T${form.end_time}:00`).toISOString();

      const videoLinkValue = videoProvider === 'daily' && form.location_type === 'video'
        ? null // Will be set by provision API
        : (form.video_link || null);

      let result: Appointment;
      if (editAppointment) {
        result = await updateNativeAppointment(editAppointment.id, {
          consultant_id: form.consultant_id,
          consultation_type_id: form.consultation_type_id,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          video_link: videoLinkValue,
          notes_internal: form.notes_internal || null,
        });
        showToast.success('Séance modifiée');
      } else {
        result = await createNativeAppointment({
          consultant_id: form.consultant_id || null,
          booking_name: form.consultant_id ? null : proposal?.firstName ?? null,
          booking_email: form.consultant_id ? null : proposal?.email ?? null,
          booking_phone: form.consultant_id ? null : proposal?.phone ?? null,
          consultation_type_id: form.consultation_type_id,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          video_link: videoLinkValue,
          notes_internal: form.notes_internal || null,
        });
        const consultantName = selectedConsultant ? getConsultantDisplayName(selectedConsultant) : proposal?.firstName ?? 'le consultant';
        showToast.success(`Séance créée avec ${consultantName}`);
      }

      // Provision Daily room for video appointments
      if (videoProvider === 'daily' && form.location_type === 'video' && !result.video_room_name) {
        try {
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;
          const provisionRes = await fetch('/api/video/provision', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ appointment_id: result.id }),
          });
          if (provisionRes.ok) {
            const provisionData = await provisionRes.json();
            result = { ...result, video_link: provisionData.video_link, video_room_name: provisionData.video_room_name };
          } else {
            showToast.error('La salle de visio n\'a pas pu être créée automatiquement. Vous pouvez ajouter un lien manuellement.');
          }
        } catch {
          showToast.error('La salle de visio n\'a pas pu être créée automatiquement.');
        }
      }

      // Clean up Daily room if location changed from video
      if (editAppointment?.video_room_name && form.location_type !== 'video') {
        try {
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;
          await fetch('/api/video/provision', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ appointment_id: editAppointment.id, action: 'delete' }),
          });
        } catch {
          // Best-effort cleanup
        }
      }

      onSaved(result);
      onClose();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const selectedType = consultationTypes.find((t) => t.id === form.consultation_type_id);
  const locations: LocationType[] = ['in_person', 'video'];
  if (!locations.includes(form.location_type)) locations.push(form.location_type);
  const fieldCls = 'h-11 w-full rounded-[10px] border border-divider bg-cream px-3 text-sm text-charcoal outline-none focus:border-sage';
  const title = proposal
    ? `Proposer un créneau à ${proposal.firstName}`
    : rescheduling
      ? 'Décaler la séance'
      : editAppointment
        ? 'Modifier la séance'
        : 'Nouvelle séance';
  const summary = selectedType
    ? `${selectedType.name} · ${hmLabel(form.start_time)} – ${hmLabel(form.end_time)} · ${priceLabel(selectedType.price_cents)} · ${LOCATION_LABELS[form.location_type].toLowerCase()}`
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="flex max-h-[65vh] flex-col gap-3.5 overflow-y-auto pr-1">
        {/* Consultant */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-stone">{proposal ? 'Personne' : 'Consultant'}</span>
          {proposal && !form.consultant_id ? (
            <div className="flex items-center justify-between rounded-[10px] border border-divider bg-cream p-3">
              <div>
                <div className="text-sm font-medium text-charcoal">{proposal.firstName}</div>
                <div className="text-xs text-stone">{proposal.email} · pas encore de dossier</div>
              </div>
              <button type="button" onClick={() => setShowSearch(true)} className="text-xs text-sage hover:text-sage-dark">
                Associer à un dossier
              </button>
            </div>
          ) : form.consultant_id && selectedConsultant ? (
            <div className="flex items-center justify-between rounded-[10px] border border-[#2F5A50] bg-sage-light/40 p-3">
              <div>
                <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(selectedConsultant)}</div>
                {selectedConsultant.email && <div className="text-xs text-stone">{selectedConsultant.email}</div>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, consultant_id: '' }));
                  setShowSearch(true);
                }}
                className="text-xs text-sage hover:text-sage-dark"
              >
                Changer
              </button>
            </div>
          ) : null}
          {(!form.consultant_id && (!proposal || showSearch)) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden="true" />
              <input
                type="text"
                aria-label="Rechercher un consultant"
                placeholder="Rechercher un consultant…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                className={`${fieldCls} pl-10`}
              />
              {showSearch && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-divider bg-surface shadow-lg">
                  {filteredConsultants.length === 0 ? (
                    <div className="p-3 text-sm text-stone">Aucun consultant trouvé</div>
                  ) : (
                    filteredConsultants.slice(0, 20).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, consultant_id: c.id }));
                          setSearchQuery('');
                          setShowSearch(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-surface-raised"
                      >
                        <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(c)}</div>
                        {c.email && <div className="text-xs text-stone">{c.email}</div>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type de séance */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] text-stone">
            Type de séance <span className="text-mist">· défini dans Paramètres › Types de séance</span>
          </legend>
          <div role="radiogroup" className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto">
            {consultationTypes.map((t) => {
              const on = t.id === form.consultation_type_id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => handleTypeChange(t.id)}
                  className="flex min-h-[52px] items-center gap-3 rounded-[10px] border px-3 py-2 text-left text-charcoal"
                  style={{ borderColor: on ? t.color : '#2A3140', background: on ? '#1C2230' : 'transparent' }}
                >
                  <span className="h-3 w-3 flex-none rounded" style={{ background: t.color }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-stone">
                      {durationLabel(t.duration_minutes)} · {priceLabel(t.price_cents)}
                      {t.buffer_minutes ? ` · ${t.buffer_minutes} min de battement` : ''}
                      {t.is_bookable_online ? '' : ' · non réservable en ligne'}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2"
                    style={{ borderColor: on ? '#6DD4B8' : '#5C6573' }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? '#6DD4B8' : 'transparent' }} />
                  </span>
                </button>
              );
            })}
          </div>
          {addingType ? (
            <ConsultationTypeForm
              existing={consultationTypes}
              onCancel={() => setAddingType(false)}
              onSaved={(ct) => {
                setConsultationTypes((list) => [...list, ct]);
                setAddingType(false);
                setForm((f) => ({ ...f, consultation_type_id: ct.id, end_time: addMinutes(f.start_time, ct.duration_minutes) }));
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingType(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-dashed border-divider text-sm font-medium text-sage hover:border-sage"
            >
              ＋ Ajouter un type de séance
            </button>
          )}
        </fieldset>

        {/* Lieu */}
        <div role="group" aria-label="Lieu" className="flex gap-1.5 rounded-xl border border-divider bg-cream p-1">
          {locations.map((loc) => {
            const on = form.location_type === loc;
            return (
              <button
                key={loc}
                type="button"
                aria-pressed={on}
                onClick={() => setForm((f) => ({ ...f, location_type: loc }))}
                className={`h-[38px] flex-1 rounded-lg text-sm font-medium ${on ? 'bg-sage-light text-sage' : 'text-charcoal'}`}
              >
                {LOCATION_LABELS[loc]}
              </button>
            );
          })}
        </div>

        {form.location_type === 'video' && (
          videoProvider === 'daily' ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-divider bg-cream p-3">
              <Video className="h-4 w-4 flex-shrink-0 text-sage" aria-hidden="true" />
              <span className="text-sm text-charcoal">
                {editAppointment?.video_link ? 'Salle de visio déjà créée.' : 'La salle de visio sera créée automatiquement.'}
              </span>
            </div>
          ) : (
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Lien visio
              <input
                type="url"
                value={form.video_link}
                onChange={(e) => setForm((f) => ({ ...f, video_link: e.target.value }))}
                placeholder="https://meet.google.com/…"
                className={fieldCls}
              />
            </label>
          )
        )}

        {/* Jour et heure */}
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Jour
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={fieldCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-stone">
            Heure
            <select
              value={form.start_time}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({ ...f, start_time: value, end_time: selectedType ? addMinutes(value, selectedType.duration_minutes) : f.end_time }));
              }}
              className={fieldCls}
            >
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{hmLabel(t)}</option>)}
            </select>
          </label>
        </div>
        {summary && <span className="text-[13px] text-stone">{summary}</span>}
        {conflictWarning && (
          <span role="alert" className="text-[13px] text-[#F2A3A3]">Ce créneau chevauche une séance existante (battement compris).</span>
        )}

        {/* Notes */}
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Notes internes <span className="text-mist">· visibles par vous seul·e</span>
          <textarea
            value={form.notes_internal}
            onChange={(e) => setForm((f) => ({ ...f, notes_internal: e.target.value }))}
            rows={2}
            className="w-full resize-y rounded-[10px] border border-divider bg-cream px-3 py-2.5 text-sm text-charcoal outline-none focus:border-sage"
          />
        </label>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={conflictWarning}>
          {editAppointment ? 'Enregistrer' : proposal ? 'Proposer ce créneau' : rescheduling ? 'Décaler la séance' : 'Créer la séance'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
