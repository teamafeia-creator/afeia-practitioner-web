'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { getConsultationTypes } from '@/lib/queries/appointments';
import { createGroupSession, updateGroupSession } from '@/lib/queries/group-sessions';
import type { GroupSession, ConsultationType } from '@/lib/types';

interface GroupSessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editSession?: GroupSession | null;
  defaultDate?: Date | null;
}

const LOCATION_OPTIONS: { value: 'in_person' | 'video' | 'home_visit'; label: string }[] = [
  { value: 'in_person', label: 'Au cabinet' },
  { value: 'video', label: 'Visio' },
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

export function GroupSessionForm({
  isOpen,
  onClose,
  onSaved,
  editSession,
  defaultDate,
}: GroupSessionFormProps) {
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    consultation_type_id: '' as string,
    title: '',
    description: '',
    date: formatDateInput(new Date()),
    start_time: '09:00',
    end_time: '11:00',
    location_type: 'in_person' as 'in_person' | 'video' | 'home_visit',
    location_details: '',
    max_participants: 10,
    notes_internal: '',
  });

  // Load group consultation types
  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      const types = await getConsultationTypes();
      setConsultationTypes(types.filter((t) => t.is_active && t.is_group));
    }

    load();
  }, [isOpen]);

  // Pre-fill form
  useEffect(() => {
    if (!isOpen) return;

    if (editSession) {
      const start = new Date(editSession.starts_at);
      const end = new Date(editSession.ends_at);
      setForm({
        consultation_type_id: editSession.consultation_type_id || '',
        title: editSession.title,
        description: editSession.description || '',
        date: formatDateInput(start),
        start_time: formatTimeFromDate(start),
        end_time: formatTimeFromDate(end),
        location_type: editSession.location_type,
        location_details: editSession.location_details || '',
        max_participants: editSession.max_participants,
        notes_internal: editSession.notes_internal || '',
      });
    } else {
      const date = defaultDate || new Date();
      const startTime = defaultDate ? formatTimeFromDate(date) : '09:00';
      setForm({
        consultation_type_id: '',
        title: '',
        description: '',
        date: formatDateInput(date),
        start_time: startTime,
        end_time: addMinutes(startTime, 120),
        location_type: 'in_person',
        location_details: '',
        max_participants: 10,
        notes_internal: '',
      });
    }
  }, [isOpen, editSession, defaultDate]);

  function handleTypeChange(typeId: string) {
    setForm((f) => {
      const ct = consultationTypes.find((t) => t.id === typeId);
      const endTime = ct ? addMinutes(f.start_time, ct.duration_minutes) : f.end_time;
      const title = f.title || ct?.name || '';
      const maxParts = ct?.max_participants || f.max_participants;
      return { ...f, consultation_type_id: typeId, end_time: endTime, title, max_participants: maxParts };
    });
  }

  async function handleSave() {
    if (!form.consultation_type_id) {
      showToast.error('Veuillez selectionner un type de seance');
      return;
    }
    if (!form.title.trim()) {
      showToast.error('Le titre est requis');
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.start_time}:00`).toISOString();
      const endsAt = new Date(`${form.date}T${form.end_time}:00`).toISOString();

      if (editSession) {
        await updateGroupSession(editSession.id, {
          consultation_type_id: form.consultation_type_id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          location_details: form.location_details.trim() || null,
          max_participants: form.max_participants,
          notes_internal: form.notes_internal.trim() || null,
        });
        showToast.success('Atelier modifie');
      } else {
        await createGroupSession({
          consultation_type_id: form.consultation_type_id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt,
          location_type: form.location_type,
          location_details: form.location_details.trim() || null,
          max_participants: form.max_participants,
          notes_internal: form.notes_internal.trim() || null,
        });
        showToast.success('Atelier cree');
      }

      onSaved();
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
      title={editSession ? 'Modifier l\'atelier' : 'Nouvel atelier'}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Consultation type */}
        <Select
          label="Type de seance collective *"
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

        {consultationTypes.length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
            Aucun type de seance collective configure. Creez-en un dans Parametres &gt; Types de seance.
          </p>
        )}

        {/* Title */}
        <Input
          label="Titre *"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ex: Atelier meditation collective"
        />

        {/* Description */}
        <div>
          <span className="text-[13px] font-medium text-stone">Description</span>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description de l'atelier (visible en ligne)..."
            className="mt-1 min-h-[60px]"
          />
        </div>

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

        {/* Location */}
        <Select
          label="Lieu"
          value={form.location_type}
          onChange={(e) => setForm((f) => ({ ...f, location_type: e.target.value as 'in_person' | 'video' | 'home_visit' }))}
        >
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Input
          label={form.location_type === 'video' ? 'Lien visio' : 'Adresse / Details du lieu'}
          value={form.location_details}
          onChange={(e) => setForm((f) => ({ ...f, location_details: e.target.value }))}
          placeholder={form.location_type === 'video' ? 'https://meet.google.com/...' : 'Adresse du lieu...'}
        />

        {/* Max participants */}
        <Input
          label="Nombre de places max"
          type="number"
          min="2"
          max="50"
          value={form.max_participants}
          onChange={(e) => setForm((f) => ({ ...f, max_participants: Math.max(2, Number(e.target.value)) }))}
        />

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
          {editSession ? 'Enregistrer' : 'Creer l\'atelier'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
