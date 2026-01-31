'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Users, Shield, CreditCard, Activity } from 'lucide-react';

type AdminStats = {
  practitioners: number;
  patients: number;
  paymentFailures: number;
  circularEnabled: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    practitioners: 0,
    patients: 0,
    paymentFailures: 0,
    circularEnabled: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      const [{ count: practitioners }, { count: patients }, { count: paymentFailures }, { count: circularEnabled }] =
        await Promise.all([
          supabase.from('practitioners_public').select('id', { count: 'exact', head: true }),
          supabase.from('patients_identity').select('id', { count: 'exact', head: true }),
          supabase.from('stripe_subscriptions').select('id', { count: 'exact', head: true }).eq('payment_failed', true),
          supabase.from('patients_identity').select('id', { count: 'exact', head: true }).eq('circular_enabled', true)
        ]);

      if (!isMounted) return;

      setStats({
        practitioners: practitioners ?? 0,
        patients: patients ?? 0,
        paymentFailures: paymentFailures ?? 0,
        circularEnabled: circularEnabled ?? 0
      });
      setLoading(false);
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace admin"
        subtitle="Vue d'ensemble de la plateforme AFEIA"
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/admins')}>
            Gerer les admins
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-warmgray">Praticiens</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {loading ? '—' : stats.practitioners}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
              <Users className="h-5 w-5 text-teal" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-warmgray">Patients</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {loading ? '—' : stats.patients}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-aubergine/10">
              <Users className="h-5 w-5 text-aubergine" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-warmgray">Paiements echoues</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {loading ? '—' : stats.paymentFailures}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <CreditCard className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-warmgray">Circular actifs</p>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {loading ? '—' : stats.circularEnabled}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15">
              <Activity className="h-5 w-5 text-gold" />
            </div>
          </div>
        </Card>
      </div>

      <PageShell className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">Raccourcis</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/practitioners"
            className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm transition hover:border-teal/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-charcoal">Praticiens</p>
                <p className="text-sm text-warmgray">Gerer identites et statuts</p>
              </div>
              <Users className="h-5 w-5 text-teal" />
            </div>
          </Link>
          <Link
            href="/admin/patients"
            className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm transition hover:border-aubergine/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-charcoal">Patients</p>
                <p className="text-sm text-warmgray">Identites et premium</p>
              </div>
              <Users className="h-5 w-5 text-aubergine" />
            </div>
          </Link>
          <Link
            href="/admin/billing"
            className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm transition hover:border-gold/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-charcoal">Billing</p>
                <p className="text-sm text-warmgray">Plans Stripe et alertes</p>
              </div>
              <CreditCard className="h-5 w-5 text-gold" />
            </div>
          </Link>
          <Link
            href="/admin/circular"
            className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm transition hover:border-teal/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-charcoal">Circular</p>
                <p className="text-sm text-warmgray">Activation et synchronisation</p>
              </div>
              <Shield className="h-5 w-5 text-teal" />
            </div>
          </Link>
        </div>
      </PageShell>
    </div>
  );
}
