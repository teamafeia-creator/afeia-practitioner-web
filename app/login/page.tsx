'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = useMemo(() => searchParams.get('from') || '/dashboard', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      const normalizedEmail = email.trim().toLowerCase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.replace(from);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-charcoal">Connexion</h1>
            <p className="text-warmgray mt-2">
              Accédez à vos dossiers et consultations
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-warmgray">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  autoComplete="email"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 bg-white text-charcoal placeholder:text-warmgray/60 focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-warmgray">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-neutral-200 bg-white text-charcoal placeholder:text-warmgray/60 focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warmgray hover:text-charcoal transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 text-teal focus:ring-teal/20"
                />
                <span className="text-sm text-warmgray">Se souvenir de moi</span>
              </label>
              <Link
                href="/reset-password"
                className="text-sm text-teal hover:text-teal-deep transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-accent-danger/10 border border-accent-danger/20 p-4"
              >
                <p className="text-sm text-accent-danger">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-warmgray">
              Pas encore de compte ?{' '}
              <Link
                href="/signup"
                className="text-teal hover:text-teal-deep font-medium transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-warmgray">ou</span>
            </div>
          </div>

          {/* Demo info */}
          <div className="rounded-xl bg-teal/5 border border-teal/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-charcoal">Mode démo disponible</p>
                <p className="text-xs text-warmgray mt-1">
                  Explorez l&apos;application avec des données de démonstration.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sable via-white to-teal/5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          {/* Logo and branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shadow-glow"
              >
                <Image
                  src="/afeia_symbol.svg"
                  alt="AFEIA"
                  width={32}
                  height={32}
                  className="brightness-0 invert"
                />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-charcoal">AFEIA</h2>
                <p className="text-sm text-warmgray">Espace Naturopathe</p>
              </div>
            </div>
          </motion.div>

          {/* Login form */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-warmgray">
              RGPD : hébergement UE, RBAC strict, audit trail.
            </p>
            <p className="text-xs text-warmgray mt-1">
              AFEIA ne remplace jamais un médecin.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Link href="/welcome" className="text-xs text-teal hover:underline">
                Découvrir AFEIA
              </Link>
              <span className="text-neutral-300">|</span>
              <Link href="#" className="text-xs text-teal hover:underline">
                Politique de confidentialité
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
