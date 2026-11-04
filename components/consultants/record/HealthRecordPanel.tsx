'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Pencil, Trash2 } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { planBlocks } from './PlanBlocks';
import type { AllergyEntry, ConsultantPlan, CurrentTreatmentEntry, MedicalHistoryEntry } from '@/lib/types';

export type ContactFields = {
  referring_doctor_name: string;
  referring_doctor_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
};

type Source = 'practitioner' | 'anamnese';

type Props = {
  firstName: string;
  contacts: ContactFields;
  answers: Record<string, string>;
  anamnesisDate: string | null;
  medicalHistory: MedicalHistoryEntry[];
  allergies: AllergyEntry[];
  treatments: CurrentTreatmentEntry[];
  plans: ConsultantPlan[];
  onSaveContacts: (fields: ContactFields) => Promise<void>;
  onAddHistory: (category: MedicalHistoryEntry['category'], prefill?: string, source?: Source) => void;
  onEditHistory: (entry: MedicalHistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onAddAllergy: (prefill?: string, source?: Source) => void;
  onEditAllergy: (entry: AllergyEntry) => void;
  onDeleteAllergy: (id: string) => void;
  onAddTreatment: (prefill?: string, source?: Source) => void;
  onEditTreatment: (entry: CurrentTreatmentEntry) => void;
  onDeleteTreatment: (id: string) => void;
  onStopTreatment: (entry: CurrentTreatmentEntry, reason: string) => Promise<void>;
  onResumeTreatment: (entry: CurrentTreatmentEntry) => Promise<void>;
  onOpenPlan: () => void;
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmt = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : '');

const card = 'flex flex-col rounded-2xl border border-divider bg-surface';
const ADVISED_SECTIONS = ['phytotherapie', 'micronutrition', 'aromatologie', 'hydrologie'];

function sourceLine(row: { source?: Source; created_at: string; updated_at: string }, anamnesisDate: string | null) {
  const edited = new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 60_000;
  if (edited) return `Modifié le ${fmt(row.updated_at)}`;
  if (row.source === 'anamnese') return `Repris de l’anamnèse${anamnesisDate ? ` · ${fmt(anamnesisDate)}` : ''}`;
  return `Ajouté le ${fmt(row.created_at)}`;
}

function Tabs<T extends string>({ tabs, active, onChange, label }: { tabs: [T, string, number][]; active: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mt-3.5 flex flex-wrap gap-x-6 border-b border-divider px-[22px]">
      {tabs.map(([id, text, n]) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(id)}
            className={cn(
              '-mb-px inline-flex h-11 items-center gap-2 border-b-2 text-sm font-semibold transition-colors',
              on ? 'border-sage text-charcoal' : 'border-transparent text-stone hover:text-charcoal'
            )}
          >
            {text}
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-raised px-1.5 text-xs text-stone">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Row({
  initial,
  tint,
  title,
  detail,
  status,
  statusColor,
  meta,
  muted,
  actions,
}: {
  initial: string;
  tint: [string, string];
  title: string;
  detail?: string | null;
  status?: string | null;
  statusColor?: string;
  meta?: string;
  muted?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-[#1F2633] py-3.5 last:border-b-0">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-sm font-bold"
        style={{ background: tint[0], color: tint[1] }}
      >
        {initial}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-[15px] font-semibold', muted ? 'text-[#B8C1CF]' : 'text-charcoal')}>{title}</span>
        {detail ? <span className="text-[13px] leading-snug text-stone">{detail}</span> : null}
      </span>
      <span className="flex flex-none flex-col items-end gap-1 text-right">
        {status ? (
          <span className="text-xs font-semibold" style={{ color: statusColor ?? '#8B95A5' }}>
            {status}
          </span>
        ) : null}
        {meta ? <span className="text-xs text-mist">{meta}</span> : null}
      </span>
      {actions ? <span className="flex flex-none items-center gap-1">{actions}</span> : null}
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-stone transition-colors hover:bg-white/5',
        danger ? 'hover:text-rose' : 'hover:text-charcoal'
      )}
    >
      {children}
    </button>
  );
}

function Suggest({ text, onTake }: { text: string; onTake: () => void }) {
  return (
    <div className="my-2 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-divider px-3.5 py-3">
      <span className="min-w-0 flex-[1_1_260px] text-[13px] leading-snug text-stone">
        Dans l’anamnèse : <span className="text-charcoal">« {text} »</span>
      </span>
      <button type="button" onClick={onTake} className="text-sm text-sage hover:text-[#A8E6CF]">
        Reprendre dans le dossier
      </button>
    </div>
  );
}

const initialOf = (s: string) => s.replace(/^[^A-Za-zÀ-ÿ]+/, '').charAt(0).toUpperCase() || '·';

export function HealthRecordPanel(p: Props) {
  const { firstName, answers, anamnesisDate } = p;

  // ─── Contacts ─────────────────────────────
  const [ctEdit, setCtEdit] = useState(false);
  const [ctDraft, setCtDraft] = useState<ContactFields>(p.contacts);
  const [ctSaving, setCtSaving] = useState(false);
  const [ctError, setCtError] = useState<string | null>(null);

  // ─── Antécédents et allergies ─────────────
  const [hTab, setHTab] = useState<'personal' | 'family' | 'allergies'>('personal');

  // ─── Traitements et conseils ──────────────
  const [tTab, setTTab] = useState<'taken' | 'advised' | 'stopped'>('taken');
  const [stopping, setStopping] = useState<CurrentTreatmentEntry | null>(null);
  const [stopReason, setStopReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exp, setExp] = useState({ taken: true, advised: true, stopped: true });
  const [copied, setCopied] = useState(false);

  const personal = p.medicalHistory.filter((h) => h.category !== 'family');
  const family = p.medicalHistory.filter((h) => h.category === 'family');
  const taken = p.treatments.filter((t) => t.is_active);
  const stopped = p.treatments.filter((t) => !t.is_active);

  const plan = useMemo(() => {
    const shared = p.plans.filter((x) => x.status === 'shared').sort((a, b) => b.version - a.version)[0];
    return shared ?? [...p.plans].sort((a, b) => b.version - a.version)[0] ?? null;
  }, [p.plans]);
  const advised = useMemo(
    () => (plan?.content ? planBlocks(plan.content).filter((b) => ADVISED_SECTIONS.includes(b.section)) : []),
    [plan]
  );
  const planSince = plan ? fmt(plan.shared_at ?? plan.updated_at) : '';

  // Ce que l'anamnèse contient et qui n'a pas encore été repris dans le dossier
  const fromAnamnesis = {
    personal: answers.general_antecedents?.trim() && !personal.some((h) => h.source === 'anamnese') ? answers.general_antecedents.trim() : '',
    allergies: answers['digestion_tolérances']?.trim() && !p.allergies.some((a) => a.source === 'anamnese') ? answers['digestion_tolérances'].trim() : '',
    taken: answers.general_traitements?.trim() && !p.treatments.some((t) => t.source === 'anamnese') ? answers.general_traitements.trim() : '',
  };

  async function saveContacts() {
    setCtSaving(true);
    setCtError(null);
    try {
      await p.onSaveContacts(ctDraft);
      setCtEdit(false);
    } catch (e) {
      setCtError(e instanceof Error ? e.message : 'Impossible d’enregistrer.');
    } finally {
      setCtSaving(false);
    }
  }

  function exportText() {
    const lines: string[] = [`Traitements et conseils — ${firstName}`, `Établi le ${fmt(new Date().toISOString())}`, ''];
    if (exp.taken) {
      lines.push(`CE QUE ${firstName.toUpperCase()} PREND DÉJÀ`);
      if (!taken.length) lines.push('—');
      for (const t of taken) lines.push(`• ${t.name}${t.dosage ? ` — ${t.dosage}` : ''}${t.prescriber ? ` (prescrit par ${t.prescriber})` : ''}`);
      lines.push('');
    }
    if (exp.advised) {
      lines.push(`CONSEILLÉ PAR LE PRATICIEN${plan ? ` (conseillancier v${plan.version})` : ''}`);
      if (!advised.length) lines.push('—');
      for (const b of advised) lines.push(`• ${b.title} [${b.cat}] — ${b.body.replace(/\s+/g, ' ')}`);
      lines.push('');
    }
    if (exp.stopped) {
      lines.push('ARRÊTÉS');
      if (!stopped.length) lines.push('—');
      for (const t of stopped) lines.push(`• ${t.name}${t.stopped_at ? ` — arrêté le ${fmt(t.stopped_at)}` : ''}${t.stop_reason ? ` (${t.stop_reason})` : ''}`);
      lines.push('');
    }
    lines.push('Ces conseils relèvent de l’hygiène de vie et ne remplacent pas un avis médical.');
    return lines.join('\n');
  }

  function printExport() {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    w.document.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Traitements et conseils — ${esc(firstName)}</title><style>body{font:14px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;white-space:pre-wrap}</style></head><body>${esc(exportText())}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
    setExportOpen(false);
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const historyRows = (rows: MedicalHistoryEntry[], tint: [string, string]) =>
    rows.map((h) => (
      <Row
        key={h.id}
        initial={initialOf(h.description)}
        tint={tint}
        title={h.description}
        detail={[h.year_onset ? `Depuis ${h.year_onset}` : null, h.category === 'surgical' ? 'Chirurgical' : null, h.notes].filter(Boolean).join(' · ')}
        status={h.is_active ? 'Actif' : 'Résolu'}
        statusColor={h.is_active ? '#E8A87C' : '#6DD4B8'}
        meta={sourceLine(h, anamnesisDate)}
        actions={
          <>
            <IconBtn label={`Modifier : ${h.description}`} onClick={() => p.onEditHistory(h)}>
              <Pencil className="h-[15px] w-[15px]" aria-hidden="true" />
            </IconBtn>
            <IconBtn label={`Supprimer : ${h.description}`} danger onClick={() => p.onDeleteHistory(h.id)}>
              <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
            </IconBtn>
          </>
        }
      />
    ));

  const SEV: Record<string, string> = { mild: 'Légère', moderate: 'Modérée', severe: 'Sévère' };
  const ATYPE: Record<string, string> = { allergy: 'Allergie', intolerance: 'Intolérance', sensitivity: 'Sensibilité' };


  const field = 'h-[38px] rounded-lg border border-divider bg-ink px-2.5 text-sm text-charcoal placeholder:text-mist';

  return (
    <div className="flex flex-col gap-[18px]">
      <div role="note" className="flex items-start gap-2.5 rounded-xl border border-[#5C4F1E] bg-[#332D17] px-3.5 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-[#F2C94C]" aria-hidden="true" />
        <span className="text-[13px] leading-normal text-[#F5E3A8]">
          Ces informations servent à adapter vos conseils et à repérer les contre-indications. Elles ne remplacent pas l’avis du médecin :
          un traitement en cours ne se modifie jamais sans lui.
        </span>
      </div>

      {/* Contacts */}
      <section aria-labelledby="ct-t" className={`${card} gap-3.5 p-5`}>
        <div className="flex items-center gap-2.5">
          <h3 id="ct-t" className="flex-1 text-base font-semibold">
            Contacts
          </h3>
          {!ctEdit ? (
            <button
              type="button"
              onClick={() => {
                setCtDraft(p.contacts);
                setCtEdit(true);
              }}
              className="text-sm text-sage hover:text-[#A8E6CF]"
            >
              Modifier
            </button>
          ) : null}
        </div>
        {ctEdit ? (
          <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-stone">Médecin traitant</span>
              <input aria-label="Médecin traitant : nom" className={field} value={ctDraft.referring_doctor_name} onChange={(e) => setCtDraft((d) => ({ ...d, referring_doctor_name: e.target.value }))} placeholder="Dr …" />
              <input aria-label="Médecin traitant : téléphone" className={field} value={ctDraft.referring_doctor_phone} onChange={(e) => setCtDraft((d) => ({ ...d, referring_doctor_phone: e.target.value }))} placeholder="Téléphone" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-stone">Contact d’urgence</span>
              <input aria-label="Contact d’urgence : nom" className={field} value={ctDraft.emergency_contact_name} onChange={(e) => setCtDraft((d) => ({ ...d, emergency_contact_name: e.target.value }))} placeholder="Nom" />
              <input aria-label="Contact d’urgence : lien" className={field} value={ctDraft.emergency_contact_relation} onChange={(e) => setCtDraft((d) => ({ ...d, emergency_contact_relation: e.target.value }))} placeholder="Lien (mère, conjoint…)" />
              <input aria-label="Contact d’urgence : téléphone" className={field} value={ctDraft.emergency_contact_phone} onChange={(e) => setCtDraft((d) => ({ ...d, emergency_contact_phone: e.target.value }))} placeholder="Téléphone" />
            </div>
            {ctError ? <p className="text-sm text-rose sm:col-span-2">{ctError}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => setCtEdit(false)}>
                Annuler
              </Button>
              <Button variant="primary" loading={ctSaving} onClick={() => void saveContacts()}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3.5">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-stone">Médecin traitant</dt>
              <dd className="text-[15px]">{p.contacts.referring_doctor_name || '—'}</dd>
              {p.contacts.referring_doctor_phone ? <dd className="text-[13px] text-stone">{p.contacts.referring_doctor_phone}</dd> : null}
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-stone">Contact d’urgence</dt>
              <dd className="text-[15px]">
                {p.contacts.emergency_contact_name
                  ? `${p.contacts.emergency_contact_name}${p.contacts.emergency_contact_relation ? ` (${p.contacts.emergency_contact_relation})` : ''}`
                  : '—'}
              </dd>
              {p.contacts.emergency_contact_phone ? <dd className="text-[13px] text-stone">{p.contacts.emergency_contact_phone}</dd> : null}
            </div>
          </dl>
        )}
      </section>

      {/* Antécédents et allergies */}
      <section aria-labelledby="hist-t" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 px-[22px] pt-5">
          <h3 id="hist-t" className="flex-1 text-lg font-semibold">
            Antécédents et allergies
          </h3>
          <button
            type="button"
            onClick={() => (hTab === 'allergies' ? p.onAddAllergy() : p.onAddHistory(hTab))}
            className="text-sm font-medium text-sage hover:text-[#A8E6CF]"
          >
            ＋ Ajouter
          </button>
        </div>
        <Tabs
          label="Antécédents et allergies"
          active={hTab}
          onChange={setHTab}
          tabs={[
            ['personal', 'Personnels', personal.length],
            ['family', 'Familiaux', family.length],
            ['allergies', 'Allergies et intolérances', p.allergies.length],
          ]}
        />
        <div role="tabpanel" className="flex flex-col px-[22px] pb-4 pt-1.5">
          {hTab === 'personal' ? (
            <>
              {fromAnamnesis.personal ? <Suggest text={fromAnamnesis.personal} onTake={() => p.onAddHistory('personal', fromAnamnesis.personal, 'anamnese')} /> : null}
              {personal.length ? historyRows(personal, ['#1F2640', '#A9B8EC']) : <p className="py-4 text-sm text-stone">Aucun antécédent personnel renseigné.</p>}
            </>
          ) : null}
          {hTab === 'family' ? (
            family.length ? historyRows(family, ['#1F2640', '#A9B8EC']) : <p className="py-4 text-sm text-stone">Aucun antécédent familial renseigné.</p>
          ) : null}
          {hTab === 'allergies' ? (
            <>
              {fromAnamnesis.allergies ? <Suggest text={fromAnamnesis.allergies} onTake={() => p.onAddAllergy(fromAnamnesis.allergies, 'anamnese')} /> : null}
              {p.allergies.length ? (
                p.allergies.map((a) => (
                  <Row
                    key={a.id}
                    initial={initialOf(a.substance)}
                    tint={['#3A2224', '#F2A3A3']}
                    title={a.substance}
                    detail={[a.reaction, a.diagnosed ? 'Diagnostiquée' : null, a.notes].filter(Boolean).join(' · ')}
                    status={[ATYPE[a.type], a.severity ? SEV[a.severity] : null].filter(Boolean).join(' · ')}
                    statusColor="#F2A3A3"
                    meta={sourceLine(a, anamnesisDate)}
                    actions={
                      <>
                        <IconBtn label={`Modifier : ${a.substance}`} onClick={() => p.onEditAllergy(a)}>
                          <Pencil className="h-[15px] w-[15px]" aria-hidden="true" />
                        </IconBtn>
                        <IconBtn label={`Supprimer : ${a.substance}`} danger onClick={() => p.onDeleteAllergy(a.id)}>
                          <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
                        </IconBtn>
                      </>
                    }
                  />
                ))
              ) : (
                <p className="py-4 text-sm text-stone">Aucune allergie déclarée. À confirmer avec {firstName} à la prochaine séance.</p>
              )}
              {p.allergies.length ? (
                <p className="pt-2 text-xs text-sage">Prises en compte dans les alertes de contre-indication du conseillancier.</p>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {/* Traitements et conseils */}
      <section aria-labelledby="trt-t" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 px-[22px] pt-5">
          <h3 id="trt-t" className="flex-1 text-lg font-semibold">
            Traitements et conseils
          </h3>
          <Button variant="outline" onClick={() => setExportOpen(true)} icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}>
            Exporter
          </Button>
        </div>
        <Tabs
          label="Traitements et conseils"
          active={tTab}
          onChange={setTTab}
          tabs={[
            ['taken', `Ce que ${firstName} prend`, taken.length],
            ['advised', 'Ce que vous conseillez', advised.length],
            ['stopped', 'Arrêtés', stopped.length],
          ]}
        />
        <div role="tabpanel" className="flex flex-col px-[22px] pb-2 pt-1.5">
          <span className="pb-1 pt-2.5 text-[13px] text-stone">
            {tTab === 'taken'
              ? `Traitements et compléments que ${firstName} prend en dehors de vos conseils.`
              : tTab === 'advised'
                ? plan
                  ? `Repris automatiquement du conseillancier en cours (v${plan.version}${planSince ? `, ${planSince}` : ''}).`
                  : 'Aucun conseillancier pour l’instant.'
                : `Ce que ${firstName} a arrêté, avec la date et la raison.`}
          </span>

          {tTab === 'taken' ? (
            <>
              {fromAnamnesis.taken ? <Suggest text={fromAnamnesis.taken} onTake={() => p.onAddTreatment(fromAnamnesis.taken, 'anamnese')} /> : null}
              {taken.length === 0 ? <p className="py-4 text-sm text-stone">Rien en cours.</p> : null}
              {taken.map((t) => (
                <Row
                  key={t.id}
                  initial={initialOf(t.name)}
                  tint={['#373131', '#E8A87C']}
                  title={t.name}
                  detail={[t.dosage, t.prescriber ? `Prescrit par ${t.prescriber}` : null, t.notes].filter(Boolean).join(' · ')}
                  status="En cours"
                  statusColor="#E8A87C"
                  meta={t.start_date ? `Depuis le ${fmt(t.start_date)}` : sourceLine(t, anamnesisDate)}
                  actions={
                    <>
                      <IconBtn label={`Modifier : ${t.name}`} onClick={() => p.onEditTreatment(t)}>
                        <Pencil className="h-[15px] w-[15px]" aria-hidden="true" />
                      </IconBtn>
                      <button
                        type="button"
                        onClick={() => {
                          setStopping(t);
                          setStopReason('');
                        }}
                        className="h-8 w-[116px] rounded-lg border border-divider text-xs text-[#B8C1CF] hover:border-sage"
                      >
                        Marquer arrêté
                      </button>
                    </>
                  }
                />
              ))}
            </>
          ) : null}

          {tTab === 'advised' ? (
            <>
              {advised.length === 0 && plan ? <p className="py-4 text-sm text-stone">Aucun conseil de phytothérapie, micronutrition, aromatologie ou hydrologie dans ce conseillancier.</p> : null}
              {advised.map((b) => (
                <Row
                  key={b.id}
                  initial={initialOf(b.title)}
                  tint={[b.tint, b.c]}
                  title={b.title}
                  detail={b.body.length > 160 ? `${b.body.slice(0, 157)}…` : b.body}
                  status={b.cat}
                  statusColor={b.c}
                  meta={planSince ? `Depuis le ${planSince} · v${plan?.version}` : undefined}
                />
              ))}
            </>
          ) : null}

          {tTab === 'stopped' ? (
            <>
              {stopped.length === 0 ? <p className="py-4 text-sm text-stone">Aucun traitement arrêté.</p> : null}
              {stopped.map((t) => (
                <Row
                  key={t.id}
                  muted
                  initial={initialOf(t.name)}
                  tint={['#1C2230', '#8B95A5']}
                  title={t.name}
                  detail={[t.dosage, t.stop_reason].filter(Boolean).join(' · ')}
                  status="Arrêté"
                  meta={t.stopped_at ? fmt(t.stopped_at) : sourceLine(t, anamnesisDate)}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await p.onResumeTreatment(t);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="h-8 w-[116px] rounded-lg border border-divider text-xs text-[#B8C1CF] hover:border-sage"
                      >
                        {firstName.length < 12 ? `${firstName} a repris` : 'Repris'}
                      </button>
                      <IconBtn label={`Supprimer : ${t.name}`} danger onClick={() => p.onDeleteTreatment(t.id)}>
                        <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
                      </IconBtn>
                    </>
                  }
                />
              ))}
            </>
          ) : null}

          <div className="flex justify-end pb-2.5 pt-3">
            {tTab === 'taken' ? (
              <button type="button" onClick={() => p.onAddTreatment()} className="text-sm font-medium text-sage hover:text-[#A8E6CF]">
                ＋ Ajouter un traitement ou complément
              </button>
            ) : null}
            {tTab === 'advised' ? (
              <button type="button" onClick={p.onOpenPlan} className="text-sm font-medium text-sage hover:text-[#A8E6CF]">
                Modifier dans le conseillancier →
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Arrêt d'un traitement */}
      <Modal isOpen={!!stopping} onClose={() => setStopping(null)} title={stopping ? `${stopping.name} : arrêté` : ''} size="sm">
        <label className="flex flex-col gap-1.5 text-[13px] text-stone">
          Raison (facultatif)
          <input
            value={stopReason}
            onChange={(e) => setStopReason(e.target.value)}
            placeholder="Ex. nausées, fin de la cure, avis du médecin…"
            className="h-10 rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal placeholder:text-mist"
          />
        </label>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setStopping(null)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              if (!stopping) return;
              setBusy(true);
              try {
                await p.onStopTreatment(stopping, stopReason.trim());
                setStopping(null);
              } finally {
                setBusy(false);
              }
            }}
          >
            Enregistrer l’arrêt
          </Button>
        </ModalFooter>
      </Modal>

      {/* Export */}
      <Modal isOpen={exportOpen} onClose={() => setExportOpen(false)} title="Exporter les traitements et conseils" description={`Un document daté au nom de ${firstName}, à transmettre par exemple à son médecin.`} size="sm">
        <div className="flex flex-col gap-2">
          {(
            [
              ['taken', `Ce que ${firstName} prend`],
              ['advised', 'Ce que vous conseillez'],
              ['stopped', 'Traitements arrêtés'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={exp[k]} onChange={() => setExp((e) => ({ ...e, [k]: !e[k] }))} className="h-4 w-4 accent-sage" />
              {l}
            </label>
          ))}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => void copyExport()}>
            {copied ? 'Texte copié ✓' : 'Copier le texte'}
          </Button>
          <Button variant="primary" onClick={printExport}>
            Imprimer ou enregistrer en PDF
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
