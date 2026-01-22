'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function onRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Merci de renseigner votre email.');
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage('Un email de réinitialisation vient de vous être envoyé.');
    } finally {
      setLoading(false);
    }
  }

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!newPassword.trim()) {
        setError('Merci de renseigner un nouveau mot de passe.');
        return;
      }
      if (newPassword !== confirmation) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage('Mot de passe mis à jour. Vous pouvez vous connecter.');
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
            <div className="text-sm text-warmgray">Mot de passe oublié</div>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="text-xl font-semibold text-charcoal">Réinitialiser votre accès</h1>
          <p className="text-sm text-warmgray mt-1">
            {hasSession
              ? 'Définissez un nouveau mot de passe sécurisé.'
              : 'Recevez un lien de réinitialisation sécurisé par email.'}
          </p>

          <form onSubmit={hasSession ? onUpdatePassword : onRequestReset} className="mt-5 space-y-4">
            {hasSession ? (
              <>
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              </>
            ) : (
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.com"
                autoComplete="email"
                required
              />
            )}

            {error ? (
              <div role="alert" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
                <div className="font-medium">Impossible de traiter la demande</div>
                <div className="text-marine mt-1">{error}</div>
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-teal/30 bg-teal/10 p-3 text-sm text-marine">
                {message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" loading={loading}>
              {hasSession ? 'Mettre à jour le mot de passe' : 'Envoyer le lien de réinitialisation'}
            </Button>

            <div className="text-xs text-warmgray">
              <Link href="/login" className="text-teal hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
