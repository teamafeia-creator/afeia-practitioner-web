'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import { EXTERNAL_TOOLS, INTEGRATIONS, canConnect, toolPhrase, type ExternalTool } from '@/lib/invoicing/billing-tools';
import { ToolConnectionCard, authedFetch, type ConnectionState } from './ToolConnectionCard';
import { eur } from '@/lib/invoicing/display';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { ToBill } from './NewInvoiceModal';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Séances terminées du mois en cours, au format CSV (séparateur « ; » pour Excel en français). */
async function exportMonthSessions(practitionerId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data, error } = await supabase
    .from('appointments')
    .select('starts_at, consultation_type:consultation_types(name, price_cents), patient:consultants(name, first_name, last_name, email)')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'completed')
    .gte('starts_at', start.toISOString())
    .lte('starts_at', now.toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  type Raw = {
    starts_at: string;
    consultation_type: { name: string; price_cents: number | null } | null;
    patient: { name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
  };
  const rows = ((data ?? []) as unknown as Raw[]).map((a) => [
    new Date(a.starts_at).toLocaleDateString('fr-FR'),
    a.patient?.name || [a.patient?.first_name, a.patient?.last_name].filter(Boolean).join(' ') || 'Consultant',
    a.patient?.email ?? '',
    a.consultation_type?.name ?? 'Séance',
    a.consultation_type?.price_cents != null ? (a.consultation_type.price_cents / 100).toFixed(2).replace('.', ',') : '',
  ]);
  const csv = [['Date', 'Consultant', 'E-mail', 'Séance', 'Tarif (€)'], ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
  const href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = `seances_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(href);
  return { count: rows.length, month: MONTHS[now.getMonth()] };
}

/** Le praticien garde son outil : Afeia lui rappelle les séances à facturer et ouvre son outil. */
export function ExternalToolView({
  tool,
  toBill,
  practitionerId,
  onChangeMode,
  onChooseAfeia,
  onMarked,
}: {
  tool: ExternalTool;
  toBill: ToBill[];
  practitionerId: string;
  onChangeMode: () => void;
  onChooseAfeia: () => void;
  onMarked: (appointmentId: string) => void;
}) {
  const t = EXTERNAL_TOOLS[tool];
  const name = toolPhrase(tool);
  const [busy, setBusy] = useState<string | null>(null);
  const connectable = canConnect(tool);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [connLoaded, setConnLoaded] = useState(!connectable);
  const live = connectable && connection?.status === 'active';

  const loadConnection = useCallback(async () => {
    if (!canConnect(tool)) return;
    try {
      const res = await authedFetch('/api/invoicing/connections');
      const body = (await res.json()) as { connections?: ConnectionState[] };
      setConnection(body.connections?.find((c) => c.provider === tool) ?? null);
    } catch {
      setConnection(null);
    } finally {
      setConnLoaded(true);
    }
  }, [tool]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  async function push(row: ToBill) {
    setBusy(row.appointmentId);
    const res = await authedFetch(`/api/invoicing/connections/${tool}/push`, { method: 'POST', body: JSON.stringify({ appointmentId: row.appointmentId }) });
    const body = (await res.json().catch(() => ({}))) as { message?: string; url?: string | null };
    setBusy(null);
    if (res.status === 409 && body.message?.includes('déjà')) {
      showToast.success(body.message);
      return onMarked(row.appointmentId);
    }
    if (!res.ok) {
      showToast.error(body.message ?? 'Le brouillon n’a pas pu être créé.');
      if (res.status === 502 || res.status === 409) void loadConnection();
      return;
    }
    showToast.success(`Brouillon créé dans ${t.name} pour ${row.who.split(' ')[0]} : relisez-le puis envoyez-le depuis ${t.name}.`);
    onMarked(row.appointmentId);
  }

  async function mark(row: ToBill) {
    setBusy(row.appointmentId);
    const { error } = await supabase
      .from('appointments')
      .update({ invoiced_externally_at: new Date().toISOString() })
      .eq('id', row.appointmentId)
      .eq('practitioner_id', practitionerId);
    setBusy(null);
    if (error) return showToast.error('La séance n’a pas pu être marquée comme facturée.');
    showToast.success(`Séance de ${row.who.split(' ')[0]} marquée comme facturée.`);
    onMarked(row.appointmentId);
  }

  async function exportCsv() {
    setBusy('csv');
    try {
      const r = await exportMonthSessions(practitionerId);
      showToast.success(r.count ? `Export CSV des séances de ${r.month} téléchargé (${r.count}).` : `Aucune séance terminée en ${r.month} : fichier vide téléchargé.`);
    } catch {
      showToast.error('L’export CSV a échoué.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="font-serif text-[36px] font-medium text-charcoal">Facturation</h1>
          <p className="flex flex-wrap items-center gap-2 text-[15px] text-stone">
            Vous facturez avec {name}.
            {live ? (
              <span className="inline-flex h-6 items-center rounded-full bg-[#1F3A33] px-2.5 text-xs font-semibold text-sage">Connecté</span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-full bg-[#2A3140] px-2.5 text-xs font-semibold text-[#C9CFDA]">Suivi manuel</span>
            )}
          </p>
        </div>
        <button type="button" onClick={onChangeMode} className="h-11 rounded-[10px] border border-divider px-3.5 text-sm text-[#B8C1CF] hover:border-sage">Changer de mode</button>
        {t.url && (
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-[10px] bg-sage px-4 text-sm font-semibold text-ink no-underline hover:bg-sage-deep">
            Ouvrir {t.name} ↗
          </a>
        )}
      </section>

      {connectable && connLoaded && (
        <ToolConnectionCard key={connection?.status ?? 'none'} provider={tool as 'pennylane' | 'abby'} connection={connection} onChange={() => void loadConnection()} />
      )}
      {!connectable && (INTEGRATIONS[tool] as { reason: string }).reason && (
        <p className="text-[13px] text-stone">{(INTEGRATIONS[tool] as { reason: string }).reason} Afeia vous aide donc à ne rien oublier : séances à facturer, lien direct et export CSV.</p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-charcoal">
            {toBill.length ? `${toBill.length} séance${toBill.length > 1 ? 's' : ''} terminée${toBill.length > 1 ? 's' : ''} à facturer` : 'Séances à facturer'}
          </h2>
          <span className="text-[13px] text-stone">
            {live ? `30 derniers jours · Afeia crée le brouillon dans ${name}` : `30 derniers jours · cochez quand la facture est faite dans ${name}`}
          </span>
        </div>
        {toBill.map((r) => (
          <div key={r.appointmentId} className="flex flex-wrap items-center gap-3 rounded-xl border border-divider bg-surface-raised px-3.5 py-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold text-ink" style={{ background: colorOf(r.consultantId) }}>{initialsOf(r.who)}</span>
            <span className="flex flex-[1_1_200px] flex-col gap-0.5">
              <span className="text-sm font-medium text-charcoal">{r.who}</span>
              <span className="text-xs text-stone">{r.what} · {r.date}</span>
            </span>
            <span className="font-medium tabular-nums text-charcoal">{r.amount != null ? eur(r.amount) : '—'}</span>
            {live ? (
              <>
                <button
                  type="button"
                  disabled={busy === r.appointmentId || r.amount == null}
                  title={r.amount == null ? 'Ajoutez un tarif à ce type de consultation pour créer la facture.' : undefined}
                  onClick={() => void push(r)}
                  className="flex h-[38px] items-center gap-2 rounded-[10px] bg-sage px-3.5 text-[13px] font-semibold text-ink disabled:opacity-60"
                >
                  {busy === r.appointmentId && <Spinner size="sm" />}
                  Créer le brouillon dans {t.name}
                </button>
                <button
                  type="button"
                  disabled={busy === r.appointmentId}
                  onClick={() => void mark(r)}
                  className="h-[38px] rounded-[10px] px-2.5 text-[13px] text-stone hover:text-charcoal disabled:opacity-60"
                >
                  Déjà facturée
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy === r.appointmentId}
                onClick={() => void mark(r)}
                className="flex h-[38px] items-center gap-2 rounded-[10px] bg-sage px-3.5 text-[13px] font-semibold text-ink disabled:opacity-60"
              >
                {busy === r.appointmentId && <Spinner size="sm" />}
                Marquer comme facturée
              </button>
            )}
          </div>
        ))}
        {toBill.length === 0 && <p className="text-sm text-sage">✓ Toutes vos séances terminées sont facturées.</p>}
        <button
          type="button"
          disabled={busy === 'csv'}
          onClick={() => void exportCsv()}
          className="flex h-10 items-center gap-2 self-start rounded-[10px] border border-divider px-3.5 text-[13px] text-charcoal hover:border-sage disabled:opacity-60"
        >
          {busy === 'csv' && <Spinner size="sm" />}
          Exporter les séances du mois (CSV)
        </button>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-[14px] border border-dashed border-[#4E3A55] px-[18px] py-4">
        <span className="flex-[1_1_320px] text-[13px] leading-normal text-[#B8C1CF]">
          Curieux de la facturation intégrée ? <strong className="font-semibold text-[#D9B8E8]">Module en cours de développement</strong> : vous pouvez l’essayer et revenir à {name} à tout moment.
        </span>
        <button type="button" onClick={onChooseAfeia} className="h-[38px] rounded-[10px] border border-[#4E3A55] px-3.5 text-[13px] text-[#D9B8E8]">Découvrir</button>
      </section>
    </>
  );
}
