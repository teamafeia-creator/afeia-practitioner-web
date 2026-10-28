'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Props = {
  firstName: string;
  onUpgrade: () => void;
  upgrading: boolean;
  onLearnMore: () => void;
  onOpenCycle: (() => void) | null;
};

const PERKS = [
  'Revue du matin : alertes quand le sommeil ou la VFC décrochent',
  'Courbes superposées aux phases du cycle',
  'Indicateurs de bien-être, sans visée médicale',
];

/** Offre Standard : présentation de l'objet connecté (Premium). */
export function ConnectedObjectLocked({ firstName, onUpgrade, upgrading, onLearnMore, onOpenCycle }: Props) {
  const ghost = Array.from({ length: 20 }, (_, i) => 50 + Math.round((Math.sin(i * 1.3) + 1) * 22));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[26px] font-medium">Objet connecté</h2>
        <span className="text-sm text-stone">Inclus dans l&apos;offre Premium</span>
      </div>
      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-divider bg-surface p-6">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          <h3 className="font-serif text-[22px] leading-tight">Voir les nuits de {firstName} entre deux séances</h3>
          <p className="text-[15px] leading-relaxed text-[#C9CFDA]">
            Avec un objet connecté, le sommeil, la variabilité cardiaque et l&apos;activité remontent ici chaque matin, croisés avec son cycle.
          </p>
          <ul className="flex flex-col gap-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-none text-sage" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="primary" onClick={onUpgrade} loading={upgrading}>
              Proposer Premium à {firstName}
            </Button>
            <Button variant="secondary" onClick={onLearnMore}>
              Voir un exemple
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2 rounded-xl border border-divider bg-cream p-4" aria-hidden="true">
          <span className="text-xs text-stone">Sommeil · 30 nuits aperçu</span>
          <svg viewBox="0 0 300 124" className="h-auto w-full opacity-40">
            {ghost.map((h, i) => (
              <rect key={i} x={4 + i * 14.8} y={120 - h} width={9} height={h} rx={2} fill="#6DD4B8" />
            ))}
          </svg>
          <span className="text-xs text-mist">Illustration. Les données apparaîtront après activation par {firstName}.</span>
        </div>
      </section>
      {onOpenCycle ? (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-divider p-5">
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
            <span className="text-[15px] font-semibold">Sans objet connecté, le cycle reste suivi</span>
            <span className="text-sm text-stone">{firstName} saisit ses dates et ressentis dans le journal ; l&apos;onglet Cycle les croise avec ses symptômes.</span>
          </div>
          <Button variant="secondary" onClick={onOpenCycle}>
            Ouvrir le cycle
          </Button>
        </section>
      ) : null}
    </div>
  );
}
