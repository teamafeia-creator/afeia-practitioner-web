'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { HeaderSearch } from './HeaderSearch';
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
  Library,
  Leaf,
  Sun,
  Watch
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useReviewActivity } from '@/hooks/useReviewActivity';
import { getReviewQueue } from '@/lib/morning-review/queue';
import { useMorningReview } from '@/hooks/useMorningReview';

const NAV_GROUPS = [
  {
    label: 'Suivi',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/morning-review', label: 'Revue du matin', icon: Sun, showReviewBadge: true },
      { href: '/consultants', label: 'Consultants', icon: Users },
      { href: '/agenda', label: 'Agenda', icon: Calendar, showWaitlistBadge: true },
    ]
  },
  {
    label: 'Outils',
    items: [
      { href: '/messages', label: 'Messages', icon: MessageSquare, showBadge: true },
      { href: '/questionnaires', label: 'Questionnaires', icon: ClipboardList, showQuestionnaireBadge: true },
      { href: '/bibliotheque', label: 'Bibliothèque', icon: Library, children: [
        { href: '/bibliotheque', label: 'Fiches éducatives' },
        { href: '/bibliotheque/blocs', label: 'Blocs conseillancier' },
        { href: '/bibliotheque/ressources', label: 'Ressources' },
      ]},
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
  { href: '/admin/bague-connectee', label: 'Objets connectés', icon: Watch }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const { unreadCount: unreadMessages } = useMessageNotifications();
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [questionnaireCount, setQuestionnaireCount] = useState(0);
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const { data: morningReview } = useMorningReview();
  // Même seuil que la file d'attention de la revue du matin
  const { data: reviewActivity } = useReviewActivity();
  const reviewCount = useMemo(
    () =>
      getReviewQueue(
        morningReview?.consultantsSummary ?? [],
        new Set((reviewActivity?.today ?? []).map((a) => a.consultant_id))
      ).length,
    [morningReview, reviewActivity]
  );

  const active = useMemo(() => {
    const match = [...ALL_NAV, ...ADMIN_NAV, { href: '/settings' }].find((n) => pathname.startsWith(n.href));
    return match?.href ?? '/dashboard';
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    // Filet de sécurité : si la vérification de session ne répond pas (backend
    // lent/indisponible), on sort du spinner infini et on propose de réessayer.
    const authTimer = setTimeout(() => {
      if (isMounted) setAuthTimedOut(true);
    }, 8000);

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      clearTimeout(authTimer);

      if (!data.session) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        setCheckingAuth(false);
        return;
      }

      const email = data.session.user.email ?? null;
      setUserEmail(email);

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('full_name, account_status')
        .eq('id', data.session.user.id)
        .single();

      // Espace fermé tant que l'inscription n'est pas validée par l'équipe Afeia.
      const accountStatus = (practitioner as { account_status?: string | null } | null)?.account_status;
      if (accountStatus && accountStatus !== 'validated') {
        router.replace('/compte/verification');
        return;
      }

      if (practitioner?.full_name) {
        setUserName(practitioner.full_name);
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
        // Cohérent avec loadSession : on conserve la cible dans ?from.
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
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
      clearTimeout(authTimer);
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

  // Questionnaires préliminaires en attente (badge de la navigation)
  useEffect(() => {
    if (checkingAuth || !userEmail) return;
    (async () => {
      const { count } = await supabase
        .from('preliminary_questionnaires')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setQuestionnaireCount(count ?? 0);
    })();
  }, [checkingAuth, userEmail, pathname]);

  // Auto-open submenus when pathname matches a parent with children
  useEffect(() => {
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if ('children' in item && item.children && pathname.startsWith(item.href)) {
          setOpenMenus((prev) => {
            if (prev.has(item.href)) return prev;
            const next = new Set(prev);
            next.add(item.href);
            return next;
          });
        }
      });
    });
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserName(null);
    setIsAdmin(false);
    router.replace('/login');
  }

  if (checkingAuth) {
    if (authTimedOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-cream px-6 text-center">
          <p className="text-charcoal font-medium">Impossible de vérifier votre session</p>
          <p className="text-sm text-stone max-w-sm">
            Le service met trop de temps à répondre. Vérifiez votre connexion puis réessayez.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-surface-raised px-4 py-2 text-sm font-medium text-white hover:bg-surface-raised/90"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-cream">
        <div className="text-stone animate-pulse">Chargement...</div>
      </div>
    );
  }

  const renderNavItem = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; showBadge?: boolean; showWaitlistBadge?: boolean; showReviewBadge?: boolean; showQuestionnaireBadge?: boolean; children?: { href: string; label: string }[] }, onClick?: () => void) => {
    const Icon = item.icon;
    const showBadge = item.showBadge && unreadMessages > 0;
    const showWaitlist = item.showWaitlistBadge && waitlistCount > 0;
    const showReview = item.showReviewBadge && reviewCount > 0;
    const showQuestionnaires = item.showQuestionnaireBadge && questionnaireCount > 0;
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      const isParentActive = pathname.startsWith(item.href);
      const isMenuOpen = openMenus.has(item.href);

      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => {
              setOpenMenus((prev) => {
                const next = new Set(prev);
                if (next.has(item.href)) {
                  next.delete(item.href);
                } else {
                  next.add(item.href);
                }
                return next;
              });
            }}
            aria-expanded={isMenuOpen}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 relative',
              isParentActive
                ? 'text-sage'
                : 'text-sidebar-text hover:bg-sidebar-hover'
            )}
          >
            {isParentActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 bg-sage-light rounded-lg"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex w-full items-center gap-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-150',
                  isMenuOpen ? '' : '-rotate-90'
                )}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {isMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {item.children!.map((child) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClick}
                      aria-current={isChildActive ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[44px] items-center pl-11 pr-3 text-[13px] font-medium transition-colors duration-150 rounded-md',
                        isChildActive
                          ? 'text-sage'
                          : 'text-stone hover:text-sidebar-text hover:bg-sidebar-hover'
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    const isActive = active === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 relative',
          isActive
            ? 'text-sage'
            : 'text-sidebar-text hover:bg-sidebar-hover'
        )}
      >
        {/* Animated active indicator with layoutId */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 bg-sage-light rounded-lg"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex w-full items-center gap-3">
          <Icon className={cn('h-5 w-5', item.showReviewBadge && !isActive && 'text-terracotta')} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {showBadge && (
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-semibold tabular-nums text-ink"
              aria-label={`${unreadMessages} message${unreadMessages > 1 ? 's' : ''} non lu${unreadMessages > 1 ? 's' : ''}`}
            >
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
          {showReview && (
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta-light px-1.5 text-[10px] font-semibold tabular-nums text-terracotta"
              aria-label={`${reviewCount} cas en attente`}
            >
              {reviewCount}
            </span>
          )}
          {showQuestionnaires && (
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-semibold tabular-nums text-ink"
              aria-label={`${questionnaireCount} questionnaire${questionnaireCount > 1 ? 's' : ''} en attente`}
            >
              {questionnaireCount > 99 ? '99+' : questionnaireCount}
            </span>
          )}
          {showWaitlist && (
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-medium tabular-nums text-sidebar-text"
              aria-label={`${waitlistCount} en liste d'attente`}
            >
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
        className="flex items-center gap-3 px-5 py-5 border-b border-divider"
        onClick={onNavigate}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light" aria-hidden="true">
          <Leaf className="h-5 w-5 text-sage" />
        </div>
        <div>
          <div className="font-serif text-xl leading-tight text-charcoal">Afeia</div>
          <div className="text-xs text-stone">Espace praticien</div>
        </div>
      </Link>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Navigation principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-mist">
              {group.label}
            </div>
            {group.items.map((item) => renderNavItem(item, onNavigate))}
          </div>
        ))}

        {isAdmin && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-mist">
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
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-terracotta-light text-terracotta'
                      : 'text-sidebar-text hover:bg-sidebar-hover'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

      </nav>

      {/* Pied de sidebar : praticien + paramètres */}
      <div className="border-t border-divider p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <Avatar name={userName || userEmail || 'Praticien'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-charcoal truncate">
              {userName || userEmail || 'Mon compte'}
            </div>
            <div className="text-xs text-stone truncate">Praticien</div>
          </div>
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-label="Paramètres"
            aria-current={active === '/settings' ? 'page' : undefined}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors',
              active === '/settings'
                ? 'bg-sage-light text-sage'
                : 'text-stone hover:text-charcoal hover:bg-sidebar-hover'
            )}
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone transition-colors hover:text-charcoal hover:bg-sidebar-hover"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen text-charcoal">
      {/* Sidebar bureau — 248px */}
      <aside className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[248px] lg:flex-col glass-sidebar z-50">
        {renderSidebarContent()}
      </aside>

      {/* Tablet/Mobile Header with hamburger */}
      <header className="fixed top-0 right-0 left-0 lg:left-[248px] h-16 glass-header z-40 px-4 lg:px-6">
        <div className="h-full flex items-center justify-between gap-3">
          {/* Hamburger — always visible on tablet and mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg text-charcoal hover:bg-surface transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-light" aria-hidden="true">
              <Leaf className="h-4 w-4 text-sage" />
            </div>
            <span className="font-serif text-lg text-charcoal">Afeia</span>
          </Link>

          <HeaderSearch />
          <div className="flex-1" />

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {/* User menu - desktop only */}
            <div className="hidden lg:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-2 text-sm font-medium text-charcoal transition-shadow hover:shadow-sm"
              >
                <Avatar name={userName || userEmail || 'Praticien'} size="sm" />
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
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-surface/95 backdrop-blur-md border border-divider shadow-lg overflow-hidden"
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
                      Se déconnecter
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pl-[248px] min-h-screen">
        <div className="mx-auto w-full max-w-content px-4 py-6 md:px-8 md:py-8">
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-sidebar-bg shadow-xl flex flex-col"
            >
              {/* Close button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-stone hover:text-charcoal hover:bg-white/10 transition-colors"
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
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-white shadow-lg hover:shadow-xl transition-shadow"
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
              className="absolute bottom-14 right-0 w-56 rounded-xl bg-surface/95 backdrop-blur-md border border-divider shadow-lg overflow-hidden"
            >
              <a
                href="mailto:contact@afeia.fr?subject=Aide%20AFEIA"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors"
                onClick={() => setHelpMenuOpen(false)}
              >
                Centre d&apos;aide
              </a>
              <a
                href="mailto:contact@afeia.fr?subject=Assistance%20AFEIA"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors border-t border-divider"
                onClick={() => setHelpMenuOpen(false)}
              >
                Contacter l&apos;assistance
              </a>
              <a
                href="mailto:contact@afeia.fr?subject=Signalement%20d%27abus"
                className="block px-4 py-3 text-sm text-charcoal hover:bg-cream transition-colors border-t border-divider"
                onClick={() => setHelpMenuOpen(false)}
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
