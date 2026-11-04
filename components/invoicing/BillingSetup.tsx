'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { EXTERNAL_TOOLS, INTEGRATIONS, TOOL_KEYS, canConnect, type BillingTool, type ExternalTool } from '@/lib/invoicing/billing-tools';

/** Écran par défaut de la facturation : garder son outil actuel, ou découvrir la facturation Afeia. */
export function BillingSetup({
  current,
  onChoose,
}: {
  current: BillingTool | null;
  onChoose: (tool: BillingTool) => Promise<void>;
}) {
  const [pick, setPick] = useState<ExternalTool | null>(current && current !== 'afeia' ? current : null);
  const [busy, setBusy] = useState<BillingTool | null>(null);
  const picked = pick ? EXTERNAL_TOOLS[pick] : null;

  const choose = async (t: BillingTool) => {
    setBusy(t);
    try {
      await onChoose(t);
    } finally {
      setBusy(null);
    }
  };

  const connectable = pick ? canConnect(pick) : false;
  const manualReason = pick && !connectable ? (INTEGRATIONS[pick] as { reason: string }).reason : '';
  const points = picked
    ? [
        ...(connectable ? [`crée en un clic le brouillon de facture dans ${picked.name}, client compris`] : []),
        'vous rappelle chaque séance terminée à facturer',
        ...(connectable ? [] : ['vous laisse cocher « facturée » une fois faite dans votre outil']),
        ...(picked.url ? [`ouvre ${picked.name} en un clic depuis la facturation`] : []),
        'exporte les séances du mois en CSV pour votre comptabilité',
      ]
    : [];

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[36px] font-medium text-charcoal">Facturation</h1>
        <p className="text-base text-[#C9CFDA]">Comment facturez-vous vos séances aujourd’hui ?</p>
        <p className="text-sm text-stone">Gardez votre outil actuel : Afeia s’y adapte. Vous pourrez changer à tout moment.</p>
      </section>

      <section aria-label="Votre outil actuel" className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
        <h2 className="text-base font-semibold text-charcoal">Je garde mon outil de facturation</h2>
        <div role="radiogroup" aria-label="Outil de facturation" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          {TOOL_KEYS.map((k) => {
            const t = EXTERNAL_TOOLS[k];
            const on = pick === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPick(k)}
                className="flex min-h-[76px] flex-col items-start gap-1 rounded-xl border p-3 text-left text-charcoal"
                style={{ borderColor: on ? '#6DD4B8' : '#2A3140', background: on ? '#23383B' : 'transparent' }}
              >
                <span className="flex w-full items-center gap-2 text-sm font-semibold">
                  <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-xs font-bold text-ink" style={{ background: t.color }}>
                    {t.name.slice(0, 1)}
                  </span>
                  {t.name}
                  {canConnect(k) && <span className="ml-auto rounded-full bg-[#1F3A33] px-2 py-0.5 text-[10px] font-semibold text-sage">Connexion</span>}
                </span>
                <span className="text-xs leading-[1.4] text-stone">{t.desc}</span>
              </button>
            );
          })}
        </div>
        {picked && pick && (
          <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-divider bg-surface-raised px-4 py-3.5">
            <span className="flex flex-[1_1_360px] flex-col gap-1.5">
              <span className="text-sm font-semibold text-charcoal">{picked.url ? `Avec ${picked.name}, Afeia :` : 'Sans connexion, Afeia :'}</span>
              {points.map((pt) => (
                <span key={pt} className="flex gap-2 text-[13px] leading-normal text-[#B8C1CF]">
                  <span aria-hidden="true" className="text-sage">✓</span>
                  {pt}
                </span>
              ))}
              <span className="text-xs text-stone">
                {connectable
                  ? `Connexion par clé API ${picked.name}, à l’étape suivante. Vous validez et envoyez chaque facture dans ${picked.name}.`
                  : `${manualReason ? `${manualReason} ` : ''}Vos factures restent dans ${picked.url ? picked.name : 'votre outil'}.`}
              </span>
            </span>
            <button type="button" disabled={!!busy} onClick={() => void choose(pick)} className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-[18px] text-sm font-semibold text-ink disabled:opacity-60">
              {busy === pick && <Spinner size="sm" />}
              {picked.url ? `Continuer avec ${picked.name}` : 'Continuer avec mon outil'}
            </button>
          </div>
        )}
      </section>

      <section aria-label="Facturation Afeia" className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[#4E3A55] bg-surface p-5">
        <span className="flex flex-[1_1_380px] flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-charcoal">Je facture avec Afeia</span>
            <DevBadge />
          </span>
          <span className="text-[13px] leading-[1.55] text-[#B8C1CF]">
            Factures depuis les séances, paiement en ligne, relances, export pour votre comptable. Vous pouvez le découvrir dès maintenant : certaines fonctions sont encore en test et peuvent évoluer.
          </span>
        </span>
        <button type="button" disabled={!!busy} onClick={() => void choose('afeia')} className="flex h-11 items-center gap-2 rounded-[10px] border border-[#4E3A55] px-4 text-sm font-semibold text-[#D9B8E8] disabled:opacity-60">
          {busy === 'afeia' && <Spinner size="sm" />}
          Découvrir la facturation Afeia
        </button>
      </section>
    </>
  );
}

export function DevBadge({ strong = false }: { strong?: boolean }) {
  return (
    <span className={`inline-flex h-[22px] items-center rounded-full px-[9px] text-xs font-semibold ${strong ? 'bg-[#4E3A55] text-[#F0DDF7]' : 'bg-[#2B2230] text-[#D9B8E8]'}`}>
      Module en cours de développement
    </span>
  );
}
