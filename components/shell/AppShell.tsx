'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/patients', label: 'Patients' },
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
              className="rounded-xl px-3 py-2 ring-1 ring-black/10"
            >
              <span className="block h-0.5 w-5 bg-marine" />
              <span className="mt-1 block h-0.5 w-5 bg-marine" />
              <span className="mt-1 block h-0.5 w-5 bg-marine" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/afeia_symbol.svg" alt="Afeia" width={28} height={28} />
              <span className="font-semibold text-marine">Afeia</span>
            </div>
          </div>
          <Button variant="ghost" onClick={logout}>Déconnexion</Button>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden w-[280px] shrink-0 p-4 md:block">
          <div className="sticky top-4 rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
            <div className="flex items-center gap-3 px-4 py-4">
              <Image src="/afeia_symbol.svg" alt="Afeia" width={34} height={34} />
              <div>
                <div className="text-base font-semibold text-marine">Afeia</div>
                <div className="text-xs text-warmgray">Espace Naturopathe</div>
              </div>
            </div>
            <nav className="px-2 pb-2">
              {NAV.map((item) => {
                const isActive = active === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                      isActive
                        ? 'bg-teal/10 text-teal ring-1 ring-teal/20'
                        : 'text-marine hover:bg-sable/60'
                    )}
                  >
                    <span className="relative">
                      {item.label}
                      <span
                        className={cn(
                          'absolute -bottom-1 left-0 h-[2px] w-0 bg-aubergine transition-all group-hover:w-full',
                          isActive && 'w-full'
                        )}
                      />
                    </span>
                  </a>
                );
              })}
            </nav>
            <div className="border-t border-black/5 p-4">
              <div className="text-xs text-warmgray">Connecté en tant que</div>
              <div className="text-sm font-semibold text-charcoal">{userEmail ?? 'Naturopathe'}</div>
              <div className="mt-3">
                <Button variant="secondary" className="w-full" onClick={logout}>
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
            <div className="p-4 md:p-6">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] bg-white shadow-soft">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <Image src="/afeia_symbol.svg" alt="Afeia" width={30} height={30} />
                <div>
                  <div className="font-semibold text-marine">Afeia</div>
                  <div className="text-xs text-warmgray">Espace Naturopathe</div>
                </div>
              </div>
              <button
                aria-label="Fermer le menu"
                className="rounded-xl px-3 py-2 ring-1 ring-black/10"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="px-2">
              {NAV.map((item) => {
                const isActive = active === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block rounded-xl px-3 py-2 text-sm transition',
                      isActive ? 'bg-teal/10 text-teal ring-1 ring-teal/20' : 'text-marine hover:bg-sable/60'
                    )}
                  >
                    {item.label}
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
