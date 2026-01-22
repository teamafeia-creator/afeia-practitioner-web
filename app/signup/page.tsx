'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim() || !fullName.trim()) {
        setError('Merci de renseigner votre nom, votre email et un mot de passe.');
        return;
      }
      if (password !== confirmation) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'practitioner'
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        setMessage('Inscription réussie. Redirection vers votre espace…');
        router.replace('/dashboard');
        return;
      }

      setMessage('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-orbs bg-sable flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/afeia_symbol.svg" alt="AFEIA" width={36} height={36} />
          <div>
            <div className="text-2xl font-semibold tracking-tight">Afeia</div>
            <div className="text-sm text-warmgray">Créer un compte</div>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="text-xl font-semibold text-charcoal">Inscription praticien</h1>
          <p className="text-sm text-warmgray mt-1">
            Rejoignez votre espace sécurisé pour gérer vos patients.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Input
              label="Nom complet"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Claire Martin"
              autoComplete="name"
              required
            />
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
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            {error ? (
              <div role="alert" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
                <div className="font-medium">Impossible de créer le compte</div>
                <div className="text-marine mt-1">{error}</div>
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-teal/30 bg-teal/10 p-3 text-sm text-marine">
                {message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" loading={loading}>
              Créer mon compte
            </Button>

            <div className="text-xs text-warmgray">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-teal hover:underline">
                Se connecter
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
