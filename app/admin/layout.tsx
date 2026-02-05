'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const ADMIN_LOGIN_PATH = '/admin/login';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const isLoginRoute = useMemo(() => pathname === ADMIN_LOGIN_PATH, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      if (isLoginRoute) {
        setChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/session', { credentials: 'include' });
        if (!isMounted) return;

        if (response.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.replace(ADMIN_LOGIN_PATH);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setIsAdmin(false);
          router.replace(ADMIN_LOGIN_PATH);
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [isLoginRoute, router]);

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error(error);
    } finally {
      router.push(ADMIN_LOGIN_PATH);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div>Chargement de l&apos;espace admin...</div>
      </div>
    );
  }

  if (!isAdmin && !isLoginRoute) {
    return null;
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-teal-200/70">AFEIA Admin</p>
            <p className="text-lg font-semibold">Administration</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-200/80 transition hover:text-white"
            >
              Retour à l&apos;espace praticien
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
