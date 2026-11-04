'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { EXTERNAL_TOOLS, INTEGRATIONS } from '@/lib/invoicing/billing-tools';
import type { ConnectorProvider, VatMode } from '@/lib/invoicing/connectors/types';

export type ConnectionState = {
  provider: ConnectorProvider;
  status: 'active' | 'error' | 'revoked';
  accountLabel: string | null;
  vatMode: VatMode;
  lastError: string | null;
};

export async function authedFetch(url: string, init: RequestInit = {}) {
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
  });
}

const VAT_LABELS: Record<VatMode, string> = {
  franchise: 'Franchise en base de TVA (art. 293 B du CGI)',
  tva_20: 'TVA à 20 % (le tarif Afeia est TTC)',
};

/** Connexion à Pennylane ou Abby par clé API. */
export function ToolConnectionCard({
  provider,
  connection,
  onChange,
}: {
  provider: ConnectorProvider;
  connection: ConnectionState | null;
  onChange: () => void;
}) {
  const t = EXTERNAL_TOOLS[provider];
  const help = INTEGRATIONS[provider] as { keyHelp: string[]; keyUrl: string };
  const connected = connection?.status === 'active';
  const broken = connection?.status === 'error';
  const [editing, setEditing] = useState(!connection);
  const [apiKey, setApiKey] = useState('');
  const [vatMode, setVatMode] = useState<VatMode>(connection?.vatMode ?? 'franchise');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy('save');
    setError(null);
    const res = await authedFetch(`/api/invoicing/connections/${provider}`, { method: 'POST', body: JSON.stringify({ apiKey: apiKey.trim(), vatMode }) });
    const body = (await res.json().catch(() => ({}))) as { message?: string; accountLabel?: string | null };
    setBusy(null);
    if (!res.ok) return setError(body.message ?? 'La connexion a échoué.');
    setApiKey('');
    setEditing(false);
    showToast.success(`${t.name} est connecté${body.accountLabel ? ` (${body.accountLabel})` : ''}.`);
    onChange();
  }

  async function remove() {
    setBusy('delete');
    const res = await authedFetch(`/api/invoicing/connections/${provider}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) return showToast.error('La déconnexion a échoué.');
    showToast.success(`${t.name} est déconnecté. La clé a été supprimée d’Afeia.`);
    setEditing(true);
    onChange();
  }

  if ((connected || broken) && !editing) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-divider bg-surface px-5 py-4">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-ink" style={{ background: t.color }}>
          {t.name.slice(0, 1)}
        </span>
        <span className="flex flex-[1_1_280px] flex-col gap-0.5">
          <span className="text-sm font-semibold text-charcoal">
            {broken ? `${t.name} : la clé API ne fonctionne plus` : `Connecté à ${t.name}${connection?.accountLabel ? ` · ${connection.accountLabel}` : ''}`}
          </span>
          <span className="text-xs text-stone">
            {broken ? 'Générez une nouvelle clé dans votre outil puis remplacez-la ici.' : `${VAT_LABELS[connection!.vatMode]} · les brouillons sont à valider dans ${t.name}.`}
          </span>
        </span>
        <button type="button" onClick={() => setEditing(true)} className="h-[38px] rounded-[10px] border border-divider px-3.5 text-[13px] text-charcoal hover:border-sage">
          {broken ? 'Remplacer la clé' : 'Modifier'}
        </button>
        <button type="button" disabled={!!busy} onClick={() => void remove()} className="flex h-[38px] items-center gap-2 rounded-[10px] px-3 text-[13px] text-stone hover:text-charcoal disabled:opacity-60">
          {busy === 'delete' && <Spinner size="sm" />}
          Déconnecter
        </button>
      </section>
    );
  }

  return (
    <section aria-label={`Connecter ${t.name}`} className="flex flex-col gap-3 rounded-2xl border border-sage/40 bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-charcoal">Connecter {t.name}</h2>
        <p className="text-[13px] leading-normal text-[#B8C1CF]">
          Une fois connecté, Afeia crée pour vous le client et le brouillon de facture de chaque séance terminée. Rien n’est envoyé au consultant : vous relisez et envoyez la facture depuis {t.name}.
        </p>
      </div>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[13px] text-[#C9CFDA]">
        {help.keyHelp.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ol>
      <label className="flex flex-col gap-1.5 text-sm text-charcoal">
        Clé API {t.name}
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Collez la clé ici"
          className="h-11 rounded-[10px] border border-divider bg-surface-raised px-3 font-mono text-sm text-charcoal outline-none focus:border-sage"
        />
        <span className="text-xs text-stone">Exemple : une longue suite de lettres et de chiffres. Elle est chiffrée et n’est jamais réaffichée.</span>
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm text-charcoal">Votre régime de TVA</legend>
        {(Object.keys(VAT_LABELS) as VatMode[]).map((m) => (
          <label key={m} className="flex items-center gap-2 text-[13px] text-[#C9CFDA]">
            <input type="radio" name={`vat-${provider}`} checked={vatMode === m} onChange={() => setVatMode(m)} className="accent-sage" />
            {VAT_LABELS[m]}
          </label>
        ))}
        <span className="text-xs text-stone">La plupart des praticiens en micro-entreprise sont en franchise de TVA.</span>
      </fieldset>
      {error && <p role="alert" className="text-[13px] text-[#F0A6A6]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!!busy || apiKey.trim().length < 10} onClick={() => void save()} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
          {busy === 'save' && <Spinner size="sm" />}
          Vérifier et connecter
        </button>
        {(connected || broken) && (
          <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-[10px] px-3 text-sm text-stone hover:text-charcoal">Annuler</button>
        )}
        <a href={help.keyUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-sage underline-offset-2 hover:underline">Ouvrir {t.name} ↗</a>
      </div>
    </section>
  );
}
