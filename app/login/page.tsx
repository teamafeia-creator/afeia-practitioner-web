'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { SESSION_COOKIE } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = useMemo(() => searchParams.get('from') || '/dashboard', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError('Merci de renseigner un email et un mot de passe.');
        return;
      }

      document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
      router.push(from);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-charcoal">Connexion</h1>
      <p className="text-sm text-warmgray mt-1">
        Accedez a vos dossiers, consultations, plans et donnees Circular.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@exemple.com"
          autoComplete="email"
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          autoComplete="current-password"
          required
        />

        {error ? (
          <div role="alert" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
            <div className="font-medium">Impossible de vous connecter</div>
            <div className="text-marine mt-1">{error}</div>
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={loading}>
          Se connecter
        </Button>

        <div className="text-xs text-warmgray leading-relaxed">
          <span className="font-medium text-marine">Note MVP :</span> cette demo accepte n importe quels identifiants non vides.
        </div>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-sable flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/afeia_symbol.svg" alt="AFEIA" width={36} height={36} />
          <div>
            <div className="text-2xl font-semibold tracking-tight">Afeia</div>
            <div className="text-sm text-warmgray">Espace Naturopathe</div>
          </div>
        </div>

        <Suspense fallback={<div className="text-center text-warmgray">Chargement...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-4 text-xs text-warmgray text-center">
          RGPD : hebergement UE, RBAC strict, audit trail. Afeia ne remplace jamais un medecin.
        </div>
      </div>
    </main>
  );
}
