'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';

const inputClass =
  'h-12 w-full rounded-[10px] border border-divider bg-surface px-3.5 text-[15px] text-charcoal placeholder:text-mist outline-none transition focus:border-sage focus:ring-[3px] focus:ring-sage/20';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = useMemo(() => searchParams.get('from') || '/dashboard', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Renseignez votre adresse e-mail et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? 'Adresse e-mail ou mot de passe incorrect.'
            : /not confirmed/i.test(signInError.message)
              ? 'Confirmez d’abord votre adresse e-mail avec le lien reçu à l’inscription.'
              : signInError.message
        );
        return;
      }
      router.replace(from);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[400px] flex-col gap-5 self-center py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl font-medium leading-tight text-charcoal">Bon retour parmi nous</h1>
        <p className="text-[15px] text-stone">Connectez-vous à votre espace praticien.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-charcoal">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="pwd" className="text-sm font-medium text-charcoal">Mot de passe</label>
          <Link href="/reset-password" className="text-sm text-sage hover:text-sage-dark">Mot de passe oublié ?</Link>
        </div>
        <div className="flex h-12 items-center rounded-[10px] border border-divider bg-surface transition focus-within:border-sage focus-within:ring-[3px] focus-within:ring-sage/20">
          <input
            id="pwd"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-charcoal outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
            className="flex h-11 w-11 items-center justify-center text-stone hover:text-charcoal"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-[#C9CFDA]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-[18px] w-[18px] accent-sage"
        />
        Rester connectée sur cet appareil
      </label>

      {error && (
        <div role="alert" className="rounded-[10px] border border-[#5A4636] bg-terracotta-light px-4 py-3 text-sm text-[#F2D2BB]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-sage text-[15px] font-semibold text-ink transition hover:bg-sage-deep disabled:opacity-70"
      >
        {loading && <Spinner size="sm" />}
        Se connecter
      </button>

      <p className="text-center text-sm text-stone">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-sage hover:text-sage-dark">Créer un compte</Link>
        {' · '}
        <Link href="/decouvrir" className="text-sage hover:text-sage-dark">Découvrir Afeia</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-wrap bg-cream text-charcoal">
      <div className="flex min-w-0 flex-[1_1_480px] flex-col justify-between px-8 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light">
            <Leaf className="h-[22px] w-[22px] text-sage" strokeWidth={1.8} />
          </span>
          <span className="font-serif text-[22px] font-medium">Afeia</span>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone">
          <span>© Afeia</span>
          <a href="#" className="text-stone hover:text-charcoal">Confidentialité</a>
        </div>
      </div>

      <aside className="relative hidden min-h-[420px] min-w-0 flex-[1_1_480px] flex-col justify-end overflow-hidden border-l border-divider bg-surface p-14 lg:flex">
        <svg viewBox="0 0 600 600" aria-hidden="true" className="absolute -right-20 -top-10 h-[640px] w-[640px] opacity-90">
          <g fill="none" stroke="#2F5A50" strokeWidth="1.4">
            <path d="M300 560 C 300 400, 300 240, 300 60" />
            <path d="M300 470 C 230 440, 170 380, 150 300 C 230 310, 285 370, 300 470" />
            <path d="M300 400 C 370 370, 430 310, 450 230 C 370 240, 315 300, 300 400" />
            <path d="M300 300 C 240 270, 200 220, 190 150 C 255 165, 292 220, 300 300" />
            <path d="M300 230 C 350 205, 390 160, 400 100 C 345 110, 308 160, 300 230" />
            <path d="M300 150 C 280 120, 275 90, 285 60 C 305 85, 310 115, 300 150" />
          </g>
          <g fill="none" stroke="#6DD4B8" strokeWidth="1.2" opacity="0.5">
            <path d="M150 300 L 300 470" />
            <path d="M450 230 L 300 400" />
            <path d="M190 150 L 300 300" />
            <path d="M400 100 L 300 230" />
          </g>
        </svg>
        <div className="relative flex max-w-[460px] flex-col gap-[18px]">
          <p className="font-serif text-[30px] italic leading-snug">
            Moins de temps sur l&apos;administratif, plus d&apos;attention pour chaque consultant.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Dossiers & anamnèse', 'Conseillanciers', 'Suivi entre séances'].map((t) => (
              <span key={t} className="rounded-full border border-divider px-3 py-1.5 text-[13px] text-[#C9CFDA]">{t}</span>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
