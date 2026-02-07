'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import {
  ChevronDown,
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Sun
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/morning-review', label: 'Revue matinale', icon: Sun },
  { href: '/consultants', label: 'Consultants', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare, showBadge: true },
  { href: '/questionnaires', label: 'Questionnaires', icon: ClipboardList },
  { href: '/settings', label: 'Parametres', icon: Settings }
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard admin', icon: Shield },
  { href: '/admin/admins', label: 'Admins', icon: Shield },
  { href: '/admin/practitioners', label: 'Praticiens', icon: Users },
  { href: '/admin/consultants', label: 'Consultants', icon: Users },
  { href: '/admin/billing', label: 'Billing', icon: ClipboardList },
  { href: '/admin/circular', label: 'Circular', icon: MessageSquare }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { unreadCount: unreadMessages } = useMessageNotifications();

  const active = useMemo(() => {
    const match = [...NAV, ...ADMIN_NAV].find((n) => pathname.startsWith(n.href));
    return match?.href ?? '/dashboard';
  }, [pathname]);

  const pageTitle = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Tableau de bord';

    const labelMap: Record<string, string> = {
      dashboard: 'Tableau de bord',
      'morning-review': 'Revue matinale',
      consultants: 'Consultants',
      messages: 'Messages',
      questionnaires: 'Questionnaires',
      settings: 'Parametres',
      plans: 'Conseillanciers',
      consultations: 'Consultations',
      billing: 'Facturation',
      new: 'Nouveau consultant',
      admin: 'Admin',
      admins: 'Admins',
      practitioners: 'Praticiens',
      circular: 'Circular'
    };

    const lastSegment = segments[segments.length - 1];
    return labelMap[lastSegment] || lastSegment.replace(/-/g, ' ');
  }, [pathname]);

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

      const email = data.session.user.email ?? null;
      setUserEmail(email);

      // Load practitioner name
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('name')
        .eq('id', data.session.user.id)
        .single();

      if (practitioner?.name) {
        setUserName(practitioner.name);
      }

      if (email) {
        const { data: adminRecord, error } = await supabase
          .from('admin_allowlist')
          .select('email')
          .eq('email', email)
          .maybeSingle();
        setIsAdmin(!error && !!adminRecord);
      } else {
        setIsAdmin(false);
      }

      setCheckingAuth(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        setUserEmail(null);
        setUserName(null);
        setIsAdmin(false);
        router.replace('/login');
        return;
      }
      const email = session.user.email ?? null;
      setUserEmail(email);
      if (!email) {
        setIsAdmin(false);
        return;
      }

      void (async () => {
        const { data: adminRecord } = await supabase
          .from('admin_allowlist')
          .select('email')
          .eq('email', email)
          .maybeSingle();
        if (!isMounted) return;
        setIsAdmin(!!adminRecord);
      })();
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
    setUserName(null);
    setIsAdmin(false);
    router.replace('/login');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-charcoal">
      {/* Fixed Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[240px] lg:flex-col glass-sidebar z-50">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-5 py-5 border-b border-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal">
            <Image src="/afeia_symbol_white.svg" alt="Afeia" width={24} height={24} />
          </div>
          <div>
            <div className="text-base font-semibold text-charcoal">Afeia</div>
            <div className="text-xs text-warmgray">Espace praticien</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4">
          <div className="space-y-1">
            {NAV.map((item) => {
              const isActive = active === item.href;
              const Icon = item.icon;
              const showBadge = 'showBadge' in item && item.showBadge && unreadMessages > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                    isActive
                      ? 'bg-teal text-white shadow-teal-glow'
                      : 'text-charcoal hover:bg-teal/10 hover:text-teal'
                  )}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          {isAdmin ? (
            <div className="space-y-1">
              <div className="px-3 text-xs font-semibold uppercase tracking-wide text-warmgray">
                Admin
              </div>
              {ADMIN_NAV.map((item) => {
                const isActive = active === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-aubergine text-white shadow-teal-glow'
                        : 'text-charcoal hover:bg-aubergine/10 hover:text-aubergine'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={userName || userEmail || 'Naturopathe'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-charcoal truncate">
                {userName || 'Naturopathe'}
              </div>
              <div className="text-xs text-warmgray truncate">{userEmail}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-warmgray hover:text-charcoal hover:bg-white/50 transition-colors"
              title="Deconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Tablet Sidebar - Collapsed */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-screen w-20 flex-col glass-sidebar z-50">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center py-5 border-b border-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal">
            <Image src="/afeia_symbol_white.svg" alt="Afeia" width={24} height={24} />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-3">
          <div className="space-y-1">
            {NAV.map((item) => {
              const isActive = active === item.href;
              const Icon = item.icon;
              const showBadge = 'showBadge' in item && item.showBadge && unreadMessages > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center rounded-lg p-3 transition-all duration-200 relative',
                    isActive
                      ? 'bg-teal text-white shadow-teal-glow'
                      : 'text-charcoal hover:bg-teal/10 hover:text-teal'
                  )}
                  title={item.label}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {isAdmin ? (
            <div className="space-y-1">
              {ADMIN_NAV.map((item) => {
                const isActive = active === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center rounded-lg p-3 transition-all duration-200',
                      isActive
                        ? 'bg-aubergine text-white shadow-teal-glow'
                        : 'text-charcoal hover:bg-aubergine/10 hover:text-aubergine'
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center p-3 rounded-lg text-warmgray hover:text-charcoal hover:bg-white/50 transition-colors"
            title="Deconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Fixed Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-[240px] md:left-20 h-16 glass-header z-40 px-4 lg:px-6">
        <div className="h-full flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-charcoal hover:bg-white/50 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="md:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal">
              <Image src="/afeia_symbol_white.svg" alt="Afeia" width={18} height={18} />
            </div>
            <span className="font-semibold text-charcoal">Afeia</span>
          </Link>

          {/* Page title - desktop/tablet */}
          <h1 className="hidden md:block text-xl font-semibold text-charcoal tracking-tight">
            {pageTitle}
          </h1>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {/* User menu - desktop only */}
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg glass-card px-3 py-2 text-sm font-medium text-charcoal transition-all hover:shadow-md"
              >
                <Avatar name={userName || userEmail || 'Naturopathe'} size="sm" />
                <span className="hidden lg:inline max-w-[120px] truncate">
                  {userName || userEmail || 'Mon compte'}
                </span>
                <ChevronDown className="h-4 w-4 text-warmgray" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg glass-panel shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="text-xs text-warmgray">Compte praticien</div>
                    <div className="text-sm font-medium text-charcoal truncate">
                      {userEmail}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-charcoal transition hover:bg-teal/10 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Se deconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pl-[240px] md:pl-20 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] glass-sidebar shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal">
                  <Image src="/afeia_symbol_white.svg" alt="Afeia" width={24} height={24} />
                </div>
                <div>
                  <div className="font-semibold text-charcoal">Afeia</div>
                  <div className="text-xs text-warmgray">Espace praticien</div>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-charcoal hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-3 py-4 space-y-4">
              <div className="space-y-1">
                {NAV.map((item) => {
                  const isActive = active === item.href;
                  const Icon = item.icon;
                  const showBadge = 'showBadge' in item && item.showBadge && unreadMessages > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-teal text-white shadow-teal-glow'
                          : 'text-charcoal hover:bg-teal/10 hover:text-teal'
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {showBadge && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              {isAdmin ? (
                <div className="space-y-1">
                  <div className="px-3 text-xs font-semibold uppercase tracking-wide text-warmgray">
                    Admin
                  </div>
                  {ADMIN_NAV.map((item) => {
                    const isActive = active === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-aubergine text-white shadow-teal-glow'
                            : 'text-charcoal hover:bg-aubergine/10 hover:text-aubergine'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </nav>

            {/* User section */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={userName || userEmail || 'Naturopathe'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-charcoal truncate">
                    {userName || 'Naturopathe'}
                  </div>
                  <div className="text-xs text-warmgray truncate">{userEmail}</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={logout}
                icon={<LogOut className="h-4 w-4" />}
              >
                Deconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
