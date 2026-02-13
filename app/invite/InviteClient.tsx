'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { claimConsultantInvite } from '../../services/invites';
import { fetchAnamneseStatus } from '../../services/anamnese';

export default function InviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(data.session));
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setClaimError("Le lien d'invitation est introuvable.");
      return;
    }

    if (!sessionReady || !isAuthenticated || claiming || claimSuccess) return;

    async function claimInvite() {
      setClaiming(true);
      setClaimError(null);
      try {
        const consultantId = await claimConsultantInvite(token);
        const status = await fetchAnamneseStatus(consultantId);
        if (status === 'PENDING') {
          router.replace('/onboarding/anamnese');
          return;
        }
        setClaimSuccess(true);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Lien invalide ou expiré.');
      } finally {
        setClaiming(false);
      }
    }

    claimInvite();
  }, [token, sessionReady, isAuthenticated, claimSuccess, claiming, router]);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setAuthLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setAuthError('Merci de renseigner un email et un mot de passe.');
        return;
      }
      if (password !== confirmation) {
        setAuthError('Les mots de passe ne correspondent pas.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'consultant'
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        setAuthMessage('Compte créé. Validation du lien en cours…');
        setIsAuthenticated(true);
        return;
      }

      setAuthMessage('Compte créé. Vérifiez votre email pour confirmer.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setAuthLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setAuthError('Merci de renseigner un email et un mot de passe.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthMessage('Connexion réussie. Validation du lien en cours…');
      setIsAuthenticated(true);
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Image src="/afeia_symbol.svg" alt="AFEIA" width={36} height={36} />
          <div>
            <div className="text-2xl font-semibold tracking-tight">Afeia</div>
            <div className="text-sm text-stone">Invitation consultant</div>
          </div>
        </div>

        <Card className="p-6">
          {claimError ? (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-charcoal">
              {claimError}
            </div>
          ) : null}

          {claiming ? (
            <div className="text-sm text-stone">Validation du lien en cours...</div>
          ) : null}

          {claimSuccess ? (
            <div className="rounded-xl border border-sage/30 bg-sage-light p-4 text-sm text-charcoal">
              Compte activé. Vous pouvez fermer cette page.
            </div>
          ) : null}

          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'signup' ? 'primary' : 'secondary'}
                  className="flex-1"
                  onClick={() => setMode('signup')}
                >
                  Créer un compte
                </Button>
                <Button
                  type="button"
                  variant={mode === 'login' ? 'primary' : 'secondary'}
                  className="flex-1"
                  onClick={() => setMode('login')}
                >
                  Se connecter
                </Button>
              </div>

              {mode === 'signup' ? (
                <form onSubmit={handleSignup} className="space-y-3">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="prenom@exemple.com"
                    required
                  />
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <Input
                    label="Confirmer le mot de passe"
                    type="password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  {authError ? (
                    <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-charcoal">
                      {authError}
                    </div>
                  ) : null}
                  {authMessage ? (
                    <div className="rounded-xl border border-sage/30 bg-sage-light p-3 text-sm text-charcoal">
                      {authMessage}
                    </div>
                  ) : null}
                  <Button type="submit" className="w-full" loading={authLoading}>
                    Créer mon compte
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-3">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="prenom@exemple.com"
                    required
                  />
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  {authError ? (
                    <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-charcoal">
                      {authError}
                    </div>
                  ) : null}
                  {authMessage ? (
                    <div className="rounded-xl border border-sage/30 bg-sage-light p-3 text-sm text-charcoal">
                      {authMessage}
                    </div>
                  ) : null}
                  <Button type="submit" className="w-full" loading={authLoading}>
                    Se connecter
                  </Button>
                </form>
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
