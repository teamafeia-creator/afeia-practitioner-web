'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResourceCard, CATEGORY_LABELS } from '@/components/resources/ResourceCard';
import { getEducationalResources } from '@/lib/queries/resources';
import type { EducationalResource, ResourceCategory, ResourceSource } from '@/lib/types';

export default function BibliothequePage() {
  const router = useRouter();
  const [resources, setResources] = useState<EducationalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ResourceSource | ''>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const data = await getEducationalResources(session.user.id, {
        category: categoryFilter || undefined,
        source: sourceFilter || undefined,
        search: search || undefined,
      });
      setResources(data);
      setLoading(false);
    }
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter, sourceFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-light">
            <BookOpen className="h-5 w-5 text-sage" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold font-serif text-charcoal" style={{ letterSpacing: '-0.02em' }}>
              Bibliothèque éducative
            </h1>
            <p className="text-sm text-stone">
              {resources.length} fiche{resources.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => router.push('/bibliotheque/nouvelle')}>
          <Plus className="mr-1 h-4 w-4" />
          Créer une fiche
        </Button>
      </div>

      {/* Search + filters */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une fiche (titre, résumé, tags)..."
              className="w-full rounded-lg border border-divider bg-cream py-2.5 pl-10 pr-3 text-sm text-charcoal placeholder:text-stone/60 focus:border-sage/30 focus:outline-none focus:ring-2 focus:ring-sage/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ResourceCategory | '')}
              className="rounded-lg border border-divider bg-white px-3 py-1.5 text-xs text-charcoal focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
            >
              <option value="">Toutes les catégories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div className="flex rounded-lg border border-divider overflow-hidden">
              {([
                { value: '', label: 'Toutes' },
                { value: 'afeia', label: 'Fiches AFEIA' },
                { value: 'practitioner', label: 'Mes fiches' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceFilter(option.value as ResourceSource | '')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    sourceFilter === option.value
                      ? 'bg-sage text-white'
                      : 'bg-white text-sage hover:bg-sage-light/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon="documents"
              title="Aucune fiche trouvée"
              description="Créez votre première fiche éducative ou modifiez vos filtres de recherche."
              action={
                <Button variant="primary" onClick={() => router.push('/bibliotheque/nouvelle')}>
                  <Plus className="mr-1 h-4 w-4" />
                  Créer une fiche
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={() => router.push(`/bibliotheque/${resource.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
