'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import type { ConsultantFilters } from '@/lib/types/filters';
import type { SavedView } from '@/lib/types/filters';

interface SavedViewsTabsProps {
  filters: ConsultantFilters;
  activeFilterCount: number;
  onApplyView: (filters: ConsultantFilters) => void;
}

export function SavedViewsTabs({ filters, activeFilterCount, onApplyView }: SavedViewsTabsProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [viewName, setViewName] = useState('');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const loadViews = useCallback(async () => {
    const { data, error } = await supabase
      .from('saved_views')
      .select('*')
      .order('position');

    if (!error && data) {
      setViews(data as SavedView[]);
    }
  }, []);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_views').insert({
        name: viewName.trim(),
        filters: filters as unknown as Record<string, unknown>,
        position: views.length,
      });

      if (!error) {
        setViewName('');
        setShowNameInput(false);
        loadViews();
      }
    } catch (err) {
      console.error('Error saving view:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteView = async (id: string) => {
    const { error } = await supabase.from('saved_views').delete().eq('id', id);
    if (!error) {
      if (activeViewId === id) setActiveViewId(null);
      loadViews();
    }
  };

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    onApplyView(view.filters);
  };

  if (views.length === 0 && activeFilterCount === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {views.length > 0 && (
        <Bookmark className="h-4 w-4 text-warmgray flex-shrink-0" />
      )}

      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => handleSelectView(view)}
          className={cn(
            'group relative flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors',
            activeViewId === view.id
              ? 'border-teal bg-teal/10 text-teal'
              : 'border-gray-200 text-warmgray hover:text-charcoal hover:border-gray-300'
          )}
        >
          {view.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteView(view.id);
            }}
            className="hidden group-hover:flex items-center justify-center h-4 w-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
            aria-label={`Supprimer la vue ${view.name}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </button>
      ))}

      {activeFilterCount > 0 && !showNameInput && (
        <button
          onClick={() => setShowNameInput(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warmgray hover:text-teal border border-dashed border-gray-300 hover:border-teal rounded-full transition-colors"
        >
          <Plus className="h-3 w-3" />
          Sauvegarder cette vue
        </button>
      )}

      {showNameInput && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveView();
              if (e.key === 'Escape') setShowNameInput(false);
            }}
            placeholder="Nom de la vue..."
            className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-teal w-32"
            autoFocus
          />
          <button
            onClick={handleSaveView}
            disabled={saving || !viewName.trim()}
            className="px-2 py-1 text-xs font-medium text-white bg-teal rounded-md hover:bg-teal-deep disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'OK'}
          </button>
          <button
            onClick={() => setShowNameInput(false)}
            className="text-warmgray hover:text-charcoal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
