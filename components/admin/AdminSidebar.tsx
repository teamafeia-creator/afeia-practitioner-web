'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  Radio,
  Layers,
  BookOpen,
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Inscriptions', href: '/admin/inscriptions', icon: BadgeCheck },
  { label: 'Praticiens', href: '/admin/practitioners', icon: Users },
  { label: 'Patients', href: '/admin/patients', icon: UserCheck },
  { label: 'Billing', href: '/admin/billing', icon: CreditCard },
  { label: 'Circular', href: '/admin/circular', icon: Radio },
  { label: 'Blocs', href: '/admin/blocs', icon: Layers },
  { label: 'Fiches AFEIA', href: '/admin/fiches', icon: BookOpen },
  { label: 'Questionnaire', href: '/admin/questionnaire', icon: ClipboardList },
];

const settingsNav: NavItem[] = [
  { label: 'Admins', href: '/admin/settings/admins', icon: ShieldCheck },
  { label: 'Logs', href: '/admin/settings/logs', icon: FileText },
];

type AdminSidebarProps = {
  adminEmail: string | null;
  onLogout: () => void;
};

export function AdminSidebar({ adminEmail, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pendingSignups, setPendingSignups] = useState(0);

  // Badge « Inscriptions » : demandes en attente de validation.
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/inscriptions?count=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { pending: 0 }))
      .then((d: { pending?: number }) => alive && setPendingSignups(d.pending ?? 0))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname]);

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-surface">
      {/* Logo */}
      <div className="flex items-baseline gap-2 px-6 py-5">
        <span className="text-lg font-bold text-sage-400">AFEIA</span>
        <span className="text-xs text-slate-400">Admin</span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {mainNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-l-2 border-teal-500 bg-surface-raised text-white'
                  : 'text-slate-400 hover:bg-surface-raised hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/inscriptions' && pendingSignups > 0 ? (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-terracotta px-1.5 text-xs font-semibold text-ink">
                  {pendingSignups}
                </span>
              ) : null}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-divider" />

        {/* Settings section */}
        <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Paramètres
        </div>
        {settingsNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-l-2 border-teal-500 bg-surface-raised text-white'
                  : 'text-slate-400 hover:bg-surface-raised hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-divider px-4 py-4 space-y-3">
        {adminEmail && (
          <div className="truncate text-xs text-slate-400">{adminEmail}</div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-sage-400 hover:text-sage-300 transition-colors"
        >
          Espace praticien
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
