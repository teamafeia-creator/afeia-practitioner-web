'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Praticiens', href: '/admin/practitioners', icon: Users },
  { label: 'Patients', href: '/admin/patients', icon: UserCheck },
  { label: 'Billing', href: '/admin/billing', icon: CreditCard },
  { label: 'Circular', href: '/admin/circular', icon: Radio },
  { label: 'Blocs', href: '/admin/blocs', icon: Layers },
  { label: 'Fiches AFEIA', href: '/admin/fiches', icon: BookOpen },
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

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-slate-900">
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
                  ? 'border-l-2 border-teal-500 bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-slate-700" />

        {/* Settings section */}
        <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Parametres
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
                  ? 'border-l-2 border-teal-500 bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-700 px-4 py-4 space-y-3">
        {adminEmail && (
          <div className="truncate text-xs text-slate-400">{adminEmail}</div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Deconnexion
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
