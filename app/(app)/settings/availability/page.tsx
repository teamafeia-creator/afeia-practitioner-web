'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, X, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  getAvailabilitySchedules,
  saveAvailabilitySchedules,
  getAvailabilityOverrides,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
} from '@/lib/queries/appointments';
import type { AvailabilitySchedule, AvailabilityOverride } from '@/lib/types';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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

type DaySlot = { start_time: string; end_time: string };
type WeekSchedule = Record<number, { active: boolean; slots: DaySlot[] }>;

function buildWeekFromSchedules(schedules: AvailabilitySchedule[]): WeekSchedule {
  const week: WeekSchedule = {};
  for (let d = 0; d < 7; d++) {
    const daySlots = schedules
      .filter((s) => s.day_of_week === d && s.is_active)
      .map((s) => ({ start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }));
    week[d] = {
      active: daySlots.length > 0,
      slots: daySlots.length > 0 ? daySlots : [{ start_time: '09:00', end_time: '18:00' }],
    };
  }
  return week;
}

function weekToSchedules(week: WeekSchedule): { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[] {
  const result: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[] = [];
  for (let d = 0; d < 7; d++) {
    const day = week[d];
    if (day.active) {
      for (const slot of day.slots) {
        result.push({
          day_of_week: d,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: true,
        });
      }
    }
  }
  return result;
}

const REASON_OPTIONS = ['Vacances', 'Formation', 'Personnel', 'Autre'];

export default function AvailabilityPage() {
  const router = useRouter();
  const [week, setWeek] = useState<WeekSchedule>(() => {
    const w: WeekSchedule = {};
    for (let d = 0; d < 7; d++) {
      w[d] = {
        active: d < 5,
        slots: d < 5 ? [{ start_time: '09:00', end_time: '12:30' }, { start_time: '14:00', end_time: '18:00' }] : [{ start_time: '09:00', end_time: '18:00' }],
      };
    }
    return w;
  });
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    date: '',
    is_available: false,
    all_day: true,
    start_time: '09:00',
    end_time: '18:00',
    reason: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [schedules, ovr] = await Promise.all([
        getAvailabilitySchedules(),
        getAvailabilityOverrides(),
      ]);
      if (schedules.length > 0) {
        setWeek(buildWeekFromSchedules(schedules));
      }
      setOverrides(ovr);
    } catch (err) {
      showToast.error('Erreur lors du chargement des disponibilites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveSchedule() {
    setSaving(true);
    try {
      const schedules = weekToSchedules(week);
      await saveAvailabilitySchedules(schedules);
      showToast.success('Disponibilites enregistrees');
    } catch (err) {
      showToast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setWeek((w) => ({
      ...w,
      [day]: { ...w[day], active: !w[day].active },
    }));
  }

  function updateSlot(day: number, index: number, field: 'start_time' | 'end_time', value: string) {
    setWeek((w) => {
      const slots = [...w[day].slots];
      slots[index] = { ...slots[index], [field]: value };
      return { ...w, [day]: { ...w[day], slots } };
    });
  }

  function addSlot(day: number) {
    setWeek((w) => {
      const slots = [...w[day].slots, { start_time: '14:00', end_time: '18:00' }];
      return { ...w, [day]: { ...w[day], slots } };
    });
  }

  function removeSlot(day: number, index: number) {
    setWeek((w) => {
      const slots = w[day].slots.filter((_, i) => i !== index);
      return { ...w, [day]: { ...w[day], slots: slots.length > 0 ? slots : [{ start_time: '09:00', end_time: '18:00' }] } };
    });
  }

  async function handleCreateOverride() {
    if (!overrideForm.date) {
      showToast.error('Date requise');
      return;
    }

    try {
      await createAvailabilityOverride({
        date: overrideForm.date,
        is_available: overrideForm.is_available,
        start_time: overrideForm.all_day ? null : overrideForm.start_time,
        end_time: overrideForm.all_day ? null : overrideForm.end_time,
        reason: overrideForm.reason || null,
      });
      setOverrideModalOpen(false);
      setOverrideForm({ date: '', is_available: false, all_day: true, start_time: '09:00', end_time: '18:00', reason: '' });
      await loadData();
      showToast.success('Exception ajoutee');
    } catch (err) {
      showToast.error('Erreur lors de la creation');
    }
  }

  async function handleDeleteOverride(id: string) {
    try {
      await deleteAvailabilityOverride(id);
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      showToast.success('Exception supprimee');
    } catch {
      showToast.error('Erreur lors de la suppression');
    }
  }

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 rounded-lg hover:bg-white/50 transition-colors text-stone"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title="Disponibilites"
          subtitle="Configurez vos horaires hebdomadaires et vos exceptions."
        />
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-stone">Chargement...</div>
      ) : (
        <>
          {/* Weekly schedule */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                <Clock className="h-4 w-4 text-sage" />
                Horaires hebdomadaires
              </h3>
              <Button variant="primary" size="sm" onClick={handleSaveSchedule} loading={saving}>
                Enregistrer
              </Button>
            </div>

            <div className="space-y-3">
              {DAYS.map((dayName, dayIndex) => (
                <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-start gap-3 py-3 border-b border-white/10 last:border-0">
                  <div className="flex items-center gap-3 sm:w-32 flex-shrink-0">
                    <button
                      onClick={() => toggleDay(dayIndex)}
                      className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-colors ${
                        week[dayIndex].active
                          ? 'bg-sage text-white'
                          : 'bg-neutral-200 text-neutral-400'
                      }`}
                    >
                      {week[dayIndex].active ? '✓' : ''}
                    </button>
                    <span className={`text-sm font-medium ${week[dayIndex].active ? 'text-charcoal' : 'text-stone'}`}>
                      {dayName}
                    </span>
                  </div>

                  {week[dayIndex].active ? (
                    <div className="flex-1 space-y-2">
                      {week[dayIndex].slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-2">
                          <Select
                            value={slot.start_time}
                            onChange={(e) => updateSlot(dayIndex, slotIndex, 'start_time', e.target.value)}
                            className="w-28"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </Select>
                          <span className="text-stone text-sm">-</span>
                          <Select
                            value={slot.end_time}
                            onChange={(e) => updateSlot(dayIndex, slotIndex, 'end_time', e.target.value)}
                            className="w-28"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </Select>
                          <button
                            onClick={() => removeSlot(dayIndex, slotIndex)}
                            className="p-1 text-stone hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addSlot(dayIndex)}
                        className="text-xs text-sage hover:text-sage-deep transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Ajouter une plage
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-stone italic">Non disponible</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overrides */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sage" />
                Indisponibilites & exceptions
              </h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setOverrideModalOpen(true)}
              >
                Ajouter
              </Button>
            </div>

            {overrides.length === 0 ? (
              <p className="text-sm text-stone">Aucune exception configuree.</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((ovr) => (
                  <div key={ovr.id} className="flex items-center justify-between p-3 bg-white/40 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-charcoal">
                        {dateFormatter.format(new Date(ovr.date + 'T00:00:00'))}
                      </div>
                      <div className="text-xs text-stone">
                        {ovr.is_available ? (
                          <span className="text-sage">Disponible exceptionnellement</span>
                        ) : (
                          <span className="text-red-500">Indisponible</span>
                        )}
                        {ovr.start_time && ovr.end_time && ` · ${ovr.start_time.slice(0, 5)} - ${ovr.end_time.slice(0, 5)}`}
                        {!ovr.start_time && ' · Toute la journee'}
                        {ovr.reason && ` · ${ovr.reason}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(ovr.id)}
                      className="p-2 text-stone hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Ajouter une exception"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={overrideForm.date}
            onChange={(e) => setOverrideForm((f) => ({ ...f, date: e.target.value }))}
            required
          />

          <div>
            <span className="text-[13px] font-medium text-stone">Type</span>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setOverrideForm((f) => ({ ...f, is_available: false }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !overrideForm.is_available ? 'bg-red-100 text-red-700 ring-1 ring-red-200' : 'bg-neutral-100 text-stone'
                }`}
              >
                Indisponible
              </button>
              <button
                onClick={() => setOverrideForm((f) => ({ ...f, is_available: true }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  overrideForm.is_available ? 'bg-sage-light text-sage ring-1 ring-sage/20' : 'bg-neutral-100 text-stone'
                }`}
              >
                Disponible exceptionnellement
              </button>
            </div>
          </div>

          <div>
            <span className="text-[13px] font-medium text-stone">Duree</span>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setOverrideForm((f) => ({ ...f, all_day: true }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  overrideForm.all_day ? 'bg-sage-light text-sage ring-1 ring-sage/20' : 'bg-neutral-100 text-stone'
                }`}
              >
                Toute la journee
              </button>
              <button
                onClick={() => setOverrideForm((f) => ({ ...f, all_day: false }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !overrideForm.all_day ? 'bg-sage-light text-sage ring-1 ring-sage/20' : 'bg-neutral-100 text-stone'
                }`}
              >
                Creneau specifique
              </button>
            </div>
          </div>

          {!overrideForm.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Debut"
                value={overrideForm.start_time}
                onChange={(e) => setOverrideForm((f) => ({ ...f, start_time: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Select
                label="Fin"
                value={overrideForm.end_time}
                onChange={(e) => setOverrideForm((f) => ({ ...f, end_time: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          )}

          <Select
            label="Raison (optionnel)"
            value={overrideForm.reason}
            onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))}
          >
            <option value="">-- Choisir --</option>
            {REASON_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setOverrideModalOpen(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleCreateOverride}>
            Ajouter
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
