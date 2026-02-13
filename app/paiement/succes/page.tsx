'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream/30 to-white p-4">
      <div className="glass-card rounded-lg p-8 text-center max-w-md w-full">
        <CheckCircle2 className="h-16 w-16 text-sage mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-charcoal mb-2">
          Paiement recu
        </h1>
        <p className="text-sm text-stone mb-6">
          Votre paiement a ete traite avec succes. Vous recevrez une confirmation par email.
        </p>
        <Link
          href="/"
          className="text-sm text-sage hover:text-sage/80 underline underline-offset-2"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
