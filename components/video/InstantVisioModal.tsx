'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { ConsultantSearch, getConsultantDisplayName, type ConsultantOption } from '@/components/consultants/ConsultantSearch';
import { durationLabel } from '@/components/agenda/ConsultationTypeForm';
import { supabase } from '@/lib/supabase';
import { getConsultationTypes } from '@/lib/queries/appointments';
import type { ConsultationType } from '@/lib/types';

const DURATIONS = [30, 45, 60, 90];
const DEFAULT_DURATION = 45;

const hourFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

type Conflict = { name: string; starts_at: string };

/** Visio immédiate : crée une séance en visio qui commence maintenant et ouvre la salle. */
export function InstantVisioModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [types, setTypes] = useState<ConsultationType[]>([]);
  const [mode, setMode] = useState<'consultant' | 'guest'>('consultant');
  const [consultantId, setConsultantId] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [typeId, setTypeId] = useState('');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [sendEmailChoice, setSendEmailChoice] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('consultant');
    setConsultantId('');
    setShowSearch(false);
    setGuestFirstName('');
    setGuestLastName('');
    setGuestEmail('');
    setTypeId('');
    setDuration(DEFAULT_DURATION);
    setSendEmailChoice(true);
    setConflict(null);

    async function load() {
      const [typesResult, consultantsResult] = await Promise.all([
        getConsultationTypes().catch(() => [] as ConsultationType[]),
        supabase
          .from('consultants')
          .select('id, name, first_name, last_name, email')
          .is('deleted_at', null)
          .order('name'),
      ]);
      setTypes(typesResult.filter((t) => t.is_active));
      setConsultants((consultantsResult.data || []) as ConsultantOption[]);
    }
    void load();
  }, [isOpen]);

  const selectedConsultant = consultants.find((c) => c.id === consultantId) ?? null;
  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const knownEmail = mode === 'consultant' ? selectedConsultant?.email?.trim() || '' : guestEmail.trim();
  const emailValid = !knownEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(knownEmail);
  const canEmail = !!knownEmail && emailValid;
  const sendEmail = canEmail && sendEmailChoice;

  // Durées proposées : celle du type choisi s'ajoute à la liste si besoin
  const durations = selectedType && selectedType.duration_minutes >= 15 && selectedType.duration_minutes <= 120 && !DURATIONS.includes(selectedType.duration_minutes)
    ? [...DURATIONS, selectedType.duration_minutes].sort((a, b) => a - b)
    : DURATIONS;

  function handleTypeChange(id: string) {
    setTypeId(id);
    const t = types.find((x) => x.id === id);
    setDuration(t && t.duration_minutes >= 15 && t.duration_minutes <= 120 ? t.duration_minutes : DEFAULT_DURATION);
  }

  const guestReady = guestFirstName.trim() !== '' && guestLastName.trim() !== '' && emailValid;
  const ready = mode === 'consultant' ? !!consultantId : guestReady;

  async function submit(force: boolean) {
    if (!ready) {
      showToast.error(mode === 'consultant' ? 'Choisissez un consultant.' : 'Indiquez le prénom et le nom de la personne.');
      return;
    }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch('/api/video/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token ?? ''}` },
        body: JSON.stringify({
          consultantId: mode === 'consultant' ? consultantId : undefined,
          guestName: mode === 'guest' ? `${guestFirstName.trim()} ${guestLastName.trim()}` : undefined,
          guestEmail: mode === 'guest' && guestEmail.trim() ? guestEmail.trim() : undefined,
          consultationTypeId: typeId || undefined,
          durationMinutes: duration,
          sendEmail,
          force: force || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409 && body?.conflict) {
        setConflict(body.conflict as Conflict);
        return;
      }
      if (!res.ok) {
        showToast.error(body?.error ?? 'La visio n’a pas pu être créée.');
        return;
      }
      if (sendEmail && !body.emailSent) {
        showToast.error('L’e-mail n’a pas pu être envoyé. Copiez le lien du consultant depuis la salle d’attente.');
      }
      router.push(`/consultation/video/${body.appointment_id}`);
    } catch {
      showToast.error('La visio n’a pas pu être créée.');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls = 'h-11 w-full rounded-[10px] border border-divider bg-cream px-3 text-sm text-charcoal outline-none focus:border-sage';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visio immédiate" size="lg">
      <div className="flex max-h-[65vh] flex-col gap-3.5 overflow-y-auto pr-1">
        {/* Avec qui ? */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] text-stone">Avec qui ?</legend>
          <div role="group" aria-label="Avec qui ?" className="flex gap-1.5 rounded-xl border border-divider bg-cream p-1">
            {([
              ['consultant', 'Un consultant'],
              ['guest', 'Une personne sans dossier'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setConflict(null);
                }}
                className={`h-[38px] flex-1 rounded-lg text-sm font-medium ${mode === value ? 'bg-sage-light text-sage' : 'text-charcoal'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'consultant' ? (
            selectedConsultant ? (
              <div className="flex items-center justify-between rounded-[10px] border border-[#2F5A50] bg-sage-light/40 p-3">
                <div>
                  <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(selectedConsultant)}</div>
                  {selectedConsultant.email && <div className="text-xs text-stone">{selectedConsultant.email}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConsultantId('');
                    setShowSearch(true);
                  }}
                  className="text-xs text-sage hover:text-sage-dark"
                >
                  Changer
                </button>
              </div>
            ) : (
              <ConsultantSearch
                consultants={consultants}
                open={showSearch}
                onOpenChange={setShowSearch}
                onSelect={(c) => {
                  setConsultantId(c.id);
                  setConflict(null);
                }}
                inputClassName={fieldCls}
              />
            )
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                Prénom
                <input type="text" required maxLength={60} value={guestFirstName} onChange={(e) => setGuestFirstName(e.target.value)} autoComplete="off" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                Nom
                <input type="text" required maxLength={59} value={guestLastName} onChange={(e) => setGuestLastName(e.target.value)} autoComplete="off" className={fieldCls} />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5 text-[13px] text-stone">
                <span>E-mail <span className="text-mist">· facultatif</span></span>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} autoComplete="off" className={fieldCls} />
                {!emailValid && <span role="alert" className="text-[13px] text-[#F2A3A3]">Cette adresse e-mail n’est pas valide.</span>}
              </label>
            </div>
          )}
        </fieldset>

        {/* Type de séance */}
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          <span>Type de séance <span className="text-mist">· facultatif</span></span>
          <select value={typeId} onChange={(e) => handleTypeChange(e.target.value)} className={fieldCls}>
            <option value="">Sans type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {durationLabel(t.duration_minutes)}</option>
            ))}
          </select>
        </label>

        {/* Durée */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-stone">Durée</span>
          <div role="group" aria-label="Durée" className="flex gap-1.5 rounded-xl border border-divider bg-cream p-1">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={duration === d}
                onClick={() => setDuration(d)}
                className={`h-[38px] flex-1 rounded-lg text-sm font-medium ${duration === d ? 'bg-sage-light text-sage' : 'text-charcoal'}`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* E-mail */}
        <label className={`flex items-center gap-2.5 text-sm ${canEmail ? 'text-charcoal' : 'text-stone'}`}>
          <input
            type="checkbox"
            checked={sendEmail}
            disabled={!canEmail}
            onChange={(e) => setSendEmailChoice(e.target.checked)}
            className="h-4 w-4 accent-[#6DD4B8]"
          />
          Envoyer le lien par e-mail
          {!knownEmail && <span className="text-[13px] text-mist">· aucune adresse connue</span>}
        </label>

        {conflict && (
          <div role="alert" className="flex flex-col gap-2.5 rounded-[10px] border border-[#5A3A3A] p-3">
            <span className="text-[13px] text-[#F2A3A3]">
              Cette visio chevauche la séance de {conflict.name.split(' ')[0]} à {hourFmt.format(new Date(conflict.starts_at)).replace(':', ' h ')}.
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConflict(null)}
                className="flex h-10 items-center justify-center rounded-[10px] border border-divider text-[13px] text-charcoal hover:border-sage"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit(true)}
                className="flex h-10 items-center justify-center rounded-[10px] bg-sage text-[13px] font-semibold text-ink hover:bg-sage-deep disabled:opacity-60"
              >
                Lancer quand même
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={() => void submit(false)} loading={saving && !conflict} disabled={!ready || !!conflict} icon={<Video className="h-4 w-4" />}>
          Créer et rejoindre
        </Button>
      </ModalFooter>
    </Modal>
  );
}
