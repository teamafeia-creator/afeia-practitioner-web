'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { showToast } from '@/components/ui/Toaster';

type AdminRow = {
  email: string;
  created_at: string | null;
};

export default function AdminAllowlistPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  async function loadAdmins() {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_allowlist')
      .select('email, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showToast.error('Impossible de charger la liste des admins.');
    }

    setAdmins(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleAddAdmin() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    const { error } = await supabase.from('admin_allowlist').insert({ email: normalized });

    if (error) {
      showToast.error("Erreur lors de l'ajout de l'admin.");
      return;
    }

    showToast.success('Admin ajoute.');
    setEmail('');
    loadAdmins();
  }

  async function handleRemoveAdmin(targetEmail: string) {
    const { error } = await supabase.from('admin_allowlist').delete().eq('email', targetEmail);

    if (error) {
      showToast.error("Erreur lors de la suppression de l'admin.");
      return;
    }

    showToast.success('Admin retire.');
    loadAdmins();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        subtitle="Gerer la liste des emails autorises a acceder a l'espace admin."
      />

      <PageShell className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-warmgray">Email admin</label>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ex: admin@afeia.fr"
            />
          </div>
          <Button onClick={handleAddAdmin}>Ajouter</Button>
        </div>
      </PageShell>

      <AdminDataTable
        isLoading={loading}
        rows={admins}
        emptyMessage="Aucun admin dans la allowlist."
        columns={[
          {
            key: 'email',
            header: 'Email',
            render: (row) => <span className="font-medium text-charcoal">{row.email}</span>
          },
          {
            key: 'created_at',
            header: 'Ajoute le',
            render: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '—')
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(row.email)}>
                Retirer
              </Button>
            )
          }
        ]}
      />
    </div>
  );
}
