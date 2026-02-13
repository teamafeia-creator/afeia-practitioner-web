'use client';

import { Banknote, CreditCard, Building2, ArrowRightLeft } from 'lucide-react';
import type { PaymentMethod } from '@/lib/invoicing/types';

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  especes: { label: 'Especes', icon: Banknote },
  cheque: { label: 'Cheque', icon: Building2 },
  cb: { label: 'CB', icon: CreditCard },
  virement: { label: 'Virement', icon: ArrowRightLeft },
  stripe: { label: 'En ligne', icon: CreditCard },
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod | null }) {
  if (!method) return <span className="text-sm text-stone">-</span>;

  const config = METHOD_CONFIG[method];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-charcoal">
      <Icon className="h-3.5 w-3.5 text-stone" />
      {config.label}
    </span>
  );
}
