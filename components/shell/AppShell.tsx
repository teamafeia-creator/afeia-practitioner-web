'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import {
  Calendar,
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
  Receipt,
  BarChart3,
  HelpCircle,
  Library
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

const NAV_GROUPS = [
  {
    label: 'Suivi',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/consultants', label: 'Consultants', icon: Users },
      { href: '/agenda', label: 'Agenda', icon: Calendar, showWaitlistBadge: true },
    ]
  },
  {
    label: 'Outils',
    items: [
      { href: '/messages', label: 'Messages', icon: MessageSquare, showBadge: true },
      { href: '/questionnaires', label: 'Questionnaires', icon: ClipboardList },
      { href: '/bibliotheque', label: 'Bibliothèque', icon: Library },
    ]
  },
  {
    label: 'Gestion',
    items: [
      { href: '/facturation', label: 'Facturation', icon: Receipt },
      { href: '/statistics', label: 'Statistiques', icon: BarChart3 },
    ]
  }
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard admin', icon: Shield },
  { href: '/admin/admins', label: 'Admins', icon: Shield },
  { href: '/admin/practitioners', label: 'Praticiens', icon: Users },
  { href: '/admin/consultants', label: 'Consultants', icon: Users },
  { href: '/admin/billing', label: 'Billing', icon: ClipboardList },
  { href: '/admin/bague-connectee', label: 'Bague connectee', icon: MessageSquare }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const { unreadCount: unreadMessages } = useMessageNotifications();
  const [waitlistCount, setWaitlistCount] = useState(0);

  const active = useMemo(() => {
    const match = [...ALL_NAV, ...ADMIN_NAV, { href: '/settings' }].find((n) => pathname.startsWith(n.href));
    return match?.href ?? '/dashboard';
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
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setHelpMenuOpen(false);
      }
    }

    if (userMenuOpen || helpMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, helpMenuOpen]);

  // Fetch waitlist count
  useEffect(() => {
    if (checkingAuth || !userEmail) return;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;
        const res = await fetch('/api/waitlist/count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWaitlistCount(data.count ?? 0);
        }
      } catch {
        // Silently ignore
      }
    })();
  }, [checkingAuth, userEmail]);

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserName(null);
    setIsAdmin(false);
    router.replace('/login');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-cream">
        <div className="text-stone animate-pulse">Chargement...</div>
      </div>
    );
  }

  const renderNavItem = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; showBadge?: boolean; showWaitlistBadge?: boolean }, onClick?: () => void) => {
    const isActive = active === item.href;
    const Icon = item.icon;
    const showBadge = item.showBadge && unreadMessages > 0;
    const showWaitlist = item.showWaitlistBadge && waitlistCount > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 relative',
          isActive
            ? 'text-white'
            : 'text-sidebar-text hover:bg-sidebar-hover'
        )}
      >
        {/* Animated active indicator with layoutId */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 bg-sidebar-active rounded-lg"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative">
            <Icon className="h-5 w-5" />
            {showBadge && (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white px-1"
              >
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </motion.span>
            )}
          </div>
          <span>{item.label}</span>
          {showWaitlist && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/15 text-[10px] font-medium text-sidebar-text px-1.5">
              {waitlistCount > 99 ? '99+' : waitlistCount}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-5 py-5 border-b border-white/10"
        onClick={onNavigate}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          <Image src="/afeia_symbol_white.svg" alt="Afeia" width={24} height={24} />
        </div>
        <div>
          <div className="text-base font-semibold text-white">Afeia</div>
          <div className="text-xs text-sidebar-text/60">Espace praticien</div>
        </div>
      </Link>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[11px] font-medium tracking-wider text-mist/70" style={{ fontVariant: 'small-caps' }}>
              {group.label}
            </div>
            {group.items.map((item) => renderNavItem(item, onNavigate))}
          </div>
        ))}

        {isAdmin && (
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-medium tracking-wider text-mist/70" style={{ fontVariant: 'small-caps' }}>
              Admin
            </div>
            {ADMIN_NAV.map((item) => {
              const isActive = active === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-terracotta text-white'
                      : 'text-sidebar-text hover:bg-sidebar-hover'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Settings - separated */}
        <div className="pt-2 border-t border-white/10">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 relative',
              active === '/settings'
                ? 'text-white'
                : 'text-sidebar-text hover:bg-sidebar-hover'
            )}
          >
            {active === '/settings' && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 bg-sidebar-active rounded-lg"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-3">
              <Settings className="h-5 w-5" />
              <span>Parametres</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* User section at bottom */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={userName || userEmail || 'Naturopathe'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {userName || 'Naturopathe'}
            </div>
            <div className="text-xs text-sidebar-text/60 truncate">{userEmail}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-sidebar-text/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Deconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen text-charcoal">
      {/* Desktop Sidebar — 240px, charcoal */}
      <aside className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[240px] lg:flex-col glass-sidebar z-50">
        {renderSidebarContent()}
      </aside>

      {/* Tablet/Mobile Header with hamburger */}
      <header className="fixed top-0 right-0 left-0 lg:left-[240px] h-16 glass-header z-40 px-4 lg:px-6">
        <div className="h-full flex items-center justify-between">
          {/* Hamburger — always visible on tablet and mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-charcoal hover:bg-cream transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage">
              <Image src="/afeia_symbol_white.svg" alt="Afeia" width={18} height={18} />
            </div>
            <span className="font-semibold text-charcoal">Afeia</span>
          </Link>

          {/* Spacer for desktop */}
          <div className="hidden lg:block" />

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {/* User menu - desktop only */}
            <div className="hidden lg:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-divider bg-white px-3 py-2 text-sm font-medium text-charcoal transition-shadow hover:shadow-sm"
              >
                <Avatar name={userName || userEmail || 'Naturopathe'} size="sm" />
                <span className="max-w-[120px] truncate">
                  {userName || userEmail || 'Mon compte'}
                </span>
                <ChevronDown className="h-4 w-4 text-stone" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-white/95 backdrop-blur-md border border-divider shadow-lg overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-divider">
                      <div className="text-xs text-stone">Compte praticien</div>
                      <div className="text-sm font-medium text-charcoal truncate">
                        {userEmail}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-charcoal transition-colors hover:bg-cream flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Se deconnecter
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pl-[240px] min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile/Tablet Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 h-full w-[280px] bg-sidebar-bg shadow-xl flex flex-col"
            >
              {/* Close button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-sidebar-text/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {renderSidebarContent(() => setMobileOpen(false))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help button — floating bottom right */}
      <div className="fixed bottom-6 right-6 z-50" ref={helpMenuRef}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setHelpMenuOpen(!helpMenuOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-white shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Aide"
        >
          <HelpCircle className="h-5 w-5" />
        </motion.button>

        <AnimatePresence>
          {helpMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-14 right-0 w-56 rounded-xl bg-white/95 backdrop-blur-md border border-divider shadow-lg overflow-hidden"
            >
              <a
                href="#"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors"
                onClick={(e) => { e.preventDefault(); setHelpMenuOpen(false); }}
              >
                Centre d&apos;aide
              </a>
              <a
                href="#"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors border-t border-divider"
                onClick={(e) => { e.preventDefault(); setHelpMenuOpen(false); }}
              >
                Contacter l&apos;assistance
              </a>
              <a
                href="#"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors border-t border-divider"
                onClick={(e) => { e.preventDefault(); setHelpMenuOpen(false); }}
              >
                Signaler un abus
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
