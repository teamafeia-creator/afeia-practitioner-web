'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Contact2 } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { formatSiret, type AccountStatus, type CheckLevel, type ConcordanceResult, type PappersResult } from '@/lib/verification/types';

type ListItem = {
  id: string;
  name: string;
  email: string;
  status: AccountStatus;
  city: string;
  siretStatus: CheckLevel;
  createdAt: string;
  decidedAt: string | null;
};

type Detail = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  status: AccountStatus;
  city: string;
  school: string;
  year: number;
  siret: string;
  charterAcceptedAt: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  pappers: PappersResult | null;
  pappersCheckedAt: string | null;
  concordance: ConcordanceResult | null;
  checks: { id?: boolean; siret?: boolean; doc?: boolean };
  training: { name: string | null; url: string | null };
  identity: { name: string | null; url: string | null; deletedAt: string | null };
  decision: { status: AccountStatus; motive: string | null; at: string; by: string | null } | null;
  canUndo: boolean;
};

const ST: Record<AccountStatus, [string, string, string]> = {
  pending_validation: ['En attente', '#373131', '#E8A87C'],
  validated: ['Validée', '#23383B', '#6DD4B8'],
  info_requested: ['Complément demandé', '#1F2640', '#A9B8EC'],
  rejected: ['Refusée', '#3A2224', '#F2A3A3'],
};

const LEVEL: Record<CheckLevel, { bg: string; fg: string; border: string }> = {
  ok: { bg: '#23383B', fg: '#6DD4B8', border: '#2F5A50' },
  warn: { bg: '#373131', fg: '#E8A87C', border: '#5A4636' },
  ko: { bg: '#3A2224', fg: '#F2A3A3', border: '#6B3438' },
  unavailable: { bg: '#1C2230', fg: '#8B95A5', border: '#2A3140' },
};
const PAPPERS_BADGE: Record<CheckLevel, string> = { ok: 'Conforme', warn: 'À vérifier', ko: 'Non conforme', unavailable: 'Non vérifié' };
const RESULT_LABEL = { ok: 'Concordant', warn: 'À vérifier', ko: 'Non conforme' } as const;

const FACE = ['#6DD4B8', '#7B93DB', '#E8A5C6', '#E8A87C', '#A9B8EC', '#F2C94C'];
const faceColor = (id: string) => FACE[id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % FACE.length];
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function ago(iso: string | null): string {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} jours`;
}

function concordanceBadge(c: ConcordanceResult | null): string {
  if (!c || c.status === 'unavailable') return 'Lecture manuelle';
  if (c.status === 'ok') return 'Tout concorde';
  const n = c.rows.filter((r) => r.result !== 'ok').length;
  return `${n} écart${n > 1 ? 's' : ''}`;
}

function outcomeText(d: Detail): string {
  const f = d.firstName;
  switch (d.status) {
    case 'validated':
      return `Inscription validée. ${f} a reçu un e-mail de bienvenue et peut se connecter.`;
    case 'info_requested':
      return `Complément demandé par e-mail. La demande reviendra dans « À valider » quand ${f} aura répondu.`;
    case 'rejected':
      return `Inscription refusée. ${f} a été informé par e-mail, avec le motif.`;
    default:
      return '';
  }
}

function InscriptionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [tab, setTab] = useState<'attente' | 'traitees'>('attente');
  const [sel, setSel] = useState<string | null>(params.get('id'));
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [compose, setCompose] = useState<null | 'info_requested' | 'rejected'>(null);
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch('/api/admin/inscriptions', { credentials: 'include' });
    if (!res.ok) {
      showToast.error('Impossible de charger les inscriptions.');
      setItems([]);
      return;
    }
    const data = (await res.json()) as { items: ListItem[] };
    setItems(data.items);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/inscriptions/${id}`, { credentials: 'include' });
    setLoadingDetail(false);
    if (!res.ok) {
      setDetail(null);
      return;
    }
    setDetail((await res.json()) as Detail);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const pending = useMemo(() => (items ?? []).filter((i) => i.status === 'pending_validation'), [items]);
  const treated = useMemo(() => (items ?? []).filter((i) => i.status !== 'pending_validation'), [items]);
  const visible = useMemo(
    () => (items ?? []).filter((i) => (tab === 'attente' ? i.status === 'pending_validation' : i.status !== 'pending_validation') || i.id === sel),
    [items, tab, sel]
  );

  // Sélection par défaut : la première demande de l'onglet.
  useEffect(() => {
    if (!items) return;
    if (sel && items.some((i) => i.id === sel)) return;
    setSel(visible[0]?.id ?? null);
  }, [items, sel, visible]);

  // Onglet suivant la demande ouverte depuis l'e-mail (?id=), une seule fois.
  const tabFromLink = useRef(false);
  useEffect(() => {
    const id = params.get('id');
    if (tabFromLink.current || !id || !items) return;
    tabFromLink.current = true;
    const it = items.find((i) => i.id === id);
    if (it) setTab(it.status === 'pending_validation' ? 'attente' : 'traitees');
  }, [items, params]);

  useEffect(() => {
    setCompose(null);
    setMotif('');
    if (sel) void loadDetail(sel);
    else setDetail(null);
  }, [sel, loadDetail]);

  const pick = (id: string) => {
    setSel(id);
    router.replace(`/admin/inscriptions?id=${id}`, { scroll: false });
  };

  const pp = detail?.pappers ?? null;
  const cc = detail?.concordance ?? null;
  const ppLevel: CheckLevel = pp?.status ?? 'unavailable';
  const ccLevel: CheckLevel = cc?.status ?? 'unavailable';
  const checks = detail
    ? {
        id: ccLevel === 'ok' || !!detail.checks.id,
        siret: ppLevel === 'ok' || !!detail.checks.siret,
        doc: !!detail.checks.doc,
      }
    : { id: false, siret: false, doc: false };
  const allOk = checks.id && checks.siret && checks.doc;
  const isPending = detail?.status === 'pending_validation';

  async function toggleCheck(k: 'id' | 'siret' | 'doc') {
    if (!detail) return;
    const next = { ...detail.checks, [k]: !checks[k] };
    setDetail({ ...detail, checks: next });
    const res = await fetch(`/api/admin/inscriptions/${detail.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checks: { [k]: next[k] } }),
    });
    if (!res.ok) showToast.error('Le contrôle n’a pas été enregistré.');
  }

  async function recheck() {
    if (!detail) return;
    setBusy(true);
    await fetch(`/api/admin/inscriptions/${detail.id}/recheck`, { method: 'POST', credentials: 'include' });
    setBusy(false);
    await loadDetail(detail.id);
    void loadList();
  }

  async function decide(decision: AccountStatus, motive?: string) {
    if (!detail) return;
    setBusy(true);
    const res = await fetch(`/api/admin/inscriptions/${detail.id}/decision`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, motive }),
    });
    setBusy(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      showToast.error(body.error ?? 'La décision n’a pas été enregistrée.');
      return;
    }
    setCompose(null);
    setMotif('');
    await Promise.all([loadDetail(detail.id), loadList()]);
  }

  async function undo() {
    if (!detail) return;
    setBusy(true);
    const res = await fetch(`/api/admin/inscriptions/${detail.id}/decision`, { method: 'DELETE', credentials: 'include' });
    setBusy(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      showToast.error(body.error ?? 'Annulation impossible.');
      return;
    }
    showToast.success('Décision annulée : la demande est de nouveau à valider.');
    setTab('attente');
    await Promise.all([loadDetail(detail.id), loadList()]);
  }

  const checkRows = detail
    ? [
        {
          k: 'id' as const,
          l: ccLevel === 'ok' ? 'Pièce d’identité valide, identité concordante' : 'Identité vérifiée manuellement',
          auto: ccLevel === 'ok',
          tag: ccLevel === 'ok' ? 'Automatique · concordance' : concordanceBadge(cc),
          lvl: ccLevel,
        },
        {
          k: 'siret' as const,
          l: ppLevel === 'ok' ? 'SIRET actif et dirigeant identique' : 'SIRET vérifié manuellement',
          auto: ppLevel === 'ok',
          tag: ppLevel === 'ok' ? 'Automatique · Pappers' : PAPPERS_BADGE[ppLevel],
          lvl: ppLevel,
        },
        { k: 'doc' as const, l: 'Justificatif lisible et authentique', auto: false, tag: '', lvl: 'unavailable' as CheckLevel },
      ]
    : [];

  return (
    <div className="flex max-w-[1180px] flex-col gap-5 text-charcoal">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[32px] font-medium">Inscriptions</h1>
        <p className="text-[15px] text-stone">Vérifiez chaque praticien avant d&apos;ouvrir son espace. Délai annoncé : 48 h ouvrées.</p>
      </div>

      <div role="tablist" aria-label="Statut" className="flex gap-1 border-b border-divider">
        {(
          [
            ['attente', 'À valider', pending.length],
            ['traitees', 'Traitées', treated.length],
          ] as const
        ).map(([k, l, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setSel(null);
            }}
            className="-mb-px h-11 border-b-2 px-4 text-[15px] font-medium"
            style={{ borderColor: tab === k ? '#6DD4B8' : 'transparent', color: tab === k ? '#E8EDF4' : '#8B95A5' }}
          >
            {l} <span className="text-stone">{n}</span>
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <section aria-label="Demandes" className="flex min-w-0 max-w-[380px] flex-[1_1_300px] flex-col gap-2">
            {visible.length === 0 ? (
              <p className="rounded-[14px] border border-divider bg-surface p-5 text-sm text-stone">
                {tab === 'attente' ? 'Aucune inscription en attente. Bravo !' : 'Aucune demande traitée pour l’instant.'}
              </p>
            ) : (
              visible.map((r) => {
                const on = r.id === sel;
                const s = ST[r.status];
                const siret = r.siretStatus === 'ok' ? '✓' : r.siretStatus === 'warn' ? 'à vérifier' : r.siretStatus === 'ko' ? '✕' : 'non vérifié';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pick(r.id)}
                    aria-current={on ? 'true' : undefined}
                    className="flex items-center gap-3 rounded-[14px] border p-3.5 text-left"
                    style={{ borderColor: on ? '#2F5A50' : '#2A3140', background: on ? '#1C2230' : '#151A23' }}
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-ink" style={{ background: faceColor(r.id) }}>
                      {initials(r.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="truncate text-[15px] font-semibold">{r.name}</span>
                      <span className="text-[13px] text-stone">
                        {r.city} · {ago(r.createdAt)} · SIRET {siret}
                      </span>
                    </span>
                    <span className="flex-none rounded-full px-[9px] py-[3px] text-xs font-medium" style={{ background: s[1], color: s[2] }}>
                      {s[0]}
                    </span>
                  </button>
                );
              })
            )}
          </section>

          {sel && (
            <section aria-label="Détail de la demande" className="flex min-w-0 flex-[999_1_460px] flex-col gap-4 rounded-2xl border border-divider bg-surface p-6">
              {!detail || loadingDetail ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full font-serif text-xl font-semibold text-ink" style={{ background: faceColor(detail.id) }}>
                      {initials(detail.name)}
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <h2 className="font-serif text-2xl font-medium">{detail.name}</h2>
                      <span className="text-sm text-stone">
                        {detail.email} · inscrit {ago(detail.createdAt)}
                      </span>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: ST[detail.status][1], color: ST[detail.status][2] }}>
                      {ST[detail.status][0]}
                    </span>
                  </div>

                  <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-3.5 rounded-xl bg-surface-raised p-4">
                    {[
                      ['Activité', `Praticien · ${detail.city}`],
                      ['Formation', `${detail.school}, ${detail.year}`],
                      ['SIRET', formatSiret(detail.siret)],
                      ['Charte de pratique', detail.charterAcceptedAt ? 'Acceptée' : '—'],
                    ].map(([l, v]) => (
                      <div key={l} className="flex flex-col gap-1">
                        <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">{l}</dt>
                        <dd className="text-[15px]">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {detail.reply ? (
                    <div className="rounded-xl border border-[#2F3A66] bg-[#1F2640] px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#A9B8EC]">Réponse au complément · {ago(detail.repliedAt)}</span>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{detail.reply}</p>
                    </div>
                  ) : null}

                  {/* Pappers */}
                  <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: LEVEL[ppLevel].border }}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[15px] font-semibold">Vérification SIRET</span>
                      <span className="text-xs text-stone">automatique via Pappers</span>
                      <span className="flex-1" />
                      <span className="rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ background: LEVEL[ppLevel].bg, color: LEVEL[ppLevel].fg }}>
                        {PAPPERS_BADGE[ppLevel]}
                      </span>
                    </div>
                    <p className="text-sm leading-normal" style={{ color: LEVEL[ppLevel].fg }}>
                      {pp?.summary ?? 'Vérification pas encore lancée.'}
                    </p>
                    {pp?.rows.length ? (
                      <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-2.5">
                        {pp.rows.map((r) => (
                          <div key={r.label} className="flex flex-col gap-[3px]">
                            <dt className="text-xs text-stone">{r.label}</dt>
                            <dd className="text-sm" style={{ color: r.mark === 'ko' ? (ppLevel === 'ko' ? '#F2A3A3' : '#E8A87C') : '#E8EDF4' }}>
                              {r.mark === 'ok' ? '✓ ' : r.mark === 'ko' ? '✕ ' : ''}
                              {r.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-stone">
                      <span>Interrogé {detail.pappersCheckedAt ? ago(detail.pappersCheckedAt) : 'jamais'}</span>
                      <button type="button" onClick={recheck} disabled={busy} className="h-9 rounded-lg border border-divider px-3 text-[13px] text-charcoal hover:border-sage disabled:opacity-60">
                        Relancer la vérification
                      </button>
                      {pp?.url ? (
                        <a href={pp.url} target="_blank" rel="noopener noreferrer" className="text-sage hover:text-[#A8E6CF]">
                          Voir la fiche Pappers ↗
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Concordance */}
                  <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: LEVEL[ccLevel].border }}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[15px] font-semibold">Concordance des documents</span>
                      <span className="text-xs text-stone">lecture automatique de la pièce d&apos;identité et du certificat</span>
                      <span className="flex-1" />
                      <span className="rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ background: LEVEL[ccLevel].bg, color: LEVEL[ccLevel].fg }}>
                        {concordanceBadge(cc)}
                      </span>
                    </div>
                    {cc?.rows.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-sm">
                          <thead>
                            <tr className="text-left text-xs text-stone">
                              <th scope="col" className="py-1.5 pr-2 font-medium">Point vérifié</th>
                              <th scope="col" className="px-2 py-1.5 font-medium">Pièce d&apos;identité</th>
                              <th scope="col" className="px-2 py-1.5 font-medium">Certificat</th>
                              <th scope="col" className="px-2 py-1.5 font-medium">Déclaré / Pappers</th>
                              <th scope="col" className="py-1.5 pl-2 text-right font-medium">Résultat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cc.rows.map((r) => (
                              <tr key={r.label} className="border-t border-divider">
                                <th scope="row" className="py-2.5 pr-2 text-left font-medium">{r.label}</th>
                                <td className="px-2 py-2.5 text-[#C9CFDA]">{r.idDoc}</td>
                                <td className="px-2 py-2.5 text-[#C9CFDA]">{r.certificate}</td>
                                <td className="px-2 py-2.5 text-[#C9CFDA]">{r.declared}</td>
                                <td className="whitespace-nowrap py-2.5 pl-2 text-right">
                                  <span className="rounded-full px-[9px] py-[3px] text-xs font-semibold" style={{ background: LEVEL[r.result].bg, color: LEVEL[r.result].fg }}>
                                    {RESULT_LABEL[r.result]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    <p className="text-[13px] leading-normal" style={{ color: LEVEL[ccLevel].fg }}>
                      {cc?.summary ?? 'Comparez la pièce d’identité et le certificat avec les informations déclarées.'}
                    </p>
                  </div>

                  {/* Documents */}
                  {[
                    { icon: FileText, name: detail.training.name ?? 'Justificatif', sub: 'Justificatif de formation', url: detail.training.url },
                    {
                      icon: Contact2,
                      name: detail.identity.name ?? 'Pièce d’identité',
                      sub: detail.identity.deletedAt ? 'Pièce d’identité · supprimée après la décision' : 'Pièce d’identité · supprimée automatiquement après la décision',
                      url: detail.identity.url,
                    },
                  ].map((d) => (
                    <div key={d.sub} className="flex items-center gap-3 rounded-xl border border-divider px-3.5 py-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-sage-light text-sage">
                        <d.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{d.name}</span>
                        <span className="text-[13px] text-stone">{d.sub}</span>
                      </span>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-lg border border-divider px-3 text-[13px] text-charcoal hover:border-sage">
                          Ouvrir
                        </a>
                      ) : null}
                    </div>
                  ))}

                  <fieldset className="flex flex-col gap-1">
                    <legend className="mb-2 text-[15px] font-semibold">Contrôles</legend>
                    {checkRows.map((c) => (
                      <label key={c.k} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={checks[c.k]}
                          disabled={!isPending || c.auto}
                          onChange={() => void toggleCheck(c.k)}
                          className="h-[18px] w-[18px] flex-none accent-[#6DD4B8]"
                        />
                        <span className="flex-1">{c.l}</span>
                        {c.tag ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: LEVEL[c.lvl].bg, color: LEVEL[c.lvl].fg }}>
                            {c.tag}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </fieldset>

                  {isPending ? (
                    <div className="flex flex-col gap-3 border-t border-divider pt-2">
                      {compose ? (
                        <div className="flex flex-col gap-2">
                          <label htmlFor="motif" className="text-sm font-medium">
                            {compose === 'rejected' ? 'Motif du refus' : 'Élément à fournir'}
                          </label>
                          <textarea
                            id="motif"
                            rows={3}
                            value={motif}
                            onChange={(e) => setMotif(e.target.value)}
                            className="w-full rounded-[10px] border border-divider bg-cream px-3.5 py-3 text-sm leading-normal text-charcoal outline-none focus:border-sage"
                          />
                          <span className="text-[13px] text-stone">Ce message est envoyé par e-mail au praticien.</span>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCompose(null)} className="h-11 rounded-[10px] border border-divider px-3.5 text-sm">
                              Annuler
                            </button>
                            <button
                              type="button"
                              disabled={busy || !motif.trim()}
                              onClick={() => void decide(compose, motif.trim())}
                              className="h-11 rounded-[10px] px-4 text-sm font-semibold text-ink disabled:opacity-50"
                              style={{ background: compose === 'rejected' ? '#E57B7B' : '#7B93DB' }}
                            >
                              {compose === 'rejected' ? 'Confirmer le refus' : 'Envoyer la demande'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={!allOk || busy}
                              onClick={() => void decide('validated')}
                              className="h-11 rounded-[10px] px-[18px] text-sm font-semibold"
                              style={{ background: allOk ? '#6DD4B8' : '#2A3140', color: allOk ? '#0A0E14' : '#8B95A5', cursor: allOk ? 'pointer' : 'not-allowed' }}
                            >
                              Valider l&apos;inscription
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCompose('info_requested');
                                setMotif(`Bonjour ${detail.firstName}, pourriez-vous déposer une version plus lisible de votre justificatif de formation ?`);
                              }}
                              className="h-11 rounded-[10px] border border-divider px-3.5 text-sm"
                            >
                              Demander un complément
                            </button>
                            <span className="flex-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setCompose('rejected');
                                setMotif('');
                              }}
                              className="h-11 rounded-[10px] px-3.5 text-sm text-[#F2A3A3]"
                            >
                              Refuser
                            </button>
                          </div>
                          <span className="text-[13px] text-stone">
                            {allOk
                              ? 'Tout est vérifié : la validation ouvre son espace et lui envoie un e-mail de bienvenue.'
                              : 'Cochez les trois contrôles pour pouvoir valider.'}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: ST[detail.status][1] }}>
                      <span className="flex-1 text-sm leading-normal" style={{ color: ST[detail.status][2] }}>
                        {outcomeText(detail)}
                        {detail.decision?.motive ? (
                          <span className="mt-1 block text-[13px] text-[#C9CFDA]">Motif : {detail.decision.motive}</span>
                        ) : null}
                      </span>
                      {detail.canUndo ? (
                        <button type="button" onClick={undo} disabled={busy} className="h-10 rounded-lg border border-divider px-3 text-[13px] text-charcoal">
                          Annuler la décision
                        </button>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminInscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionsContent />
    </Suspense>
  );
}
