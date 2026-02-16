'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Pencil, Trash2, Eye, EyeOff, Clock } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'hydratation', label: 'Hydratation' },
  { value: 'phytotherapie', label: 'Phytoth\u00e9rapie' },
  { value: 'aromatherapie', label: 'Aromath\u00e9rapie' },
  { value: 'respiration', label: 'Respiration' },
  { value: 'activite_physique', label: 'Activit\u00e9 physique' },
  { value: 'sommeil', label: 'Sommeil' },
  { value: 'gestion_stress', label: 'Gestion du stress' },
  { value: 'detox', label: 'D\u00e9tox' },
  { value: 'digestion', label: 'Digestion' },
  { value: 'immunite', label: 'Immunit\u00e9' },
  { value: 'peau', label: 'Peau' },
  { value: 'feminin', label: 'F\u00e9minin' },
  { value: 'general', label: 'G\u00e9n\u00e9ral' },
];

const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter((c) => c.value).map((c) => [c.value, c.label])
);

type Fiche = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string;
  tags: string[];
  is_published: boolean;
  read_time_minutes: number | null;
  created_at: string;
};

export default function AdminFichesPage() {
  const router = useRouter();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ficheToDelete, setFicheToDelete] = useState<Fiche | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle publish loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const publishedCount = fiches.filter((f) => f.is_published).length;

  useEffect(() => {
    let isMounted = true;

    async function loadFiches() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (categoryFilter) params.set('category', categoryFilter);
        if (search.trim()) params.set('search', search.trim());

        const response = await fetch(`/api/admin/fiches?${params.toString()}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Erreur lors du chargement des fiches.');
          setFiches([]);
          setTotal(0);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setFiches(data.fiches ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error('[admin] loadFiches error:', err);
        if (!isMounted) return;
        showToast.error('Erreur reseau lors du chargement des fiches.');
        setFiches([]);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFiches();
    return () => {
      isMounted = false;
    };
  }, [categoryFilter, search, refreshKey]);

  async function handleTogglePublish(fiche: Fiche) {
    setTogglingId(fiche.id);
    try {
      const response = await fetch(`/api/admin/fiches/${fiche.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: !fiche.is_published }),
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la mise a jour.');
        return;
      }

      showToast.success(fiche.is_published ? 'Fiche depubliee.' : 'Fiche publiee.');
      setRefreshKey((v) => v + 1);
    } catch {
      showToast.error('Erreur reseau.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!ficheToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/fiches/${ficheToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la suppression.');
        return;
      }

      showToast.success('Fiche supprimee.');
      setDeleteModalOpen(false);
      setFicheToDelete(null);
      setRefreshKey((v) => v + 1);
    } catch {
      showToast.error('Erreur reseau.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Fiches AFEIA"
        subtitle={`${total} fiche${total > 1 ? 's' : ''} au total, ${publishedCount} publiee${publishedCount > 1 ? 's' : ''}`}
        actions={
          <Button
            onClick={() => router.push('/admin/fiches/nouvelle')}
            icon={<Plus className="h-4 w-4" />}
          >
            Nouvelle fiche
          </Button>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-500">Recherche</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Categorie</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="py-2 px-3">Titre</th>
              <th className="py-2 px-3">Categorie</th>
              <th className="py-2 px-3">Statut</th>
              <th className="py-2 px-3">Lecture</th>
              <th className="py-2 px-3">Cree le</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Spinner size="sm" />
                    Chargement...
                  </div>
                </td>
              </tr>
            ) : fiches.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  Aucune fiche trouvee.
                </td>
              </tr>
            ) : (
              fiches.map((fiche) => (
                <tr key={fiche.id} className="text-slate-800 hover:bg-slate-50">
                  <td className="py-2 px-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{fiche.title}</span>
                      {fiche.summary && (
                        <span className="text-xs text-slate-400 line-clamp-1">
                          {fiche.summary}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="default">
                      {CATEGORY_LABEL_MAP[fiche.category] ?? fiche.category}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    {fiche.is_published ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Publie
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {fiche.read_time_minutes ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {fiche.read_time_minutes} min
                      </span>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {fiche.created_at
                      ? new Date(fiche.created_at).toLocaleDateString('fr-FR')
                      : '\u2014'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() =>
                          router.push(`/admin/fiches/nouvelle?edit=${fiche.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() => handleTogglePublish(fiche)}
                        disabled={togglingId === fiche.id}
                      >
                        {fiche.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          setFicheToDelete(fiche);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setFicheToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer la fiche"
        message={`Etes-vous sur de vouloir supprimer la fiche "${ficheToDelete?.title ?? ''}" ? Cette action est irreversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
