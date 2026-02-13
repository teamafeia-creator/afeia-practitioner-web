'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Identifiants admin incorrects');
      }

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants admin incorrects');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <Image
          src="/afeia_symbol.svg"
          alt="AFEIA"
          width={420}
          height={420}
          className="absolute left-1/2 top-1/2 w-80 -translate-x-1/2 -translate-y-1/2 opacity-5"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Image src="/afeia_symbol.svg" alt="AFEIA" width={32} height={32} />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-sage-200/70">AFEIA</p>
          <h1 className="mt-2 text-2xl font-semibold">Connexion Administrateur AFEIA</h1>
          <p className="mt-2 text-sm text-slate-300">
            Accès sécurisé réservé à l&apos;équipe AFEIA.
          </p>
        </div>

        <Card className="border border-white/10 bg-white/5 shadow-xl backdrop-blur">
          <CardContent className="space-y-6 p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label className="block text-sm text-slate-200">
                  Email admin
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="team.afeia@gmail.com"
                      autoComplete="email"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/40"
                    />
                  </div>
                </label>

                <label className="block text-sm text-slate-200">
                  Mot de passe
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/40"
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" loading={loading} size="lg">
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
