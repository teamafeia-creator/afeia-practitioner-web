'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { PageShell } from '../ui/PageShell';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { ChevronDown } from 'lucide-react';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => NAV.find((n) => pathname.startsWith(n.href))?.href ?? '/dashboard', [pathname]);
  const breadcrumb = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Tableau de bord', href: '/dashboard' }];

    const labelMap: Record<string, string> = {
      dashboard: 'Tableau de bord',
      patients: 'Patients',
      questionnaires: 'Questionnaires',
      settings: 'Paramètres',
      plans: 'Plans',
      consultations: 'Consultations',
      billing: 'Facturation',
      circular: 'Circular',
      onboarding: 'Onboarding'
    };

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      let label = labelMap[segment];

      if (!label && segments[0] === 'patients' && index === 1) label = 'Dossier patient';
      if (!label && segments[0] === 'questionnaires' && index === 1) label = 'Questionnaire';
      if (!label) label = segment.replace(/-/g, ' ');

      return { label, href };
    });
  }, [pathname]);

  const pageTitle = breadcrumb[breadcrumb.length - 1]?.label ?? 'Tableau de bord';

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

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
    <div className="min-h-screen bg-sable/80 text-charcoal">
      <div className="pointer-events-none fixed inset-0 -z-10 background-texture opacity-15" aria-hidden="true" />
      {/* Mobile topbar */}
      <div className="sticky top-0 z-30 border-b border-white/30 bg-white/80 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-white/60 transition hover:bg-white"
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
          <div className="sticky top-4 rounded-[24px] bg-sable/95 backdrop-blur-xl shadow-soft ring-1 ring-white/70">
            <Link
              href="/dashboard"
              className="group flex items-center gap-4 rounded-[18px] px-4 py-5 transition hover:bg-white/70"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal shadow-sm ring-1 ring-white/40">
                <Image src="/afeia_symbol_white.svg" alt="Afeia" width={28} height={28} />
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
                        ? 'bg-gradient-to-r from-teal/20 via-teal/10 to-transparent text-teal shadow-[0_12px_24px_rgba(42,128,128,0.16)] ring-1 ring-teal/20'
                        : 'text-marine hover:bg-teal/10 hover:translate-x-1'
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
            <div className="border-t border-white/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={userEmail ?? 'Naturopathe'} size="sm" />
                  <div>
                    <div className="text-xs text-warmgray">Connecté</div>
                    <div className="text-sm font-semibold text-charcoal">{userEmail ?? 'Naturopathe'}</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-6 rounded-[24px] glass-header px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <nav className="text-xs text-warmgray">
                  <ol className="flex flex-wrap items-center gap-2">
                    {breadcrumb.map((item, index) => (
                      <li key={item.href} className="flex items-center gap-2">
                        <Link href={item.href} className="transition hover:text-teal">
                          {item.label}
                        </Link>
                        {index < breadcrumb.length - 1 ? <span className="text-warmgray/60">/</span> : null}
                      </li>
                    ))}
                  </ol>
                </nav>
                <h1 className="text-2xl font-semibold text-charcoal md:text-3xl">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-medium text-charcoal shadow-sm ring-1 ring-white/60 transition hover:bg-white"
                  >
                    <Avatar name={userEmail ?? 'Naturopathe'} size="sm" />
                    <span className="hidden md:inline">{userEmail ?? 'Mon compte'}</span>
                    <ChevronDown className="h-4 w-4 text-warmgray" />
                  </button>
                  {userMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/90 backdrop-blur-lg shadow-soft ring-1 ring-white/60">
                      <div className="px-4 py-3 text-xs text-warmgray">Compte praticien</div>
                      <button
                        onClick={logout}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-charcoal transition hover:bg-teal/10"
                      >
                        Se déconnecter
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <PageShell>{children}</PageShell>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] bg-sable/95 backdrop-blur-xl shadow-soft">
            <div className="flex items-center justify-between px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal shadow-sm ring-1 ring-white/40">
                  <Image src="/afeia_symbol_white.svg" alt="Afeia" width={24} height={24} />
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
                        ? 'bg-gradient-to-r from-teal/20 via-teal/10 to-transparent text-teal shadow-[0_6px_16px_rgba(42,128,128,0.12)] ring-1 ring-teal/10'
                        : 'text-marine hover:bg-teal/10'
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
