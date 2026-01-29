'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { PageShell } from '../ui/PageShell';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { supabase } from '../../lib/supabase';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/patients', label: 'Patients' },
  { href: '/questionnaires', label: 'Questionnaires' },
  { href: '/settings', label: 'Paramètres' }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const active = useMemo(() => NAV.find((n) => pathname.startsWith(n.href))?.href ?? '/dashboard', [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        setCheckingAuth(false);
        return;
      }

      setUserEmail(data.session.user.email ?? null);
      setCheckingAuth(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        setUserEmail(null);
        router.replace('/login');
        return;
      }
      setUserEmail(session.user.email ?? null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    router.replace('/login');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-sable flex items-center justify-center">
        <div className="text-warmgray">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sable/40">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/10 transition hover:bg-white"
            >
              <span className="block h-0.5 w-5 bg-marine" />
              <span className="mt-1 block h-0.5 w-5 bg-marine" />
              <span className="mt-1 block h-0.5 w-5 bg-marine" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/afeia_symbol.svg" alt="Afeia" width={34} height={34} />
              <div>
                <span className="block text-sm font-semibold text-marine">Afeia</span>
                <span className="block text-[11px] text-warmgray">Espace praticien</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <Button variant="ghost" onClick={logout}>Déconnexion</Button>
          </div>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden w-[288px] shrink-0 p-4 md:block">
          <div className="sticky top-4 rounded-[20px] bg-gradient-to-b from-white via-sable/70 to-white/80 shadow-soft ring-1 ring-black/5">
            <Link
              href="/dashboard"
              className="group flex items-center gap-4 rounded-[18px] px-4 py-5 transition hover:bg-white/70"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-black/5">
                <Image src="/afeia_symbol.svg" alt="Afeia" width={34} height={34} />
              </div>
              <div>
                <div className="text-lg font-semibold text-marine">Afeia</div>
                <div className="text-xs text-warmgray">Espace praticien</div>
              </div>
            </Link>
            <nav className="px-3 pb-3">
              {NAV.map((item) => {
                const isActive = active === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition duration-200',
                      isActive
                        ? 'bg-white/80 text-teal shadow-[0_6px_16px_rgba(42,128,128,0.12)] ring-1 ring-teal/10'
                        : 'text-marine hover:bg-white/60'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition',
                          isActive ? 'bg-teal/70 shadow-[0_0_0_4px_rgba(42,128,128,0.12)]' : 'bg-transparent'
                        )}
                      />
                      {item.label}
                    </span>
                    <span className={cn('text-xs text-warmgray transition group-hover:text-teal', isActive && 'text-teal')}>
                      →
                    </span>
                  </a>
                );
              })}
            </nav>
            <div className="border-t border-black/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-warmgray">Connecté en tant que</div>
                  <div className="text-sm font-semibold text-charcoal">{userEmail ?? 'Naturopathe'}</div>
                </div>
                <NotificationDropdown />
              </div>
              <div>
                <Button variant="secondary" className="w-full" onClick={logout}>
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <PageShell>{children}</PageShell>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] bg-gradient-to-b from-white via-sable/70 to-white shadow-soft">
            <div className="flex items-center justify-between px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-black/5">
                  <Image src="/afeia_symbol.svg" alt="Afeia" width={30} height={30} />
                </div>
                <div>
                  <div className="font-semibold text-marine">Afeia</div>
                  <div className="text-xs text-warmgray">Espace praticien</div>
                </div>
              </Link>
              <button
                aria-label="Fermer le menu"
                className="rounded-xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="px-3">
              {NAV.map((item) => {
                const isActive = active === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition duration-200',
                      isActive
                        ? 'bg-white/80 text-teal shadow-[0_6px_16px_rgba(42,128,128,0.12)] ring-1 ring-teal/10'
                        : 'text-marine hover:bg-white/60'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition',
                          isActive ? 'bg-teal/70 shadow-[0_0_0_4px_rgba(42,128,128,0.12)]' : 'bg-transparent'
                        )}
                      />
                      {item.label}
                    </span>
                    <span className={cn('text-xs text-warmgray transition', isActive && 'text-teal')}>
                      →
                    </span>
                  </a>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-black/5 p-4">
              <Button variant="secondary" className="w-full" onClick={logout}>
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
