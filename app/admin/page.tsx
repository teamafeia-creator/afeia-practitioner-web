'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function AdminDashboardPage() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('isAdmin');
    router.push('/admin/login');
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-teal-200/70">AFEIA — Administration</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">AFEIA — Administration</h1>
        <p className="mt-3 text-sm text-slate-300">Bienvenue dans l&apos;espace admin</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
        <p>
          Cette zone est réservée aux administrateurs AFEIA. Le contrôle d&apos;accès utilise
          actuellement un flag localStorage en attendant l&apos;intégration Supabase.
        </p>
      </div>

      <Button variant="outline" onClick={handleLogout}>
        Déconnexion admin
      </Button>
    </section>
  );
}
