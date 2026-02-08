'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

const ADMIN_LOGIN_PATH = '/admin/login';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

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
          const data = await response.json();
          setIsAdmin(true);
          setAdminEmail(data.email ?? null);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-sm">Chargement de l&apos;espace admin...</div>
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
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar adminEmail={adminEmail} onLogout={handleLogout} />
      <main className="ml-64 p-6">{children}</main>
    </div>
  );
}
