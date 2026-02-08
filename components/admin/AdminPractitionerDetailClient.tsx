'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { showToast } from '@/components/ui/Toaster';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { HealthScoreBadge } from '@/components/admin/HealthScoreBadge';
import {
  Mail,
  KeyRound,
  Ban,
  ExternalLink,
  FileText,
  CreditCard,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HealthScoreBreakdown } from '@/lib/admin/health-score';

export type PractitionerDetail = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  subscription_status: string | null;
  created_at: string | null;
  last_login_at: string | null;
  calendly_url: string | null;
};

type ConsultantRow = {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  is_premium: boolean;
  created_at: string;
};

type SubscriptionInfo = {
  id: string;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  payment_failed: boolean | null;
  customer_id: string | null;
};

type AdminPractitionerDetailClientProps = {
  practitioner: PractitionerDetail;
  consultantsCount: number | null;
  consultants?: ConsultantRow[];
  subscription?: SubscriptionInfo | null;
  healthScore?: HealthScoreBreakdown | null;
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function AdminPractitionerDetailClient({
  practitioner: initialPractitioner,
  consultantsCount,
  consultants = [],
  subscription,
  healthScore,
}: AdminPractitionerDetailClientProps) {
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<PractitionerDetail>(initialPractitioner);
  const [saving, setSaving] = useState(false);

  const initials = (practitioner.full_name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function saveChanges() {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/practitioners/${practitioner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: practitioner.email,
          full_name: practitioner.full_name,
          status: practitioner.status,
          subscription_status: practitioner.subscription_status,
        }),
      });
      if (!response.ok) {
        showToast.error('Erreur lors de la mise a jour.');
      } else {
        showToast.success('Infos mises a jour.');
        router.refresh();
      }
    } catch (err) {
      console.error('[admin] saveChanges error:', err);
      showToast.error('Erreur reseau lors de la mise a jour.');
    } finally {
      setSaving(false);
    }
  }

  async function triggerPasswordReset() {
    if (!practitioner.email) return;
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: practitioner.email }),
      });
      if (!response.ok) {
        showToast.error('Erreur lors de la reinitialisation.');
        return;
      }
      showToast.success('Email de reinitialisation envoye.');
    } catch (err) {
      console.error('[admin] triggerPasswordReset error:', err);
      showToast.error('Erreur reseau lors de la reinitialisation.');
    }
  }

  const statusBadge = practitioner.status === 'suspended'
    ? 'bg-red-100 text-red-700'
    : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/practitioners"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux praticiens
      </Link>

      {/* Header with practitioner info */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-lg font-bold">
            {initials}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-800">
              {practitioner.full_name ?? 'Praticien'}
            </h1>
            <p className="text-sm text-slate-500">{practitioner.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                Inscrit le{' '}
                {practitioner.created_at
                  ? new Date(practitioner.created_at).toLocaleDateString('fr-FR')
                  : '--'}
              </span>
              <span className="text-slate-300">|</span>
              <span>Plan: {practitioner.subscription_status ?? 'Free'}</span>
              <span className="text-slate-300">|</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadge)}>
                {practitioner.status === 'suspended' ? 'Suspendu' : 'Actif'}
              </span>
              <span className="text-slate-300">|</span>
              <span>Derniere connexion: {formatRelativeTime(practitioner.last_login_at)}</span>
            </div>
          </div>
          {/* Health score */}
          {healthScore && (
            <div className="text-center">
              <HealthScoreBadge score={healthScore.total} color={healthScore.color} size="md" />
              <div className="mt-1 text-[10px] text-slate-400">Health Score</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (practitioner.email) {
              window.location.href = `mailto:${practitioner.email}`;
            }
          }}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Envoyer un email
          </Button>
          <Button variant="outline" size="sm" onClick={triggerPasswordReset}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Reset MDP
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={practitioner.status === 'suspended' ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}
            onClick={() => {
              const newStatus = practitioner.status === 'suspended' ? 'active' : 'suspended';
              setPractitioner({ ...practitioner, status: newStatus });
            }}
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            {practitioner.status === 'suspended' ? 'Reactiver' : 'Suspendre'}
          </Button>
          {subscription?.customer_id && (
            <a
              href={`https://dashboard.stripe.com/customers/${subscription.customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir sur Stripe
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile section */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Profil</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Email</label>
              <Input
                value={practitioner.email ?? ''}
                onChange={(e) => setPractitioner({ ...practitioner, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Nom complet</label>
              <Input
                value={practitioner.full_name ?? ''}
                onChange={(e) => setPractitioner({ ...practitioner, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Statut</label>
              <Select
                value={practitioner.status ?? 'active'}
                onChange={(e) => setPractitioner({ ...practitioner, status: e.target.value })}
              >
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Abonnement</label>
              <div className="mt-1 text-sm text-slate-800">
                {practitioner.subscription_status ?? 'Free'}
              </div>
              <div className="text-[10px] text-slate-400">Gere via Stripe</div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveChanges} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        {/* Financial section */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CreditCard className="h-4 w-4 text-slate-400" />
            Financier
          </h3>
          {subscription ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Abonnement</span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  subscription.status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {subscription.status ?? '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paiement</span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  subscription.payment_failed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                )}>
                  {subscription.payment_failed ? 'Echoue' : 'A jour'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prochaine echeance</span>
                <span className="text-slate-800">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR')
                    : '--'}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/billing?practitioner=${practitioner.id}`)}
                >
                  Voir le billing complet
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucun abonnement Stripe</p>
          )}
        </div>
      </div>

      {/* Consultants section */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users className="h-4 w-4 text-slate-400" />
            Consultants ({consultantsCount ?? 0})
          </h3>
        </div>
        {consultants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Cree le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consultants.map((c) => (
                  <tr key={c.id} className="text-slate-800 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{c.full_name}</td>
                    <td className="px-3 py-2 text-slate-500">{c.email ?? '--'}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        c.is_premium ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {c.is_premium ? 'Premium' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aucun consultant associe</p>
        )}
      </div>

      {/* Logs link */}
      <div className="flex justify-end">
        <Link
          href={`/admin/settings/logs?targetId=${practitioner.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Voir les logs de ce praticien
        </Link>
      </div>
    </div>
  );
}
