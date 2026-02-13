'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
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
}

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'in_person', label: 'Au cabinet' },
  { value: 'video', label: 'Visio' },
  { value: 'phone', label: 'Telephone' },
  { value: 'home_visit', label: 'A domicile' },
];

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 22; h++) {
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
  return date.toISOString().split('T')[0];
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
}: AppointmentFormProps) {
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);

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
      const [typesResult, consultantsResult] = await Promise.all([
        getConsultationTypes(),
        supabase
          .from('consultants')
          .select('id, name, first_name, last_name, email')
          .is('deleted_at', null)
          .order('name'),
      ]);

      setConsultationTypes(typesResult.filter((t) => t.is_active));
      setConsultants((consultantsResult.data || []) as ConsultantOption[]);
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
        consultation_type_id: '',
        date: formatDateInput(date),
        start_time: startTime,
        end_time: addMinutes(startTime, 60),
        location_type: 'in_person',
        video_link: '',
        notes_internal: '',
      });
    }
  }, [isOpen, editAppointment, defaultDate, defaultConsultantId]);

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
    const startsAt = `${form.date}T${form.start_time}:00`;
    const endsAt = `${form.date}T${form.end_time}:00`;
    const conflict = await checkAppointmentConflict(startsAt, endsAt, editAppointment?.id);
    setConflictWarning(conflict);
  }, [form.date, form.start_time, form.end_time, editAppointment?.id]);

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
    if (!form.consultant_id) {
      showToast.error('Veuillez selectionner un consultant');
      return;
    }
    if (!form.consultation_type_id) {
      showToast.error('Veuillez selectionner un type de seance');
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.start_time}:00`).toISOString();
      const endsAt = new Date(`${form.date}T${form.end_time}:00`).toISOString();

      let result: Appointment;
      if (editAppointment) {
        result = await updateNativeAppointment(editAppointment.id, {
          consultant_id: form.consultant_id,
          consultation_type_id: form.consultation_type_id,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          video_link: form.video_link || null,
          notes_internal: form.notes_internal || null,
        });
        showToast.success('Seance modifiee');
      } else {
        result = await createNativeAppointment({
          consultant_id: form.consultant_id,
          consultation_type_id: form.consultation_type_id,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          video_link: form.video_link || null,
          notes_internal: form.notes_internal || null,
        });
        const consultantName = selectedConsultant ? getConsultantDisplayName(selectedConsultant) : 'le consultant';
        showToast.success(`Seance creee avec ${consultantName}`);
      }

      onSaved(result);
      onClose();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editAppointment ? 'Modifier la seance' : 'Nouvelle seance'}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Consultant selection */}
        <div>
          <span className="text-[13px] font-medium text-stone">Consultant *</span>
          <div className="mt-1">
            {form.consultant_id && selectedConsultant ? (
              <div className="flex items-center justify-between p-3 bg-sage-light/50 rounded-lg ring-1 ring-sage/20">
                <div>
                  <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(selectedConsultant)}</div>
                  {selectedConsultant.email && (
                    <div className="text-xs text-stone">{selectedConsultant.email}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, consultant_id: '' }));
                    setShowSearch(true);
                  }}
                  className="text-xs text-sage hover:underline"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
                  <input
                    type="text"
                    placeholder="Rechercher un consultant..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    className="w-full rounded-sm border border-sage/20 bg-white/50 pl-10 pr-3.5 py-2.5 text-sm text-charcoal placeholder:text-stone/80 transition duration-200 focus:border-sage focus:outline-none focus:ring-[3px] focus:ring-sage/10"
                  />
                </div>
                {showSearch && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded-lg shadow-lg ring-1 ring-black/5">
                    {filteredConsultants.length === 0 ? (
                      <div className="p-3 text-sm text-stone">Aucun consultant trouve</div>
                    ) : (
                      filteredConsultants.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, consultant_id: c.id }));
                            setSearchQuery('');
                            setShowSearch(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-sage-light/50 transition-colors"
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
        </div>

        {/* Consultation type */}
        <Select
          label="Type de seance *"
          value={form.consultation_type_id}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="">-- Choisir --</option>
          {consultationTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name} ({ct.duration_minutes} min
              {ct.price_cents != null ? ` · ${(ct.price_cents / 100).toFixed(0)}€` : ''})
            </option>
          ))}
        </Select>

        {/* Date & Time */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Select
            label="Debut *"
            value={form.start_time}
            onChange={(e) => {
              const ct = consultationTypes.find((t) => t.id === form.consultation_type_id);
              setForm((f) => ({
                ...f,
                start_time: e.target.value,
                end_time: ct ? addMinutes(e.target.value, ct.duration_minutes) : f.end_time,
              }));
            }}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select
            label="Fin"
            value={form.end_time}
            onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>

        {conflictWarning && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            Attention : ce creneau chevauche un rendez-vous existant.
          </div>
        )}

        {/* Location */}
        <Select
          label="Lieu"
          value={form.location_type}
          onChange={(e) => setForm((f) => ({ ...f, location_type: e.target.value as LocationType }))}
        >
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        {form.location_type === 'video' && (
          <Input
            label="Lien visio"
            type="url"
            value={form.video_link}
            onChange={(e) => setForm((f) => ({ ...f, video_link: e.target.value }))}
            placeholder="https://meet.google.com/..."
          />
        )}

        {/* Notes */}
        <div>
          <span className="text-[13px] font-medium text-stone">Notes internes</span>
          <Textarea
            value={form.notes_internal}
            onChange={(e) => setForm((f) => ({ ...f, notes_internal: e.target.value }))}
            placeholder="Notes reservees au praticien..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {editAppointment ? 'Enregistrer' : 'Creer la seance'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
