'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  getConsultationTypes,
  createConsultationType,
  updateConsultationType,
  deleteConsultationType,
  ensureDefaultConsultationTypes,
} from '@/lib/queries/appointments';
import type { ConsultationType } from '@/lib/types';

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];
const BUFFER_OPTIONS = [0, 10, 15, 20, 30];
const COLOR_OPTIONS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800',
  '#E91E63', '#00BCD4', '#795548', '#607D8B',
];

type FormData = {
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  color: string;
  buffer_minutes: number;
  is_bookable_online: boolean;
  description: string;
  is_group: boolean;
  max_participants: number;
};

const emptyForm: FormData = {
  name: '',
  duration_minutes: 60,
  price_cents: null,
  color: '#4CAF50',
  buffer_minutes: 15,
  is_bookable_online: true,
  description: '',
  is_group: false,
  max_participants: 1,
};

export default function ConsultationTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ConsultationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  const loadTypes = useCallback(async () => {
    try {
      await ensureDefaultConsultationTypes();
      const data = await getConsultationTypes();
      setTypes(data);
    } catch (err) {
      showToast.error('Erreur lors du chargement des types de consultation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPriceInput('');
    setModalOpen(true);
  }

  function openEdit(ct: ConsultationType) {
    setEditingId(ct.id);
    setForm({
      name: ct.name,
      duration_minutes: ct.duration_minutes,
      price_cents: ct.price_cents,
      color: ct.color,
      buffer_minutes: ct.buffer_minutes,
      is_bookable_online: ct.is_bookable_online,
      description: ct.description || '',
      is_group: ct.is_group,
      max_participants: ct.max_participants,
    });
    setPriceInput(ct.price_cents != null ? (ct.price_cents / 100).toString() : '');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        duration_minutes: form.duration_minutes,
        price_cents: priceInput ? Math.round(parseFloat(priceInput) * 100) : null,
        color: form.color,
        buffer_minutes: form.buffer_minutes,
        is_bookable_online: form.is_bookable_online,
        description: form.description.trim() || null,
        sort_order: editingId ? undefined : types.length,
        is_active: true,
        is_group: form.is_group,
        max_participants: form.is_group ? form.max_participants : 1,
      };

      if (editingId) {
        await updateConsultationType(editingId, payload);
        showToast.success('Type de seance mis a jour');
      } else {
        await createConsultationType(payload as Parameters<typeof createConsultationType>[0]);
        showToast.success('Type de seance cree');
      }

      setModalOpen(false);
      await loadTypes();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(ct: ConsultationType) {
    try {
      await updateConsultationType(ct.id, { is_active: !ct.is_active });
      await loadTypes();
      showToast.success(ct.is_active ? 'Type desactive' : 'Type reactive');
    } catch {
      showToast.error('Erreur lors de la modification');
    }
  }

  async function handleDelete(ct: ConsultationType) {
    if (!confirm(`Supprimer le type "${ct.name}" ?`)) return;
    try {
      await deleteConsultationType(ct.id);
      await loadTypes();
      showToast.success('Type supprime');
    } catch {
      showToast.error('Erreur lors de la suppression');
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newTypes = [...types];
    [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
    setTypes(newTypes);
    try {
      await Promise.all(
        newTypes.map((t, i) => updateConsultationType(t.id, { sort_order: i }))
      );
    } catch {
      showToast.error('Erreur lors du reordonnement');
      await loadTypes();
    }
  }

  async function handleMoveDown(index: number) {
    if (index === types.length - 1) return;
    const newTypes = [...types];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    setTypes(newTypes);
    try {
      await Promise.all(
        newTypes.map((t, i) => updateConsultationType(t.id, { sort_order: i }))
      );
    } catch {
      showToast.error('Erreur lors du reordonnement');
      await loadTypes();
    }
  }

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
          title="Types de seance"
          subtitle="Configurez vos types de consultation, durees et tarifs."
        />
      </div>

      <div className="flex justify-end">
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Ajouter un type
        </Button>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-stone">Chargement...</div>
      ) : types.length === 0 ? (
        <div className="glass-card p-8 text-center text-stone">
          Aucun type de seance configure.
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((ct, index) => (
            <div
              key={ct.id}
              className={`glass-card p-4 flex items-center gap-4 ${!ct.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-stone hover:text-charcoal disabled:opacity-30 p-0.5"
                >
                  <GripVertical className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === types.length - 1}
                  className="text-stone hover:text-charcoal disabled:opacity-30 p-0.5"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: ct.color }}
              />

              <div className="flex-1 min-w-0">
                <div className="font-medium text-charcoal flex items-center gap-2">
                  {ct.name}
                  {ct.is_group && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                      <Users className="h-3 w-3" />
                      Collectif
                    </span>
                  )}
                </div>
                <div className="text-sm text-stone">
                  {ct.duration_minutes} min
                  {ct.price_cents != null && ` · ${(ct.price_cents / 100).toFixed(0)}€`}
                  {ct.is_group && ` · ${ct.max_participants} places`}
                  {ct.buffer_minutes > 0 && ` · Buffer ${ct.buffer_minutes} min`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(ct)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  title={ct.is_active ? 'Desactiver' : 'Reactiver'}
                >
                  {ct.is_active ? (
                    <ToggleRight className="h-5 w-5 text-sage" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-stone" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(ct)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors text-stone hover:text-charcoal"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(ct)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors text-stone hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier le type de seance' : 'Nouveau type de seance'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Premiere consultation"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Duree"
              value={form.duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>

            <Input
              label="Tarif (€)"
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="60"
            />
          </div>

          <div>
            <span className="text-[13px] font-medium text-stone">Couleur</span>
            <div className="flex gap-2 mt-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-sage scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Select
            label="Buffer apres la seance"
            value={form.buffer_minutes}
            onChange={(e) => setForm((f) => ({ ...f, buffer_minutes: Number(e.target.value) }))}
          >
            {BUFFER_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b === 0 ? 'Aucun' : `${b} min`}
              </option>
            ))}
          </Select>

          <Textarea
            placeholder="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="min-h-[80px]"
          />

          {/* Group session toggle */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                is_group: !f.is_group,
                max_participants: !f.is_group ? 10 : 1,
              }))}
              className="flex items-center justify-between w-full py-2"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-stone" />
                <span className="text-[13px] font-medium text-stone">Seance collective</span>
              </div>
              {form.is_group ? (
                <ToggleRight className="h-5 w-5 text-sage" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-stone" />
              )}
            </button>

            {form.is_group && (
              <Input
                label="Nombre de places max"
                type="number"
                min="2"
                max="50"
                value={form.max_participants}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  max_participants: Math.max(2, Math.min(50, Number(e.target.value))),
                }))}
              />
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {editingId ? 'Enregistrer' : 'Creer'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
