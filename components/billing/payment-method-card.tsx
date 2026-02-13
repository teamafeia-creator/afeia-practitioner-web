// components/billing/payment-method-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { PaymentMethod } from '@/lib/billing/types';
import { formatCardBrand, formatCardExpiry } from '@/lib/billing/utils';

interface PaymentMethodCardProps {
  paymentMethods: PaymentMethod[];
}

function CardIcon({ brand }: { brand: string | null }) {
  const brandLower = brand?.toLowerCase();

  // SVG icons pour les principales marques de cartes
  if (brandLower === 'visa') {
    return (
      <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold italic">VISA</span>
      </div>
    );
  }

  if (brandLower === 'mastercard') {
    return (
      <div className="w-10 h-6 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-[#EB001B] -mr-1.5" />
        <div className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-80" />
      </div>
    );
  }

  if (brandLower === 'amex') {
    return (
      <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">AMEX</span>
      </div>
    );
  }

  // Icône générique pour les autres cartes
  return (
    <div className="w-10 h-6 bg-cream rounded flex items-center justify-center">
      <svg className="w-5 h-5 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    </div>
  );
}

function SepaIcon() {
  return (
    <div className="w-10 h-6 bg-[#002855] rounded flex items-center justify-center">
      <span className="text-white text-[7px] font-bold">SEPA</span>
    </div>
  );
}

export function PaymentMethodCard({ paymentMethods }: PaymentMethodCardProps) {
  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moyen de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-charcoal">Aucun moyen de paiement enregistré</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moyens de paiement</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {paymentMethods.map((pm) => (
            <li
              key={pm.id}
              className="flex items-center gap-3 p-3 bg-cream/60 rounded-xl"
            >
              {pm.type === 'card' ? (
                <CardIcon brand={pm.card_brand} />
              ) : pm.type === 'sepa_debit' ? (
                <SepaIcon />
              ) : (
                <div className="w-10 h-6 bg-cream rounded" />
              )}

              <div className="flex-1 min-w-0">
                {pm.type === 'card' && (
                  <>
                    <p className="text-sm font-medium text-charcoal">
                      {formatCardBrand(pm.card_brand)} •••• {pm.card_last4}
                    </p>
                    <p className="text-xs text-charcoal">
                      Expire {formatCardExpiry(pm.card_exp_month, pm.card_exp_year)}
                    </p>
                  </>
                )}
                {pm.type === 'sepa_debit' && (
                  <>
                    <p className="text-sm font-medium text-charcoal">
                      SEPA •••• {pm.sepa_last4}
                    </p>
                    <p className="text-xs text-charcoal">Prélèvement automatique</p>
                  </>
                )}
              </div>

              {pm.is_default && (
                <Badge variant="info">Par défaut</Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
