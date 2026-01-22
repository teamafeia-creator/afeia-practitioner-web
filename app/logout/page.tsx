'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      router.replace('/login');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-sable flex items-center justify-center">
      <div className="text-warmgray">Déconnexion…</div>
    </div>
  );
}
