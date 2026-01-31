'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { supabase } from '@/lib/supabase';
import { Toaster, showToast } from '@/components/ui/Toaster';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      const session = data.session;
      if (!session?.user?.email) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        setChecking(false);
        return;
      }

      const { data: adminRecord, error } = await supabase
        .from('admin_allowlist')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error || !adminRecord) {
        showToast.error('Acces refuse.');
        router.replace('/');
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      setIsAdmin(true);
      setChecking(false);
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppShell>
      <Toaster />
      {children}
    </AppShell>
  );
}
