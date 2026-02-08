'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, ShieldCheck } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toaster';

type AdminRow = {
  email: string;
  created_at: string | null;
};

export default function SettingsAdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  async function loadAdmins() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/admins', { credentials: 'include' });

      if (!response.ok) {
        showToast.error('Impossible de charger la liste des admins.');
        setAdmins([]);
        return;
      }

      const data = await response.json();
      setAdmins(data.admins ?? []);
    } catch (err) {
      console.error('[admin] loadAdmins error:', err);
      showToast.error('Erreur reseau lors du chargement des admins.');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleAddAdmin() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    setAdding(true);
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalized }),
      });

      if (!response.ok) {
        showToast.error("Erreur lors de l'ajout de l'admin.");
        return;
      }

      showToast.success('Admin ajoute.');
      setEmail('');
      loadAdmins();
    } catch (err) {
      console.error('[admin] handleAddAdmin error:', err);
      showToast.error("Erreur reseau lors de l'ajout de l'admin.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveAdmin(targetEmail: string) {
    setRemovingEmail(targetEmail);
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: targetEmail }),
      });

      if (!response.ok) {
        showToast.error("Erreur lors de la suppression de l'admin.");
        return;
      }

      showToast.success('Admin retire.');
      loadAdmins();
    } catch (err) {
      console.error('[admin] handleRemoveAdmin error:', err);
      showToast.error("Erreur reseau lors de la suppression de l'admin.");
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Admins"
        subtitle="Gerer la liste des emails autorises a acceder a l'espace admin."
      />

      {/* Add admin form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Email admin
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: admin@afeia.fr"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddAdmin();
              }}
            />
          </div>
          <Button
            onClick={handleAddAdmin}
            loading={adding}
            icon={<Plus className="h-4 w-4" />}
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* Admins table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Chargement...
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
            <ShieldCheck className="mb-2 h-8 w-8 text-slate-300" />
            Aucun admin dans la allowlist.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Ajoute le</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <tr key={admin.email} className="transition hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">
                    {admin.email}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {admin.created_at
                      ? new Date(admin.created_at).toLocaleDateString('fr-FR')
                      : '\u2014'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={removingEmail === admin.email}
                      onClick={() => handleRemoveAdmin(admin.email)}
                      icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Retirer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
